import { rpc } from '../supabase'
import type { AccountType, DateRange, ViewScope, YearMonth } from '../common.type'
import type {
  AllocationResponse,
  DashboardSummaryResponse,
  MonthlyReportResponse,
  TrendPointResponse,
  TrendUnit,
} from './dashboard.type'

export async function getDashboardSummary(scope: ViewScope = 'PERSONAL') {
  return rpc<DashboardSummaryResponse>('get_dashboard_summary', { p_scope: scope })
}

/**
 * from/to 둘 다 필수.
 *
 * `type`(선택)을 주면 **그 유형 계좌만으로 계산한 자산군 추이**가 된다 —
 * 계좌 유형과 자산군이 1:1이라 성립하는 것이다(예: type=STOCK → 주식 자산군 추이). 생략하면 총자산.
 * **계좌 하나를 지정하는 파라미터는 없다** — 그 유형 계좌 전부의 합계이므로, 계좌 상세 화면에
 * 이 값을 "이 계좌의 추이"로 그리면 안 된다.
 */
export async function getDashboardTrend(range: DateRange, unit: TrendUnit = 'DAY', type?: AccountType, scope: ViewScope = 'PERSONAL') {
  return rpc<TrendPointResponse[]>('get_dashboard_trend', {
    p_from: range.from,
    p_to: range.to,
    p_unit: unit,
    p_type: type ?? null,
    p_scope: scope,
  })
}

export async function getDashboardAllocation(scope: ViewScope = 'PERSONAL') {
  return rpc<AllocationResponse[]>('get_dashboard_allocation', { p_scope: scope })
}

/**
 * 월간 리포트. `period`를 생략하면 서버가 **현재 정산월**을 대상으로 잡고, 응답의 reportYear/reportMonth로
 * 어느 달인지 알려준다 — 프론트는 "현재 정산월"이 달력 몇 월인지 직접 계산하지 않는다.
 */
export async function getMonthlyReport(period?: YearMonth) {
  return rpc<MonthlyReportResponse>('get_monthly_report', {
    p_year: period?.year ?? null,
    p_month: period?.month ?? null,
  })
}
