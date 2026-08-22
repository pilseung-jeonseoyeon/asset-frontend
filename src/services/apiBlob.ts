// 엑셀 같은 바이너리 파일을 주고받는 도메인(export·import)이 함께 쓰는 blob 전용 axios 인스턴스.
//
// `src/services/api.ts`의 공용 응답 인터셉터는 실패 응답 body를 JSON으로 가정해
// `payload.error.code/message`를 읽는데(api.ts의 응답 인터셉터 주석 참고), `responseType: 'blob'`이면
// 실패 시에도 body가 Blob이라 그 로직이 절대 못 읽는다. 그래서 바이너리 다운로드는 그 인스턴스를
// 공유하지 않고, 여기서 Blob을 텍스트로 직접 읽어 서버가 준 실제 에러 메시지를 복원한다. 401 재발급은
// `api.ts`의 단일 비행 큐(`refreshAccessToken`)를 그대로 재사용해 이중 구현을 피한다.
//
// 원래 export.service.ts 안에 있던 것을 2026-08-22 가계부 엑셀 가져오기(양식 내려받기)가 생기면서
// 공용으로 끌어올렸다 — 도메인 폴더끼리는 서로 import하지 않는다는 규칙(docs/api-conventions.md)
// 때문에 export → import 방향으로 가져다 쓰지 않고 api.ts 옆에 둔다.

import axios, { isAxiosError } from 'axios'
import { ApiError, refreshAccessToken } from './api'
import { useAuthStore } from '@/stores/auth'
import type { ApiErrorPayload } from './api.types'

export interface BlobFileResult {
  blob: Blob
  filename: string
}

interface DownloadBlobOptions {
  /** 쿼리 파라미터. 도메인별 params 인터페이스(예: ExportFileParams)를 그대로 넘긴다. */
  params?: object
  /** Content-Disposition이 없을 때 쓰는 파일명. */
  fallbackFilename: string
  /** 실패 시 ApiError.code. 화면이 코드로 분기하지는 않지만 도메인별로 구분해 두면 로그에서 읽기 쉽다. */
  errorCode: string
  /** 서버 메시지를 못 읽었을 때의 사용자용 문구. */
  fallbackErrorMessage: string
}

const blobClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  responseType: 'blob',
})

blobClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

async function readBlobErrorMessage(data: unknown): Promise<string | null> {
  if (!(data instanceof Blob)) return null
  try {
    const text = await data.text()
    const parsed = JSON.parse(text) as Partial<ApiErrorPayload>
    return parsed.error?.message ?? null
  } catch {
    return null
  }
}

function filenameFromDisposition(headerValue: unknown): string | null {
  if (typeof headerValue !== 'string') return null
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(headerValue)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      // 디코딩 실패 시 plain 매칭으로 폴백
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(headerValue)
  return plainMatch ? plainMatch[1] : null
}

/** 오늘 날짜를 `yyyyMMdd`로 — 폴백 파일명에 붙인다. */
export function todayStamp(): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function requestBlob(path: string, options: DownloadBlobOptions): Promise<BlobFileResult> {
  const res = await blobClient.get(path, { params: options.params })
  const filename = filenameFromDisposition(res.headers['content-disposition']) ?? options.fallbackFilename
  return { blob: res.data as Blob, filename }
}

/**
 * GET으로 바이너리 파일을 내려받는다. 성공하면 { blob, filename }을 돌려준다 — 실제 브라우저 다운로드
 * 트리거(`triggerBrowserDownload`, src/utils/download.ts)는 훅에서 한다. 401이면 토큰을 재발급받아 한 번만
 * 재시도하고(api.ts의 _retriedAfterRefresh 정책과 동일), 재발급 실패면 로그아웃시킨다.
 */
export async function downloadBlobFile(path: string, options: DownloadBlobOptions): Promise<BlobFileResult> {
  try {
    return await requestBlob(path, options)
  } catch (error) {
    if (!isAxiosError<Blob>(error)) throw error

    if (error.response?.status === 401) {
      try {
        await refreshAccessToken()
      } catch {
        useAuthStore.getState().signOut()
        throw new ApiError('UNAUTHENTICATED', '세션이 만료되었어요. 다시 로그인해 주세요.', 401)
      }
      return await requestBlob(path, options)
    }

    const message = await readBlobErrorMessage(error.response?.data)
    throw new ApiError(options.errorCode, message ?? options.fallbackErrorMessage, error.response?.status)
  }
}
