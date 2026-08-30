import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { getInstitutions } from './institution.service'

// 금융기관은 거의 바뀌지 않는 마스터 데이터라 staleTime을 길게 잡는다.
const INSTITUTION_STALE_TIME = 5 * 60_000

export function useGetInstitutions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.institution.list(),
    queryFn: getInstitutions,
    staleTime: INSTITUTION_STALE_TIME,
    enabled: options?.enabled,
  })
}
