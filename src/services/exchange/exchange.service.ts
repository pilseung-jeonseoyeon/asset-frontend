import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { Currency, ExchangeSearchParams, Page } from '../common.type'
import type {
  CreateExchangeRequest,
  ExchangeResponse,
  ExchangeSummaryResponse,
  UpdateExchangeRequest,
} from './exchange.type'

/**
 * currency는 선택 — 생략하면 전 통화를 함께 내려준다. 서버는 size 생략 시 조건에 맞는 전 건을
 * 한 페이지로 내려준다.
 */
export async function getExchanges(params: ExchangeSearchParams = {}) {
  return unwrap(await api.get<ApiResponse<Page<ExchangeResponse>>>('/exchanges', { params }))
}

/** 보유 외화보다 많이 팔면 409 FX_INSUFFICIENT_BALANCE. */
export async function postExchange(body: CreateExchangeRequest) {
  return unwrap(await api.post<ApiResponse<ExchangeResponse>>('/exchanges', body))
}

export async function putExchange(exchangeId: number, body: UpdateExchangeRequest) {
  return unwrap(await api.put<ApiResponse<ExchangeResponse>>(`/exchanges/${exchangeId}`, body))
}

/** 204 No Content */
export async function deleteExchange(exchangeId: number) {
  await api.delete(`/exchanges/${exchangeId}`)
}

/** 환율이 아직 수집되지 않았으면 422 FX_RATE_NOT_FOUND — 빈 상태로 다룰 것. */
export async function getExchangeSummary(currency: Currency) {
  return unwrap(
    await api.get<ApiResponse<ExchangeSummaryResponse>>('/exchanges/summary', {
      params: { currency },
    }),
  )
}
