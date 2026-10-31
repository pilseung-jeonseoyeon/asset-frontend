import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import {
  acceptShareCode,
  cancelShareCode,
  cancelShareInvite,
  checkShareCode,
  declineShareCode,
  getShareInvitations,
  getShareStatus,
  issueShareCode,
  patchShareSpaceName,
  respondShareInvite,
  sendShareInvite,
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

/** 이메일 초대 목록(받은 · 보낸). 알림이 올 때마다 share 쿼리째 무효화된다(useNotificationStream). */
export function useGetShareInvitations(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.share.invitations(),
    queryFn: getShareInvitations,
    enabled: options?.enabled,
    staleTime: 30_000,
  })
  return { ...query, invitations: query.data ?? null }
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

/** 거절은 내 상태를 바꾸지 않는다(초대한 사람에게 알림만) — 무효화할 쿼리가 없다. */
export function useDeclineShareCode() {
  return useMutation({ mutationFn: (code: string) => declineShareCode(code) })
}

export function useSendShareInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => sendShareInvite(email),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.share.invitations(), data),
  })
}

export function useCancelShareInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: number) => cancelShareInvite(invitationId),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.share.invitations(), data),
  })
}

/** 수락하면 연결이라 범위 쿼리 전부, 거절하면 공유(초대 목록) · 알림(읽음 처리됨)만 다시 받는다. */
export function useRespondShareInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, accept }: { invitationId: number; accept: boolean }) => respondShareInvite(invitationId, accept),
    onSuccess: (data, { accept }) => {
      queryClient.setQueryData(queryKeys.share.status(), data)
      if (accept) invalidateScopedData(queryClient)
      else void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
    },
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
