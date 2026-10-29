import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { Page, PeriodUnit, TransactionSearchParams, ViewScope, YearMonth } from '../common.type'
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

// 목록·집계는 DB 함수(list_transactions · get_*), 등록·수정·삭제는 테이블 직접 쓰기(3단계 트리거가 규칙 검증)
// + get_transaction 으로 응답 재조회(TransactionRes 를 만드는 곳을 DB 한 곳에 둔다).

/** 정렬은 서버가 고정한다(거래일·id 내림차순) — params.sort 는 무시한다. page는 0-base. */
export async function getTransactions(params: TransactionSearchParams) {
  return rpc<Page<TransactionResponse>>('list_transactions', {
    p: {
      year: params.year,
      month: params.month,
      from: params.from,
      to: params.to,
      type: params.type,
      subcategoryId: params.subcategoryId,
      accountId: params.accountId,
      keyword: params.keyword,
      page: params.page,
      size: params.size,
      scope: params.scope ?? 'PERSONAL',
      who: params.who,
    },
  })
}

function toRow(uid: string, body: CreateTransactionRequest) {
  return {
    user_id: uid,
    account_id: body.accountId,
    type: body.type,
    subcategory_id: body.subcategoryId ?? null,
    transfer_account_id: body.transferAccountId ?? null,
    amount: body.amount,
    transaction_date: body.transactionDate,
    description: body.description,
    memo: body.memo ?? null,
    owner_tag: body.ownerTag ?? 'SELF',
  }
}

export async function postTransaction(body: CreateTransactionRequest) {
  const uid = await currentUserId()
  const inserted = unwrapResult(await supabase.from('transactions').insert(toRow(uid, body)).select('id').single<{ id: number }>())
  return rpc<TransactionResponse>('get_transaction', { p_id: inserted.id })
}

/** PUT = 전체 교체. 필수 필드를 전부 다시 보내야 하고, 생략한 memo 는 null 이 된다. */
export async function putTransaction(transactionId: number, body: UpdateTransactionRequest) {
  const uid = await currentUserId()
  const updated = unwrapResult(
    await supabase.from('transactions').update(toRow(uid, body)).eq('id', transactionId).eq('user_id', uid).select('id'),
  )
  if (!updated || updated.length === 0) throw new ApiError('TRANSACTION_NOT_FOUND', errorMessageOf('TRANSACTION_NOT_FOUND'), 404)
  return rpc<TransactionResponse>('get_transaction', { p_id: transactionId })
}

export async function deleteTransaction(transactionId: number) {
  const uid = await currentUserId()
  const deleted = unwrapResult(await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', uid).select('id'))
  if (!deleted || deleted.length === 0) throw new ApiError('TRANSACTION_NOT_FOUND', errorMessageOf('TRANSACTION_NOT_FOUND'), 404)
}

/** year/month 둘 다 필수 — 그 정산월의 일별 합계. */
export async function getDailySummaries(period: YearMonth, scope: ViewScope = 'PERSONAL') {
  return rpc<DailySummaryResponse[]>('get_daily_summaries', { p_year: period.year, p_month: period.month, p_scope: scope })
}

/** period는 MONTH 또는 YEAR. yearMonth를 생략하면 서버가 현재 구간(이번 정산월/올해)을 계산한다. */
export async function getPeriodSummary(
  period: Extract<PeriodUnit, 'MONTH' | 'YEAR'>,
  yearMonth: Partial<YearMonth> = {},
  scope: ViewScope = 'PERSONAL',
) {
  return rpc<PeriodSummaryResponse>('get_transaction_summary', {
    p_period: period,
    p_year: yearMonth.year ?? null,
    p_month: yearMonth.month ?? null,
    p_scope: scope,
  })
}

export async function getMonthlySummaries(year: number, scope: ViewScope = 'PERSONAL') {
  return rpc<MonthlySummaryResponse[]>('get_monthly_summaries', { p_year: year, p_scope: scope })
}

/** year/month 미지정 시 현재 정산월. 지출 내림차순. */
export async function getCategoryRankings(period: Partial<YearMonth> = {}, scope: ViewScope = 'PERSONAL') {
  return rpc<CategoryRankingResponse[]>('get_category_rankings', {
    p_year: period.year ?? null,
    p_month: period.month ?? null,
    p_scope: scope,
  })
}

export async function getCategoryDetail(categoryId: number, period: Partial<YearMonth> = {}, scope: ViewScope = 'PERSONAL') {
  return rpc<CategoryDetailResponse>('get_category_detail', {
    p_category_id: categoryId,
    p_year: period.year ?? null,
    p_month: period.month ?? null,
    p_scope: scope,
  })
}
