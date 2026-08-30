import type { Currency, Market } from '../common.type'

// 구 /holdings는 폐기되고 /stocks/holdings로 통합됐다.

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

/**
 * 보유 수량 0 초과인 종목만.
 *
 * valuationKrw·unrealizedPnlKrw·returnRatePercent·currentPrice·previousClosePrice·dayChangePercent·
 * priceAsOf는 전부 시세 미확보(priceAsOf === null) 시 함께 null이다 — 0으로 접지 말 것.
 * totalCostKrw·avgCostPriceKrw·realizedPnlKrw는 원장 계산이라 시세와
 * 무관하게 항상 채워진다.
 */
export interface HoldingResponse {
  stockId: number
  ticker: string
  stockName: string
  market: Market
  sector: string | null
  /** 종목 표시 통화 — avgCostPrice·currentPrice·previousClosePrice의 단위(원화 환산 아님). */
  currency: Currency
  quantity: number
  /** 평균 매입 단가 — 종목 통화(currency) 기준, 수수료 포함. */
  avgCostPrice: number
  /** 평균 매입 단가의 원화 환산 — 최신 환율 적용, 국내 종목은 avgCostPrice와 같다. */
  avgCostPriceKrw: number
  /** 총 매수금액(원화) — 수수료 포함 보유 원가. 원가 역산(valuationKrw − unrealizedPnlKrw)의 대체값. */
  totalCostKrw: number
  /** 현재가 — 종목 통화 기준. */
  currentPrice: number | null
  /** 직전 거래일 종가 — 종목 통화 기준. */
  previousClosePrice: number | null
  /** 전 영업일 대비 등락률(%). */
  dayChangePercent: number | null
  /** 시세 기준일. null이면 시세를 아직 확보하지 못한 상태. */
  priceAsOf: string | null
  valuationKrw: number | null
  /** = 평가금액 − 총 매수금액. */
  unrealizedPnlKrw: number | null
  /** = 평가손익 / 총 매수금액 × 100. 시세가 없거나 원가가 0이면 null. */
  returnRatePercent: number | null
  /** 누적 실현손익(원화) — 원장에서만 계산되어 시세와 무관하게 항상 채워진다. */
  realizedPnlKrw: number
}

export interface HoldingGroupResponse {
  /** by=sector면 섹터명(없으면 '기타'), by=market이면 enum 코드('KR' 등)가 그대로 온다. */
  groupKey: string
  totalValuationKrw: number
  totalPnlKrw: number
  /** 원가(totalValuationKrw − totalPnlKrw)가 0이면 null — 0으로 나눌 수 없어 "계산 불가"다. */
  returnRatePercent: number | null
}

/** 현재 청산 상태만 반영한다 — 재매수하면 목록에서 사라진다(누적 청산 로그가 아님). */
export interface ClosedHoldingResponse {
  stockId: number
  ticker: string
  stockName: string
  market: Market
  sector: string | null
  principalKrw: number
  proceedsKrw: number
  realizedPnlKrw: number
  /** 원금이 0이면 null. */
  returnRatePercent: number | null
  closedAt: string
}
