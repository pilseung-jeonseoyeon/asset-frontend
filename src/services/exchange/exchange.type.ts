import type { Currency, ForeignExchangeSide } from '../common.type'

// 조회의 currency는 선택이다(생략하면 전 통화) — 지금 화면은 USD만 다룬다.
// GET /exchanges/summary의 응답 스키마명은 FxSummaryRes다(라이브 OpenAPI 대조 — 고시 기준일 필드명은 rateAsOf).

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
  /** false면 기록만 남기고 계좌 예수금(원화·달러)은 바꾸지 않은 환전. 환전 내역·평균 환율·환차익에는 그대로 들어간다. */
  settleCash: boolean
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
  /** 생략 시 true(예수금에 반영). false면 환전 기록만 남기고 예수금은 그대로 둔다. */
  settleCash?: boolean
}

/** PUT은 전체 교체. accountId는 수정 불가. settleCash를 생략하면 서버가 지금 값을 그대로 둔다. */
export type UpdateExchangeRequest = Omit<CreateExchangeRequest, 'accountId'>

export interface ExchangeSummaryResponse {
  currency: Currency
  heldForeignAmount: number
  /** 가중평균 매입환율 — 보유 외화가 0이면 계산 불가라 null. */
  weightedAvgRate: number | null
  /** 평가 환차익(원) — 보유 외화가 0이면 0(계산 불가가 아니다). */
  unrealizedGainKrw: number
  /** 누적 실현 환차익(원) — 매도 환전으로 확정된 손익. */
  realizedGainKrw: number
  /** 평가에 쓴 고시 환율. */
  currentRate: number
  /** 고시 환율 기준일 — "○○ 매매기준율 기준" 배지용. weightedAvgRate에는 붙이지 않는다(원장
   * 계산이라 항상 정확). */
  rateAsOf: string
  /** 보유 외화의 원화 평가액(원 단위 반올림) — 서버가 직접 계산해 준다(더 이상 GET /indices의
   * USDKRW로 근사하지 않는다). */
  heldKrwValuation: number
}
