import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { getMarketIndices } from './marketIndex.service'

export function useGetMarketIndices(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.marketIndex.list(),
    queryFn: getMarketIndices,
    // 외부 시세를 실시간으로 긁어오는 API라 응답이 느리다. 짧은 화면 전환마다 다시 부르지 않도록
    // 기본값과 같은 30초를 명시해두고, 필요해지면 여기서만 조정한다.
    staleTime: 30_000,
    enabled: options?.enabled,
  })
  return { ...query, indices: query.data ?? [] }
}
