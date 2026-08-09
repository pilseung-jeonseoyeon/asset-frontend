import type { Currency, ForeignExchangeSide } from '../common.type'

// API-SPEC §12. 조회에 currency가 필수라 "전 통화 환전 내역" 화면은 만들 수 없다(통화별 호출 필요).

export interface ExchangeResponse {
  id: number
  accountId: number
  /** BUY = 원→외, SELL = 외→원 */
  side: ForeignExchangeSide
  currency: Currency
  foreignAmount: number
  /** KRW 정수 */
  krwAmount: number
  rate: number
  exchangedAt: string
  memo: string | null
}

export interface CreateExchangeRequest {
  accountId: number
  side: ForeignExchangeSide
  currency: Currency
  foreignAmount: number
  krwAmount: number
  rate: number
  exchangedAt: string
  memo?: string
}

/** PUT은 전체 교체. accountId는 수정 불가. */
export type UpdateExchangeRequest = Omit<CreateExchangeRequest, 'accountId'>

/** 원화 환산 보유액과 현재 환율은 응답에 없다(백엔드 확인 필요 항목). */
export interface ExchangeSummaryResponse {
  currency: Currency
  heldForeignAmount: number
  weightedAvgRate: number
  unrealizedGainKrw: number
  realizedGainKrw: number
}
