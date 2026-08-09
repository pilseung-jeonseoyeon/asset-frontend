import type { Market, TradeSide } from '../common.type'

// API-SPEC §11. 페이지네이션이 없어 필터로만 범위를 좁힌다.

export interface TradeResponse {
  id: number
  accountId: number
  stockId: number
  stockName: string
  ticker: string
  market: Market
  side: TradeSide
  quantity: number
  price: number
  fee: number
  exchangeRate: number | null
  tradeDate: string
  memo: string | null
}

export interface CreateTradeRequest {
  accountId: number
  stockId: number
  side: TradeSide
  /** BigDecimal — 소수 허용. 정수로 반올림하지 말 것. */
  quantity: number
  price: number
  fee?: number
  /** 생략하면 서버가 최신 환율을 자동 적용한다. */
  exchangeRate?: number
  tradeDate: string
  memo?: string
}

/** PUT은 전체 교체. accountId/stockId는 수정 불가라 여기에 없다. */
export type UpdateTradeRequest = Omit<CreateTradeRequest, 'accountId' | 'stockId'>
