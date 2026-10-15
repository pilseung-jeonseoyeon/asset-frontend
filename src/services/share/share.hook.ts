import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { CategoryKind, ShareSearchParams, SharedTransactionSearchParams } from '../common.type'
import {
  deleteShare,
  deleteSharedTransaction,
  getSharedAccountCategories,
  getSharedAccountTransactions,
  getSharedAccounts,
  getShares,
  patchShare,
  postShare,
  postSharedTransaction,
  putSharedTransaction,
} from './share.service'
import type {
  CreateShareRequest,
  CreateSharedTransactionRequest,
  UpdateShareRequest,
  UpdateSharedTransactionRequest,
} from './share.type'

interface QueryOptions {
  enabled?: boolean
}

// 공유 계좌 거래내역 한 페이지 크기. 멤버는 이 목록 말고는 공유 계좌 거래를 볼 곳이 없어
// (내 가계부에 들어오지 않는다) 계좌 상세의 5건보다 넉넉히 잡고 '더 보기'로 이어 붙인다.
const SHARED_TRANSACTIONS_PAGE_SIZE = 10

export function useGetShares(params: ShareSearchParams = {}, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.share.list(params),
    queryFn: () => getShares(params),
    enabled: options?.enabled,
  })
  return { ...query, shares: query.data ?? [] }
}

export function useGetSharedAccounts(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.share.accounts(),
    queryFn: getSharedAccounts,
    enabled: options?.enabled,
  })
  return { ...query, sharedAccounts: query.data ?? [] }
}

/** 공유받은 계좌의 거래 목록 — 최신순 10건씩, `fetchNextPage`로 이어 붙인다. */
export function useGetSharedAccountTransactions(
  accountId: number | null,
  params: SharedTransactionSearchParams = {},
  options?: QueryOptions,
) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.share.accountTransactions(accountId ?? 0, params),
    queryFn: ({ pageParam }) =>
      getSharedAccountTransactions(accountId as number, { ...params, page: pageParam, size: SHARED_TRANSACTIONS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
    enabled: accountId !== null && options?.enabled !== false,
  })
  return { ...query, transactions: query.data?.pages.flatMap((p) => p.content) ?? [] }
}

export function useGetSharedAccountCategories(accountId: number | null, kind?: CategoryKind, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.share.accountCategories(accountId ?? 0, kind),
    queryFn: () => getSharedAccountCategories(accountId as number, kind),
    // 소유자의 분류도 자주 바뀌지 않는 마스터성 데이터다(category.hook.ts와 같은 5분).
    staleTime: 5 * 60_000,
    enabled: accountId !== null && options?.enabled !== false,
  })
  return { ...query, categories: query.data ?? [] }
}

/**
 * 공유 행이 바뀌면(초대·응답·역할·해제) 공유 목록과 공유받은 계좌 목록이 함께 바뀐다.
 * 알림 목록도 무효화한다 — 수락·거절·해제는 상대에게 알림을 만들고, 내 알림함의 초대 카드 상태
 * (버튼 노출 여부)도 공유 상태를 보고 정하기 때문이다.
 */
function useInvalidateShare() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
  }
}

export function usePostShare() {
  const invalidate = useInvalidateShare()
  return useMutation({
    mutationFn: (body: CreateShareRequest) => postShare(body),
    onSuccess: invalidate,
  })
}

export function usePatchShare() {
  const invalidate = useInvalidateShare()
  return useMutation({
    mutationFn: ({ shareId, body }: { shareId: number; body: UpdateShareRequest }) => patchShare(shareId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteShare() {
  const invalidate = useInvalidateShare()
  return useMutation({
    mutationFn: (shareId: number) => deleteShare(shareId),
    onSuccess: invalidate,
  })
}

/**
 * 공유 계좌에 거래를 쓰면 그 계좌의 잔액(공유받은 계좌 목록)과 거래내역이 바뀐다. 거래는 소유자
 * 가계부에 저장되므로 **내** account·asset·dashboard 캐시는 건드릴 것이 없다.
 */
function useInvalidateSharedTransaction() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
  }
}

export function usePostSharedTransaction() {
  const invalidate = useInvalidateSharedTransaction()
  return useMutation({
    mutationFn: ({ accountId, body }: { accountId: number; body: CreateSharedTransactionRequest }) =>
      postSharedTransaction(accountId, body),
    onSuccess: invalidate,
  })
}

export function usePutSharedTransaction() {
  const invalidate = useInvalidateSharedTransaction()
  return useMutation({
    mutationFn: ({ accountId, transactionId, body }: { accountId: number; transactionId: number; body: UpdateSharedTransactionRequest }) =>
      putSharedTransaction(accountId, transactionId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSharedTransaction() {
  const invalidate = useInvalidateSharedTransaction()
  return useMutation({
    mutationFn: ({ accountId, transactionId }: { accountId: number; transactionId: number }) =>
      deleteSharedTransaction(accountId, transactionId),
    onSuccess: invalidate,
  })
}
