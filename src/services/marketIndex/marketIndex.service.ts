import { invoke } from '../supabase'
import type { MarketIndexResponse } from './marketIndex.type'

/** 코스피·S&P 500·나스닥(야후, 60초 서버 캐시) + 원/달러(고시 환율). 실패한 심볼은 배열에서 빠진다. */
export async function getMarketIndices() {
  return invoke<MarketIndexResponse[]>('market-indices', { method: 'GET' })
}
