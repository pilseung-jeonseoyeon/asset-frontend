import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { AccountListParams, DateRange } from '../common.type'
import {
  deleteAccount,
  deleteAccountSnapshot,
  getAccount,
  getAccounts,
  getAccountSnapshots,
  patchAccount,
  postAccount,
  putAccountSnapshot,
} from './account.service'
import type {
  CreateAccountRequest,
  UpdateAccountRequest,
  UpsertSnapshotRequest,
} from './account.type'

export function useGetAccounts(
  params: AccountListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.account.list(params),
    queryFn: () => getAccounts(params),
    enabled: options?.enabled,
  })
}

export function useGetAccount(accountId: number | null) {
  return useQuery({
    queryKey: qk.account.detail(accountId ?? 0),
    queryFn: () => getAccount(accountId as number),
    enabled: accountId !== null,
  })
}

export function useGetAccountSnapshots(accountId: number | null, range: DateRange) {
  return useQuery({
    queryKey: qk.account.snapshots(accountId ?? 0, range),
    queryFn: () => getAccountSnapshots(accountId as number, range),
    enabled: accountId !== null,
  })
}

/**
 * 계좌·스냅샷이 바뀌면 서버가 잔액을 다시 계산하므로 자산 분포/대시보드까지 함께 무효화한다.
 * 기관은 "활성 계좌 보유 여부"가 달라져 삭제 가능 상태가 바뀌므로 포함한다.
 */
function useInvalidateAccount() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.account.all() })
    void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
    void queryClient.invalidateQueries({ queryKey: qk.dashboard.all() })
    void queryClient.invalidateQueries({ queryKey: qk.institution.all() })
  }
}

export function usePostAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: (body: CreateAccountRequest) => postAccount(body),
    onSuccess: invalidate,
  })
}

export function usePatchAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAccountRequest }) =>
      patchAccount(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: (accountId: number) => deleteAccount(accountId),
    onSuccess: invalidate,
  })
}

export function usePutAccountSnapshot() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: ({
      accountId,
      snapshotDate,
      body,
    }: {
      accountId: number
      snapshotDate: string
      body: UpsertSnapshotRequest
    }) => putAccountSnapshot(accountId, snapshotDate, body),
    onSuccess: invalidate,
  })
}

export function useDeleteAccountSnapshot() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: ({ accountId, snapshotDate }: { accountId: number; snapshotDate: string }) =>
      deleteAccountSnapshot(accountId, snapshotDate),
    onSuccess: invalidate,
  })
}
