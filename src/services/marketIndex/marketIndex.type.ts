// API-SPEC §13.
//
// 스펙은 KOSPI / SPX / IXIC / USDKRW 4개 고정이라고 하지만, 실제 서버는 3개만 내려준다(USDKRW 없음).
// 그리고 전일 종가나 변동률(%)이 없어 화면의 '+0.62%' 표기를 계산할 수 없다 — 백엔드 확인 필요 항목.

export type MarketIndexSymbol = 'KOSPI' | 'SPX' | 'IXIC' | 'USDKRW'

export interface MarketIndexResponse {
  symbol: string
  currentValue: number
  /** 전일 종가 대비 절대 증감. 비율(%)이 아니다. */
  changeFromPreviousClose: number
}
