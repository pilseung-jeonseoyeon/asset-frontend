// 고정 4개 지표(KOSPI/SPX/IXIC/USDKRW)를 반환한다. 외부 API 호출이 심볼별로 개별
// 격리되어 있어 일부가 실패하면 그 심볼만 배열에서 빠진다(에러가 아니라 200 + 짧은 배열) — 프론트는
// 배열 길이를 가정하지 말고 symbol로 매칭해야 한다.

export type MarketIndexSymbol = 'KOSPI' | 'SPX' | 'IXIC' | 'USDKRW'

export interface MarketIndexResponse {
  symbol: string
  currentValue: number
  /**
   * 전일 종가 대비 절대 증감 — 비교할 직전 값이 없으면 `null`(USDKRW도 직전 고시값이 있으면 채워진다).
   * `null`이면 증감 배지를 숨길 것 — 0으로 취급해 "+0"·"0.00%"를 그리지 말 것.
   */
  changeFromPreviousClose: number | null
  /** 전일 종가 대비 등락률(%) — 서버 계산값(정본). 변동액이 없거나 전일 종가가 0이면 null. */
  changeRatePercent?: number | null
  /** 기준일('YYYY-MM-DD') — 고시일로 정해지는 USDKRW만 채워지고 실시간 지수는 null. */
  asOf?: string | null
}
