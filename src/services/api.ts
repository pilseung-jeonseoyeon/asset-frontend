import axios, { isAxiosError } from 'axios'
import type { ApiErrorPayload } from './api.types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 쿠키 기반 인증이 필요해지면 true로 전환
  withCredentials: false,
})

// 인증이 도입되면 여기서 accessToken을 읽어 Authorization 헤더를 붙인다.
// 현재 앱은 인증 개념이 없으므로(단일 하드코딩 사용자) 아직 요청 인터셉터가 없다.

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError<ApiErrorPayload>(error)) {
      const message = error.response?.data?.message ?? error.message
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  },
)
