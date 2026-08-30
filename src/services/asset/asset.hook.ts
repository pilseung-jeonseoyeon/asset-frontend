import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { getAssetDistribution, getAssetLiquidity } from './asset.service'

interface AssetQueryOptions {
  /**
   * 항상 마운트되는 모달(AppShell 참고)에서 호출할 때, 그 모달이 실제로 열려 있을 때만
   * 요청하도록 거는 가드. 생략하면 기본값(useQuery 기본 enabled: true)대로 즉시 요청한다.
   */
  enabled?: boolean
}

/** 자산군(6분류)별 분포. 자산 화면의 카테고리 카드·트리맵이 쓴다. */
export function useGetAssetDistributionByClass(options?: AssetQueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.asset.distribution('CLASS'),
    queryFn: () => getAssetDistribution('CLASS'),
    enabled: options?.enabled,
  })
  return { ...query, groups: query.data?.byClass ?? [] }
}

/** 금융기관별 분포. 기관별 보유액 모달이 쓴다. */
export function useGetAssetDistributionByInstitution(options?: AssetQueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.asset.distribution('INSTITUTION'),
    queryFn: () => getAssetDistribution('INSTITUTION'),
    enabled: options?.enabled,
  })
  return { ...query, groups: query.data?.byInstitution ?? [] }
}

export function useGetAssetLiquidity(options?: AssetQueryOptions) {
  return useQuery({
    queryKey: queryKeys.asset.liquidity(),
    queryFn: getAssetLiquidity,
    enabled: options?.enabled,
  })
}
