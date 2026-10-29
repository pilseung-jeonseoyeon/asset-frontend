// 즉시 수집(스프링엔 없던 개선). 매매·보유 종목 등록 직후 방금 넣은 종목의 시세를 바로 받아오고,
// 환율이 한 번도 수집되지 않은 상태(FX_RATE_NOT_FOUND)면 세션당 1회 환율 수집을 요청한다.
// 둘 다 실패해도 화면 동작에는 영향이 없어야 하므로 오류를 삼킨다(배치가 다음 시각에 다시 채운다).
import { invoke } from './supabase'
import { queryClient } from './queryClient'
import { queryKeys } from './queryKeys'

const MAX_STOCK_IDS_PER_CALL = 50

/** 종목 시세를 지금 받아오고, 평가액을 쓰는 캐시를 다시 읽게 한다. */
export async function refreshPricesFor(stockIds: number[]): Promise<void> {
  const unique = [...new Set(stockIds.filter((id) => Number.isInteger(id) && id > 0))].slice(0, MAX_STOCK_IDS_PER_CALL)
  if (unique.length === 0) return
  try {
    await invoke<{ collected: number; failed: number[] }>('collect-stock-prices', { body: { stockIds: unique } })
  } catch (e) {
    console.warn('[priceRefresh] 시세 즉시 수집 실패 — 배치가 다음 시각에 채운다', e)
    return
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
}

let fxRequested = false

/** 환율 수집을 세션당 한 번만 요청한다. 수집이 하나라도 됐으면 true. */
export async function ensureFxRatesOnce(): Promise<boolean> {
  if (fxRequested) return false
  fxRequested = true
  try {
    const result = await invoke<{ collected: string[]; failed: string[] }>('collect-fx-rates', { body: {} })
    return result.collected.length > 0
  } catch (e) {
    console.warn('[priceRefresh] 환율 즉시 수집 실패', e)
    return false
  }
}
