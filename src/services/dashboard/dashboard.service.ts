import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountType, DateRange } from '../common.type'
import type {
  AllocationResponse,
  DashboardSummaryResponse,
  TrendPointResponse,
  TrendUnit,
} from './dashboard.type'

export async function getDashboardSummary() {
  return unwrap(await api.get<ApiResponse<DashboardSummaryResponse>>('/dashboard/summary'))
}

/**
 * from/to 둘 다 필수.
 *
 * `type`(2026-08-27 백엔드 추가, 선택)을 주면 **그 유형 계좌만으로 계산한 자산군 추이**가 된다 —
 * 계좌 유형과 자산군이 1:1이라 성립하는 것이다(예: type=STOCK → 주식 자산군 추이). 생략하면 총자산.
 * **계좌 하나를 지정하는 파라미터는 없다** — 그 유형 계좌 전부의 합계이므로, 계좌 상세 화면에
 * 이 값을 "이 계좌의 추이"로 그리면 안 된다(2026-08-27 라이브 OpenAPI 확인).
 */
export async function getDashboardTrend(
  range: DateRange,
  unit: TrendUnit = 'DAY',
  type?: AccountType,
) {
  return unwrap(
    await api.get<ApiResponse<TrendPointResponse[]>>('/dashboard/trend', {
      // type이 undefined면 axios가 파라미터 자체를 싣지 않는다 — 전체 총자산 추이가 된다.
      params: { ...range, unit, type },
    }),
  )
}

export async function getDashboardAllocation() {
  return unwrap(await api.get<ApiResponse<AllocationResponse[]>>('/dashboard/allocation'))
}
