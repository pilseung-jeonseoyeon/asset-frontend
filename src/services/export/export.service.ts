import axios, { isAxiosError } from 'axios'
import { ApiError, refreshAccessToken } from '../api'
import { useAuthStore } from '@/stores/auth'
import type { ApiErrorPayload } from '../api.types'
import type { ExportFileParams, ExportFileResult, ExportKind } from './export.type'

const EXPORT_PATHS: Record<ExportKind, string> = {
  transactions: '/export/excel/transactions',
  trades: '/export/excel/trades',
}

// Content-Disposition이 없을 때(현재 백엔드가 그럴 확률이 높다 — B-3-5) 쓰는 폴백 파일명의 한글 라벨.
const EXPORT_KIND_LABEL: Record<ExportKind, string> = {
  transactions: '거래내역',
  trades: '매매내역',
}

/**
 * blob 전용 axios 인스턴스. `src/services/api.ts`의 공용 응답 인터셉터는 실패 응답 body를 JSON으로
 * 가정해 `payload.error.code/message`를 읽는데(api.ts:171-181), `responseType: 'blob'`이면 실패
 * 시에도 body가 Blob이라 그 로직이 절대 못 읽는다(api.ts:171-172 주석이 이 상황을 미리 경고함).
 * 그래서 이 도메인은 그 인스턴스를 공유하지 않고, 아래에서 Blob을 텍스트로 직접 읽어 서버가 준
 * 실제 에러 메시지를 복원한다. 401 재발급은 `api.ts`의 단일 비행 큐(`refreshAccessToken`)를
 * 그대로 재사용해 이중 구현을 피한다.
 */
const exportClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
  responseType: 'blob',
})

exportClient.interceptors.request.use((config) => {
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

function fallbackFilename(kind: ExportKind): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `monit-${EXPORT_KIND_LABEL[kind]}-${y}${m}${d}.xlsx`
}

async function requestExportFile(kind: ExportKind, params?: ExportFileParams) {
  const res = await exportClient.get(EXPORT_PATHS[kind], { params })
  const filename = filenameFromDisposition(res.headers['content-disposition']) ?? fallbackFilename(kind)
  return { blob: res.data as Blob, filename }
}

/** 엑셀 파일을 내려받는다. 성공하면 { blob, filename }을 돌려준다 — 실제 다운로드 트리거는 훅에서 한다. */
export async function downloadExportFile(kind: ExportKind, params?: ExportFileParams): Promise<ExportFileResult> {
  try {
    return await requestExportFile(kind, params)
  } catch (error) {
    if (!isAxiosError<Blob>(error)) throw error

    if (error.response?.status === 401) {
      try {
        await refreshAccessToken()
      } catch {
        useAuthStore.getState().signOut()
        throw new ApiError('UNAUTHENTICATED', '세션이 만료되었어요. 다시 로그인해 주세요.', 401)
      }
      // 재발급 성공 — 원래 요청을 한 번만 재시도한다(api.ts의 _retriedAfterRefresh 정책과 동일).
      return await requestExportFile(kind, params)
    }

    const message = await readBlobErrorMessage(error.response?.data)
    throw new ApiError('EXPORT_FAILED', message ?? '파일을 내려받지 못했어요.', error.response?.status)
  }
}
