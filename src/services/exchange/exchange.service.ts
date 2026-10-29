import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { Currency, ExchangeSearchParams, Page } from '../common.type'
import type { CreateExchangeRequest, ExchangeResponse, ExchangeSummaryResponse, UpdateExchangeRequest } from './exchange.type'

/** currency 를 생략하면 전 통화. size 생략 시 전 건 한 페이지(최대 200). 환전일·id 내림차순. */
export async function getExchanges(params: ExchangeSearchParams = {}) {
  return rpc<Page<ExchangeResponse>>('list_exchanges', {
    p: { currency: params.currency, from: params.from, to: params.to, page: params.page, size: params.size },
  })
}

/** 원화·외화 금액이 환율과 5% 넘게 어긋나면 FX_AMOUNT_MISMATCH, 미래 환전일은 FX_DATE_IN_FUTURE. */
export async function postExchange(body: CreateExchangeRequest) {
  return rpc<ExchangeResponse>('create_exchange', { p: body })
}

export async function putExchange(exchangeId: number, body: UpdateExchangeRequest) {
  return rpc<ExchangeResponse>('update_exchange', { p_id: exchangeId, p: body })
}

/** 환전 행(EXCHANGE 거래) 삭제. */
export async function deleteExchange(exchangeId: number) {
  const uid = await currentUserId()
  const deleted = unwrapResult(
    await supabase.from('transactions').delete().eq('id', exchangeId).eq('user_id', uid).eq('type', 'EXCHANGE').select('id'),
  )
  if (!deleted || deleted.length === 0) throw new ApiError('EXCHANGE_NOT_FOUND', errorMessageOf('EXCHANGE_NOT_FOUND'), 404)
}

/** 환율이 아직 수집되지 않았으면 FX_RATE_NOT_FOUND — 빈 상태로 다룰 것(훅이 1회 수집을 요청한다). */
export async function getExchangeSummary(currency: Currency) {
  return rpc<ExchangeSummaryResponse>('get_fx_summary', { p_currency: currency })
}
