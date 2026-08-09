import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { PeriodUnit, TransactionSearchParams, YearMonth } from '../common.type'
import {
  deleteTransaction,
  getCategoryDetail,
  getCategoryRankings,
  getDailySummaries,
  getMonthlySummaries,
  getPeriodSummary,
  getTransactions,
  postTransaction,
  putTransaction,
} from './transaction.service'
import type { CreateTransactionRequest, UpdateTransactionRequest } from './transaction.type'

interface QueryOptions {
  enabled?: boolean
}

/**
 * 거래 목록. 화면의 페이지는 1-base, 서버는 0-base라 여기서 변환한다.
 * 다음 페이지를 불러오는 동안 이전 목록을 유지해 깜빡임을 없앤다(state-management.md 권장).
 */
export function useGetTransactions(
  params: Omit<TransactionSearchParams, 'page'> & { page: number },
  options?: QueryOptions,
) {
  const serverParams: TransactionSearchParams = { ...params, page: Math.max(0, params.page - 1) }
  return useQuery({
    queryKey: qk.transaction.list(serverParams),
    queryFn: () => getTransactions(serverParams),
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  })
}

export function useGetDailySummaries(period: YearMonth, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.transaction.dailySummary(period),
    queryFn: () => getDailySummaries(period),
    enabled: options?.enabled,
  })
  return { ...query, summaries: query.data ?? [] }
}

export function useGetPeriodSummary(
  period: Extract<PeriodUnit, 'MONTH' | 'YEAR'>,
  options?: QueryOptions,
) {
  return useQuery({
    queryKey: qk.transaction.periodSummary(period),
    queryFn: () => getPeriodSummary(period),
    enabled: options?.enabled,
  })
}

export function useGetMonthlySummaries(year: number, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.transaction.monthlySummary(year),
    queryFn: () => getMonthlySummaries(year),
    enabled: options?.enabled,
  })
  return { ...query, summaries: query.data ?? [] }
}

export function useGetCategoryRankings(period: Partial<YearMonth>, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.transaction.rankings(period),
    queryFn: () => getCategoryRankings(period),
    enabled: options?.enabled,
  })
  return { ...query, rankings: query.data ?? [] }
}

export function useGetCategoryDetail(
  categoryId: number | null,
  period: Partial<YearMonth>,
  options?: QueryOptions,
) {
  return useQuery({
    queryKey: qk.transaction.categoryDetail(categoryId ?? 0, period),
    queryFn: () => getCategoryDetail(categoryId as number, period),
    enabled: categoryId !== null && options?.enabled !== false,
  })
}

/**
 * 거래 1건이 바뀌면 서버가 계좌 잔액과 자산 분포를 원장에서 다시 계산한다.
 * 목표 진행률과 대시보드 지표도 거래에 의존하므로 함께 무효화한다.
 */
function useInvalidateTransaction() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.transaction.all() })
    void queryClient.invalidateQueries({ queryKey: qk.account.all() })
    void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
    void queryClient.invalidateQueries({ queryKey: qk.dashboard.all() })
    void queryClient.invalidateQueries({ queryKey: qk.goal.all() })
  }
}

export function usePostTransaction() {
  const invalidate = useInvalidateTransaction()
  return useMutation({
    mutationFn: (body: CreateTransactionRequest) => postTransaction(body),
    onSuccess: invalidate,
  })
}

export function usePutTransaction() {
  const invalidate = useInvalidateTransaction()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTransactionRequest }) =>
      putTransaction(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransaction()
  return useMutation({
    mutationFn: (transactionId: number) => deleteTransaction(transactionId),
    onSuccess: invalidate,
  })
}
