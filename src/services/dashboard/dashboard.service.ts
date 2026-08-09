import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { DateRange, YearMonth } from '../common.type'
import type {
  AllocationResponse,
  DashboardSummaryResponse,
  MonthlyReportResponse,
  TrendPointResponse,
  TrendUnit,
} from './dashboard.type'

export async function getDashboardSummary() {
  return unwrap(await api.get<ApiResponse<DashboardSummaryResponse>>('/dashboard/summary'))
}

/** from/to 둘 다 필수. */
export async function getDashboardTrend(range: DateRange, unit: TrendUnit = 'DAY') {
  return unwrap(
    await api.get<ApiResponse<TrendPointResponse[]>>('/dashboard/trend', {
      params: { ...range, unit },
    }),
  )
}

export async function getDashboardAllocation() {
  return unwrap(await api.get<ApiResponse<AllocationResponse[]>>('/dashboard/allocation'))
}

/** year·month를 둘 다 넘겨야 그 월 기준이고, 하나라도 빠지면 현재 정산월 기준이 된다. */
export async function getDashboardReports(period: Partial<YearMonth> = {}) {
  return unwrap(
    await api.get<ApiResponse<MonthlyReportResponse>>('/dashboard/reports', { params: period }),
  )
}
