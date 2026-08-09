// API-SPEC §13. 고정 4개 지표(KOSPI/SPX/IXIC/USDKRW)를 반환한다. 외부 API 호출이 심볼별로 개별
// 격리되어 있어 일부가 실패하면 그 심볼만 배열에서 빠진다(에러가 아니라 200 + 짧은 배열) — 프론트는
// 배열 길이를 가정하지 말고 symbol로 매칭해야 한다.

export type MarketIndexSymbol = 'KOSPI' | 'SPX' | 'IXIC' | 'USDKRW'

export interface MarketIndexResponse {
  symbol: string
  currentValue: number
  /**
   * 전일 종가 대비 절대 증감. `USDKRW`는 전일 종가 개념이 없어 항상 `null`이다(환율은 한국수출입은행
   * API에서 현재값만 받아옴). 나머지 3개 지수는 값이 채워진다. `null`이면 증감 배지를 숨길 것 — 0으로
   * 취급해 "+0"·"0.00%"를 그리지 말 것.
   */
  changeFromPreviousClose: number | null
}
