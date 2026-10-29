import { rpc } from '../supabase'
import type { ViewScope } from '../common.type'
import type { AssetDistributionResponse, AssetLiquidityResponse } from './asset.type'

export async function getAssetDistribution(groupBy: 'CLASS' | 'INSTITUTION', scope: ViewScope = 'PERSONAL') {
  return rpc<AssetDistributionResponse>('get_asset_composition', { p_group_by: groupBy, p_scope: scope })
}

export async function getAssetLiquidity(scope: ViewScope = 'PERSONAL') {
  return rpc<AssetLiquidityResponse>('get_asset_liquidity', { p_scope: scope })
}
