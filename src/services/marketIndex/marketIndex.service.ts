import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { MarketIndexResponse } from './marketIndex.type'

/** Yahoo Finance를 매 요청 실시간 호출하므로 응답이 느리다. 실패 시 503 MARKET_INDEX_FETCH_FAILED. */
export async function getMarketIndices() {
  return unwrap(await api.get<ApiResponse<MarketIndexResponse[]>>('/indices'))
}
