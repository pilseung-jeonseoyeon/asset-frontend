import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { Page, PeriodUnit, TransactionSearchParams, YearMonth } from '../common.type'
import type {
  CategoryDetailResponse,
  CategoryRankingResponse,
  CreateTransactionRequest,
  DailySummaryResponse,
  MonthlySummaryResponse,
  PeriodSummaryResponse,
  TransactionResponse,
  UpdateTransactionRequest,
} from './transaction.type'

/** 이 백엔드에서 유일하게 페이지네이션이 있는 목록. page는 0-base. */
export async function getTransactions(params: TransactionSearchParams) {
  return unwrap(
    await api.get<ApiResponse<Page<TransactionResponse>>>('/transactions', { params }),
  )
}

export async function postTransaction(body: CreateTransactionRequest) {
  return unwrap(await api.post<ApiResponse<TransactionResponse>>('/transactions', body))
}

/** PUT = 전체 교체. 필수 필드를 전부 다시 보내야 한다. */
export async function putTransaction(transactionId: number, body: UpdateTransactionRequest) {
  return unwrap(
    await api.put<ApiResponse<TransactionResponse>>(`/transactions/${transactionId}`, body),
  )
}

/** 204 No Content */
export async function deleteTransaction(transactionId: number) {
  await api.delete(`/transactions/${transactionId}`)
}

/** year/month가 원시타입이라 둘 다 필수 — 빠지면 400. */
export async function getDailySummaries(period: YearMonth) {
  return unwrap(
    await api.get<ApiResponse<DailySummaryResponse[]>>('/transactions/summaries/daily', {
      params: period,
    }),
  )
}

/** period는 MONTH 또는 YEAR만 유효하다(DAY는 서비스 로직에서 400). */
export async function getPeriodSummary(period: Extract<PeriodUnit, 'MONTH' | 'YEAR'>) {
  return unwrap(
    await api.get<ApiResponse<PeriodSummaryResponse>>('/transactions/summary', {
      params: { period },
    }),
  )
}

export async function getMonthlySummaries(year: number) {
  return unwrap(
    await api.get<ApiResponse<MonthlySummaryResponse[]>>('/transactions/summaries/monthly', {
      params: { year },
    }),
  )
}

/** year/month 미지정 시 현재 정산월. 지출 내림차순. */
export async function getCategoryRankings(period: Partial<YearMonth> = {}) {
  return unwrap(
    await api.get<ApiResponse<CategoryRankingResponse[]>>('/transactions/rankings', {
      params: period,
    }),
  )
}

export async function getCategoryDetail(categoryId: number, period: Partial<YearMonth> = {}) {
  return unwrap(
    await api.get<ApiResponse<CategoryDetailResponse>>(
      `/transactions/categories/${categoryId}/detail`,
      { params: period },
    ),
  )
}
