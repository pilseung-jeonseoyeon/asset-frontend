import type { Market, TradeSide } from '../common.type'

// GET /trades는 Page<TradeResponse>를 반환한다(페이지네이션 자체는 지원됨) — 다만
// trade.service.ts의 getTrades는 size를 생략해 호출해 서버가 조건에 맞는 전 건을 한 페이지로
// 내려준다.

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
  /** 증권거래세 — 매도는 실현손익에서 이미 차감된 금액이며, 도입 전 등록·미입력 건은 0. */
  tax: number
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
