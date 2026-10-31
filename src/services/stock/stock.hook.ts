import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api'
import { ensureFxRatesOnce } from '../priceRefresh'
import { queryKeys } from '../queryKeys'
import type { Market } from '../common.type'
import {
  getClosedHoldings,
  getHoldingGroups,
  getHoldings,
  getStocks,
  getStockSectors,
  postStock,
} from './stock.service'
import type { CreateStockRequest } from './stock.type'

interface QueryOptions {
  enabled?: boolean
}

/**
 * 환율이 아직 수집되지 않아 평가액을 계산할 수 없는 상태(422).
 * 서버 장애가 아니라 "데이터 미준비"이므로 빨간 에러가 아니라 회색 안내로 렌더할 것.
 */
export function isExchangeRateMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'FX_RATE_NOT_FOUND'
}

/**
 * 환율이 한 번도 수집되지 않은 새 환경(FX_RATE_NOT_FOUND)이면 세션당 1회 환율 수집을 요청하고 다시 읽는다 —
 * 스프링의 "DB에 없으면 라이브 조회" 폴백과 같은 효과. 실패하면 조용히 미준비 상태로 남긴다.
 */
export function useFxRateFallback(error: unknown, refetch: () => unknown): void {
  const missing = isExchangeRateMissing(error)
  useEffect(() => {
    if (!missing) return
    let cancelled = false
    void ensureFxRatesOnce().then((collected) => {
      if (collected && !cancelled) refetch()
    })
    return () => {
      cancelled = true
    }
  }, [missing, refetch])
}

export function useGetStocks(keyword: string, options?: QueryOptions & { markets?: readonly Market[] }) {
  const query = useQuery({
    queryKey: queryKeys.stock.search(keyword, options?.markets),
    queryFn: () => getStocks(keyword || undefined, options?.markets),
    enabled: options?.enabled,
  })
  return { ...query, stocks: query.data ?? [] }
}

// 섹터는 서버 시드 마스터라 거의 바뀌지 않는다 — 모달을 열 때마다 다시 받지 않게 staleTime을 길게 잡는다.
const SECTOR_STALE_TIME = 60 * 60_000

export function useGetStockSectors(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.stock.sectors(),
    queryFn: getStockSectors,
    enabled: options?.enabled,
    staleTime: SECTOR_STALE_TIME,
  })
  return { ...query, sectors: query.data ?? [] }
}

export function useGetHoldings(market?: Market, options?: QueryOptions & { accountId?: number | null }) {
  const accountId = options?.accountId ?? undefined
  const query = useQuery({
    queryKey: [...queryKeys.stock.holdings(market), { accountId }],
    queryFn: () => getHoldings(market, accountId),
    enabled: options?.enabled,
  })
  useFxRateFallback(query.error, query.refetch)
  return {
    ...query,
    holdings: query.data ?? [],
    isExchangeRateMissing: isExchangeRateMissing(query.error),
  }
}

export function useGetHoldingGroups(by: 'sector' | 'market', options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.stock.holdingGroups(by),
    queryFn: () => getHoldingGroups(by),
    enabled: options?.enabled,
  })
  useFxRateFallback(query.error, query.refetch)
  return {
    ...query,
    groups: query.data ?? [],
    isExchangeRateMissing: isExchangeRateMissing(query.error),
  }
}

export function useGetClosedHoldings(market?: Market, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.stock.closedHoldings(market),
    queryFn: () => getClosedHoldings(market),
    enabled: options?.enabled,
  })
  return { ...query, closedHoldings: query.data ?? [] }
}

function useInvalidateStock() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all() })
  }
}

export function usePostStock() {
  const invalidate = useInvalidateStock()
  return useMutation({
    mutationFn: (body: CreateStockRequest) => postStock(body),
    onSuccess: invalidate,
  })
}

