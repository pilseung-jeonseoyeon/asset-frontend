import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { DateRange, YearMonth } from '../common.type'
import {
  getDashboardAllocation,
  getDashboardReports,
  getDashboardSummary,
  getDashboardTrend,
} from './dashboard.service'
import type { TrendUnit } from './dashboard.type'

interface QueryOptions {
  enabled?: boolean
}

export function useGetDashboardSummary(options?: QueryOptions) {
  return useQuery({
    queryKey: qk.dashboard.summary(),
    queryFn: getDashboardSummary,
    enabled: options?.enabled,
  })
}

export function useGetDashboardTrend(
  range: DateRange,
  unit: TrendUnit = 'DAY',
  options?: QueryOptions,
) {
  const query = useQuery({
    queryKey: qk.dashboard.trend(range, unit),
    queryFn: () => getDashboardTrend(range, unit),
    enabled: options?.enabled,
  })
  return { ...query, points: query.data ?? [] }
}

export function useGetDashboardAllocation(options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.dashboard.allocation(),
    queryFn: getDashboardAllocation,
    enabled: options?.enabled,
  })
  return { ...query, allocation: query.data ?? [] }
}

export function useGetDashboardReports(period: Partial<YearMonth> = {}, options?: QueryOptions) {
  return useQuery({
    queryKey: qk.dashboard.reports(period),
    queryFn: () => getDashboardReports(period),
    enabled: options?.enabled,
  })
}
