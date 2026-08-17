import type { Currency, ForeignExchangeSide } from '../common.type'

// API-SPEC §12. 조회에 currency가 필수라 "전 통화 환전 내역" 화면은 만들 수 없다(통화별 호출 필요).
// GET /exchanges/summary의 응답 스키마명은 FxSummaryRes다(2026-08-17, 라이브 OpenAPI 대조,
// docs/frontend-todo.md A-7 · docs/backend-request.md 2-1 확인 완료 — 고시 기준일 필드명은
// rateAsOf).

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
