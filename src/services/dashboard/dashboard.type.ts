// API-SPEC §4. 모든 지표는 저장값이 아니라 매 요청 시 스냅샷·거래 원장을 조합해 계산된다.
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
