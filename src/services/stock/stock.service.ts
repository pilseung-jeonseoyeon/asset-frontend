import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { Market } from '../common.type'
import type {
  ClosedHoldingResponse,
  CreateStockRequest,
  HoldingGroupResponse,
  HoldingResponse,
  StockResponse,
  UpdateStockRequest,
} from './stock.type'

export async function getStocks(keyword?: string) {
  return unwrap(await api.get<ApiResponse<StockResponse[]>>('/stocks', { params: { keyword } }))
}

export async function postStock(body: CreateStockRequest) {
  return unwrap(await api.post<ApiResponse<StockResponse>>('/stocks', body))
}

export async function putStock(stockId: number, body: UpdateStockRequest) {
  return unwrap(await api.put<ApiResponse<StockResponse>>(`/stocks/${stockId}`, body))
}

/** 해외 종목 보유 시 환율이 없으면 422 FX_RATE_NOT_FOUND — 에러가 아니라 미준비 상태로 다룰 것. */
export async function getHoldings(market?: Market) {
  return unwrap(
    await api.get<ApiResponse<HoldingResponse[]>>('/stocks/holdings', { params: { market } }),
  )
}

/** by는 다른 enum과 달리 소문자 문자열이다. */
export async function getHoldingGroups(by: 'sector' | 'market') {
  return unwrap(
    await api.get<ApiResponse<HoldingGroupResponse[]>>('/stocks/holdings/groups', {
      params: { by },
    }),
  )
}

export async function getClosedHoldings(market?: Market) {
  return unwrap(
    await api.get<ApiResponse<ClosedHoldingResponse[]>>('/stocks/holdings/closed', {
      params: { market },
    }),
  )
}
