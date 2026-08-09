import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

// 4xx(잘못된 요청·없는 리소스)는 다시 보내도 결과가 같으므로 재시도하지 않는다.
// 5xx와 네트워크 오류만 1회 재시도한다.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (error instanceof ApiError && error.status !== undefined && error.status < 500) return false
  return true
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
    },
  },
})
