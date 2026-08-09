import type { Currency, Market } from '../common.type'

// API-SPEC §10. 구 /holdings는 폐기되고 /stocks/holdings로 통합됐다.

export interface StockResponse {
  id: number
  ticker: string
  name: string
  market: Market
  sector: string | null
  currency: Currency
}

export interface CreateStockRequest {
  /** (market, ticker) 조합이 유니크. 중복이면 409 STOCK_DUPLICATE. */
  ticker: string
  name: string
  market: Market
  sector?: string
  currency: Currency
}

/** PUT. ticker/market/currency는 수정 불가. */
export interface UpdateStockRequest {
  name: string
  sector?: string
}

/** 보유 수량 0 초과인 종목만. ticker와 현재가는 응답에 없다. */
export interface HoldingResponse {
  stockId: number
  stockName: string
  market: Market
  sector: string | null
  quantity: number
  avgCostPrice: number
  valuationKrw: number
  unrealizedPnlKrw: number
  realizedPnlKrw: number
}

export interface HoldingGroupResponse {
  /** by=sector면 섹터명(없으면 '기타'), by=market이면 enum 코드('KR' 등)가 그대로 온다. */
  groupKey: string
  totalValuationKrw: number
  totalPnlKrw: number
  returnRatePercent: number
}

/** 현재 청산 상태만 반영한다 — 재매수하면 목록에서 사라진다(누적 청산 로그가 아님). */
export interface ClosedHoldingResponse {
  stockId: number
  stockName: string
  market: Market
  sector: string | null
  principalKrw: number
  proceedsKrw: number
  realizedPnlKrw: number
  returnRatePercent: number
  closedAt: string
}
