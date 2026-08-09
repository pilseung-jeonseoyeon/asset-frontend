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
  // 리프레시 토큰이 httpOnly 쿠키로 오간다(POST /auth/refresh가 요청 바디를 받지 않는다).
  // 쿠키를 실어 보내려면 반드시 켜져 있어야 한다.
  withCredentials: true,
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

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
      .then((res) => {
        const accessToken = res.data.data?.accessToken
        if (!accessToken) throw new ApiError('UNAUTHENTICATED', '세션이 만료되었어요.', 401)
        useAuthStore.getState().signIn(accessToken)
        return accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
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

    // 액세스 토큰이 만료된 것으로 보이면 한 번만 재발급하고 원래 요청을 다시 보낸다.
    if (status === 401 && config && !config._retriedAfterRefresh && !isPublicPath(config.url)) {
      config._retriedAfterRefresh = true

      // 재발급과 재시도를 반드시 따로 잡는다. 한 try로 묶으면 "재발급은 됐는데 재시도한 요청이
      // 404/400으로 실패"한 경우까지 세션 만료로 오인해 강제 로그아웃시키고, 호출부에는 실제 실패
      // 대신 원래의 401이 전달되어 에러 코드 분기가 통째로 어긋난다.
      try {
        await refreshAccessToken()
      } catch {
        // 재발급까지 실패하면 세션이 끝난 것으로 보고 로그인 화면으로 돌려보낸다.
        useAuthStore.getState().signOut()
        return Promise.reject(
          new ApiError('UNAUTHENTICATED', '세션이 만료되었어요. 다시 로그인해 주세요.', 401),
        )
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
