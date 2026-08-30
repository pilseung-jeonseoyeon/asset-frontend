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

/**
 * 서버에는 기본 정렬이 없다. `sort`를 생략하면 DB가 돌려주는 순서 그대로라 페이지를 넘길 때
 * 같은 항목이 두 번 나오거나 아예 빠질 수 있다 — 2차 정렬 키(id)까지 항상 못 박는다.
 * 엔티티 필드명만 유효하고(조인 결과인 subcategoryName 등은 불가), 없는 필드는 500이 되므로
 * 정렬 키는 이 화이트리스트 밖으로 나가지 않게 한다.
 */
const DEFAULT_TRANSACTION_SORT = ['transactionDate,desc', 'id,desc']

/** 이 백엔드에서 유일하게 페이지네이션이 있는 목록. page는 0-base. */
export async function getTransactions(params: TransactionSearchParams) {
  return unwrap(
    await api.get<ApiResponse<Page<TransactionResponse>>>('/transactions', {
      params: { sort: DEFAULT_TRANSACTION_SORT, ...params },
    }),
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
