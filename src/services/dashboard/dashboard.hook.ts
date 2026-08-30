import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { AccountType, DateRange } from '../common.type'
import {
  getDashboardAllocation,
  getDashboardSummary,
  getDashboardTrend,
} from './dashboard.service'
import type { TrendUnit } from './dashboard.type'

interface QueryOptions {
  enabled?: boolean
}

export function useGetDashboardSummary(options?: QueryOptions) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: getDashboardSummary,
    enabled: options?.enabled,
  })
}

/** `type`을 주면 그 자산군만의 추이가 된다(dashboard.service.ts 주석 참고). queryKey에 반드시
 * 포함해야 자산군을 바꿔 열었을 때 앞 자산군의 그래프가 그대로 남지 않는다. */
export function useGetDashboardTrend(
  range: DateRange,
  unit: TrendUnit = 'DAY',
  options?: QueryOptions & { type?: AccountType },
) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.trend(range, unit, options?.type),
    queryFn: () => getDashboardTrend(range, unit, options?.type),
    enabled: options?.enabled,
  })
  return { ...query, points: query.data ?? [] }
}

export function useGetDashboardAllocation(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.dashboard.allocation(),
    queryFn: getDashboardAllocation,
    enabled: options?.enabled,
  })
  return { ...query, allocation: query.data ?? [] }
}
