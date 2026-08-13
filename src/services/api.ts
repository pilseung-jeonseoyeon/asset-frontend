import axios, { isAxiosError } from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiErrorPayload, ApiResponse } from './api.types'

// 서버가 내려주는 실패 코드(ACCOUNT_NOT_FOUND 등)를 호출부에서 분기할 수 있도록 보존하는 에러 타입.
// tsconfig의 erasableSyntaxOnly가 켜져 있어 파라미터 프로퍼티(constructor(readonly code))는 쓸 수 없다.
export class ApiError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 리프레시 토큰이 httpOnly 쿠키로 오간다(API-SPEC §16 — refresh_token, HttpOnly,
  // Path=/api/v1/auth). 쿠키를 실어 보내려면 반드시 켜져 있어야 한다.
  withCredentials: true,
  // 배열 파라미터를 sort=a&sort=b로 반복 직렬화한다. axios 기본값은 sort[]=a&sort[]=b라
  // Spring Data의 Pageable이 정렬 조건을 하나도 읽지 못한다(API-SPEC §6.1).
  paramsSerializer: { indexes: null },
})

/**
 * 토큰 재발급 전용 클라이언트. 아래 응답 인터셉터를 달지 않는다 —
 * refresh 자체가 401을 받았을 때 다시 refresh를 시도하는 무한 재귀를 막기 위함이다.
 */
const refreshClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

/** 인증 없이 호출되는 경로. 여기서 401이 나면 재발급을 시도하지 않는다. */
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/signup/code',
  '/auth/refresh',
  '/auth/password',
  '/auth/password/code',
]

function isPublicPath(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_PATHS.some((p) => url.startsWith(p))
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && !isPublicPath(config.url)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 일어나도록 하는 단일 비행(single-flight) 큐.
// 첫 401이 재발급을 시작하고, 뒤따르는 401들은 같은 Promise를 기다린다.
let refreshPromise: Promise<string> | null = null

// 호출부별 timeout 오버라이드는 두지 않는다. single-flight(refreshPromise) 구조에서는 이미
// 진행 중인 요청에 나중 호출자의 timeout이 적용되지 않아, 어느 값이 먹을지가 호출 순서에 따라
// 달라진다. 부팅처럼 빨리 포기해야 하는 쪽은 자기 쪽에서 시간을 재고 먼저 손을 떼면 된다
// (useRestoreSession 참고) — 진행 중인 refresh 자체는 살려두어 늦게라도 성공하면 반영된다.
export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    // 요청을 시작하는 시점의 세대를 기억해 둔다. 응답이 돌아왔을 때 세대가 바뀌어 있으면(그 사이
    // 사용자가 직접 로그인하거나 로그아웃했으면) 이 응답은 낡은 것이므로 반영하지 않는다.
    const startedAtGeneration = useAuthStore.getState().authGeneration
    refreshPromise = refreshClient
      .post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
      .then((res) => {
        const accessToken = res.data.data?.accessToken
        if (!accessToken) throw new ApiError('UNAUTHENTICATED', '세션이 만료되었어요.', 401)
        useAuthStore.getState().applyRefreshedToken(accessToken, startedAtGeneration)
        return accessToken
      })
      .catch((error: unknown) => {
        // refreshClient에는 응답 인터셉터가 없어 raw AxiosError가 그대로 온다. 호출부가
        // 재사용 감지(REFRESH_TOKEN_REUSED — 전 세션 강제 종료)와 단순 만료를 구분할 수
        // 있도록 여기서 한 번만 ApiError로 정규화한다(API-SPEC §16.4).
        if (error instanceof ApiError) throw error
        if (isAxiosError<ApiErrorPayload>(error)) {
          const payload = error.response?.data
          throw new ApiError(
            payload?.error?.code ?? 'INVALID_REFRESH_TOKEN',
            payload?.error?.message ?? error.message,
            error.response?.status,
          )
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/**
 * 재발급 실패를 사용자에게 보여줄 문구로 바꾼다.
 *
 * `INVALID_REFRESH_TOKEN`/`REFRESH_TOKEN_REUSED`는 **오직 `POST /auth/refresh` 응답에만** 나오고
 * (보호된 엔드포인트의 401은 `UNAUTHENTICATED`/`TOKEN_EXPIRED`뿐), 그 호출은 무한 재귀를 막으려고
 * 인터셉터가 없는 `refreshClient`로만 나간다. 따라서 이 두 코드를 아래 응답 인터셉터에서 잡으려
 * 하면 절대 도달하지 않는 죽은 분기가 된다 — 재발급이 실패한 자리에서 바로 구분해야 한다.
 *
 * 특히 `REFRESH_TOKEN_REUSED`는 단순 만료가 아니라 **서버가 탈취로 판단해 그 계정의 모든 세션을
 * 끊은** 상태라, 사용자에게 "그냥 시간이 지나 풀렸다"고 알리면 실제로 일어난 일을 숨기게 된다.
 */
function describeRefreshFailure(error: unknown): ApiError {
  const code = error instanceof ApiError ? error.code : 'UNAUTHENTICATED'
  if (code === 'REFRESH_TOKEN_REUSED') {
    return new ApiError(
      code,
      '보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요.',
      401,
    )
  }
  return new ApiError(code, '세션이 만료되었어요. 다시 로그인해 주세요.', 401)
}

interface RetriableConfig extends AxiosRequestConfig {
  /** 재발급 후 한 번만 재시도하기 위한 플래그 */
  _retriedAfterRefresh?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError<ApiErrorPayload>(error)) return Promise.reject(error)

    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status

    // 액세스 토큰이 만료된 것으로 보이면(TOKEN_EXPIRED, 혹은 새로고침 직후처럼 메모리에
    // 토큰이 없어 UNAUTHENTICATED가 온 경우) 한 번만 재발급하고 원래 요청을 다시 보낸다.
    if (status === 401 && config && !config._retriedAfterRefresh && !isPublicPath(config.url)) {
      config._retriedAfterRefresh = true

      // 재발급과 재시도를 반드시 따로 잡는다. 한 try로 묶으면 "재발급은 됐는데 재시도한 요청이
      // 404/400으로 실패"한 경우까지 세션 만료로 오인해 강제 로그아웃시키고, 호출부에는 실제 실패
      // 대신 원래의 401이 전달되어 에러 코드 분기가 통째로 어긋난다.
      try {
        await refreshAccessToken()
      } catch (refreshError) {
        // 재발급까지 실패하면 세션이 끝난 것으로 보고 로그인 화면으로 돌려보낸다.
        // 실패 사유(단순 만료 vs 토큰 재사용 감지)는 사용자에게 다르게 알려야 한다.
        useAuthStore.getState().signOut()
        return Promise.reject(describeRefreshFailure(refreshError))
      }

      // 재시도 요청의 실패는 그 자체로 호출부에 전달한다(이 인터셉터를 다시 타면서
      // _retriedAfterRefresh 플래그 덕분에 재발급 루프에는 빠지지 않는다).
      return api.request(config)
    }

    // 엑셀 내보내기(API-SPEC §14)처럼 responseType:'blob'인 요청은 실패 시에도 body가 Blob이라
    // 여기서 code/message를 읽을 수 없다. 해당 기능은 이 인스턴스를 쓰지 말고 별도 처리할 것.
    const payload = error.response?.data
    return Promise.reject(
      new ApiError(
        payload?.error?.code ?? 'NETWORK_ERROR',
        // 서버 message는 이미 완성된 한국어 문장이므로 그대로 노출한다.
        payload?.error?.message ?? error.message,
        status,
      ),
    )
  },
)

// data가 없는 성공 응답(204/Void)을 서비스 함수마다 검사하지 않도록 하는 헬퍼.
// 204를 기대하는 DELETE 계열은 unwrap을 쓰지 않고 api.delete만 호출한다.
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  if (res.data.data === undefined) {
    throw new ApiError('EMPTY_RESPONSE', '응답 본문이 비어 있습니다.', res.status)
  }
  return res.data.data
}
