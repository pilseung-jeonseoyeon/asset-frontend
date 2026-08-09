import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { TradeSearchParams } from '../common.type'
import type { CreateTradeRequest, TradeResponse, UpdateTradeRequest } from './trade.type'

export async function getTrades(params: TradeSearchParams = {}) {
  return unwrap(await api.get<ApiResponse<TradeResponse[]>>('/trades', { params }))
}

/** 체결일 기준 보유 수량을 넘겨 매도하면 409 INSUFFICIENT_HOLDING. */
export async function postTrade(body: CreateTradeRequest) {
  return unwrap(await api.post<ApiResponse<TradeResponse>>('/trades', body))
}

export async function putTrade(tradeId: number, body: UpdateTradeRequest) {
  return unwrap(await api.put<ApiResponse<TradeResponse>>(`/trades/${tradeId}`, body))
}

/** 204 No Content */
export async function deleteTrade(tradeId: number) {
  await api.delete(`/trades/${tradeId}`)
}
