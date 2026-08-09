import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AssetDistributionResponse, AssetLiquidityResponse } from './asset.type'

export async function getAssetDistribution(groupBy: 'CLASS' | 'INSTITUTION') {
  return unwrap(
    await api.get<ApiResponse<AssetDistributionResponse>>('/assets/distribution', {
      params: { groupBy },
    }),
  )
}

export async function getAssetLiquidity() {
  return unwrap(await api.get<ApiResponse<AssetLiquidityResponse>>('/assets/liquidity'))
}
