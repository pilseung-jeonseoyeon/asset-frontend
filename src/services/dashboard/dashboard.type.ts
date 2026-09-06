// 모든 지표는 저장값이 아니라 매 요청 시 스냅샷·거래 원장을 조합해 계산된다.
// "월"은 사용자 설정 monthStartDay 기준 정산월이라 달력 1일이 아닐 수 있다.

import type { AssetClass } from '../common.type'

export interface DashboardSummaryResponse {
  totalAssetKrw: number
  /** 이번 정산월 시작일 대비 증감 (음수 가능). 기준 스냅샷이 없으면 null(0이 아니다). */
  monthChangeKrw: number | null
  /** 올해 1월 1일 대비 증감 (음수 가능). 기준 스냅샷이 없으면 null(0이 아니다). */
  yearChangeKrw: number | null
}

export interface TrendPointResponse {
  /**
   * 'YYYY-MM-DD'. unit=MONTH여도 그 달의 말일이 아니라
   * **데이터가 있는 마지막 날짜**가 찍힌다 — "월말 값"으로 라벨링하면 안 된다.
   */
  date: string
  totalValueKrw: number
}

/** 도넛 차트용 경량 응답. §3.1과 달리 assetClassName(한글 라벨)이 없다. */
export interface AllocationResponse {
  assetClass: AssetClass
  totalValueKrw: number
}

/** 대시보드 추이는 DAY/MONTH만 의미가 있다 — YEAR는 서버에 별도 처리가 없어 DAY와 같게 동작한다. */
export type TrendUnit = 'DAY' | 'MONTH'

// ---------- 월간 리포트 (GET /dashboard/reports) ----------
// 정산월 기준으로 조회 시점에 계산하며 저장하지 않는다. 과거 시점 총자산은 스냅샷이 아니라 그 시점
// 가계부·매매·시세로 되돌려 계산하므로 증감·증감률은 언제나 산출된다.
// **비율은 나눌 모수(기준값)가 0이면 0이 아니라 null이다** — 0은 '변화 없음'으로 오독된다.
// '유형 라벨(personaLabel)'은 분류 근거가 없어 서버가 제공하지 않는다(라이브 OpenAPI 2026-09-06).

/** 자산군 증감. 라벨(assetClassName) 소유권은 서버에 있다. */
export interface AssetClassChangeResponse {
  assetClass: AssetClass
  assetClassName: string
  /** 정산월 시작 대비 증감(원) */
  changeKrw: number
  /** 정산월 시작 대비 증감률(%) — 기준값이 0이면 null */
  changePercent: number | null
}

/** 대분류별 지출 비중 */
export interface ExpenseShareResponse {
  categoryName: string
  amountKrw: number
  /** 이 정산월 총지출 대비 비중(%) — 총지출이 0이면 null */
  sharePercent: number | null
}

export interface MonthlyReportResponse {
  reportYear: number
  reportMonth: number
  /** 전월 대비 총자산 증감(원) — 기간말 총자산 − 전월말 시점으로 되돌려 계산한 총자산 */
  totalAssetChangeKrw: number
  /** 전월 대비 총자산 증감률(%) — 전월말 총자산이 0이면 null */
  totalAssetChangePercent: number | null
  /** 전년 동월(정산월) 대비 총자산 증감률(%) — 전년 동월말 총자산이 0이면 null */
  yoyChangePercent: number | null
  /** 가장 많이 오른 자산군 — 비교 가능한 자산군이 하나도 없으면 null */
  topGainingAssetClass: AssetClassChangeResponse | null
  /** 가장 많이 오른 계좌 이름 — 비교할 계좌가 하나도 없으면 null */
  topGainingAccountName: string | null
  /** 가장 많이 오른 계좌의 증가액(원) — 비교할 계좌가 하나도 없으면 null */
  topGainingAmountKrw: number | null
  /** 지출 1위 대분류명 — 지출 기록이 없으면 null */
  topExpenseCategoryName: string | null
  /** 지출 1위 대분류 금액(원) — 지출 기록이 없으면 null */
  topExpenseAmountKrw: number | null
  /** 지출 상위 3개 대분류 — 지출 기록이 없으면 빈 배열 */
  expenseTop3: ExpenseShareResponse[]
  /** 이 정산월 저축률(%) — 수입이 없어 계산 불가하면 null */
  savingsRatePercent: number | null
  /** 최근 6개 정산월(이 달 포함) 평균 저축률(%) — 계산 가능한 달이 하나도 없으면 null */
  savingsRateAvg6m: number | null
}
