import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import {
  acceptShareCode,
  cancelShareCode,
  checkShareCode,
  getShareStatus,
  issueShareCode,
  patchShareSpaceName,
  setSharedAccounts,
  unlinkShare,
} from './share.service'
import type { SharedAccountRequest } from './share.type'

interface QueryOptions {
  enabled?: boolean
}

/** 공유 상태. 상단 '개인 | 우리집' 세그먼트가 늘 읽으므로(useViewScope) 로그인 동안 캐시에 둔다. */
export function useGetShareStatus(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.share.status(),
    queryFn: getShareStatus,
    enabled: options?.enabled,
    staleTime: 30_000,
  })
  return { ...query, shareStatus: query.data ?? null }
}

/**
 * 연결·해제·공유 계좌 변경은 '개인'(공유 중 계좌가 빠짐)과 '우리집' 숫자를 함께 바꾼다 —
 * 범위가 들어간 쿼리 전부를 무효화한다.
 */
function invalidateScopedData(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.transaction.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all() })
}

export function useIssueShareCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: issueShareCode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
    },
  })
}

export function useCancelShareCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelShareCode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
    },
  })
}

/** 코드 확인은 캐시하지 않는다(입력할 때마다 서버가 판단, 틀린 횟수도 서버가 센다). */
export function useCheckShareCode() {
  return useMutation({ mutationFn: (code: string) => checkShareCode(code) })
}

export function useAcceptShareCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => acceptShareCode(code),
    onSuccess: () => invalidateScopedData(queryClient),
  })
}

export function useUnlinkShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: unlinkShare,
    onSuccess: () => invalidateScopedData(queryClient),
  })
}

export function useSetSharedAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: SharedAccountRequest[]) => setSharedAccounts(items),
    onSuccess: () => invalidateScopedData(queryClient),
  })
}

export function usePatchShareSpaceName() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => patchShareSpaceName(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.share.status() })
    },
  })
}
