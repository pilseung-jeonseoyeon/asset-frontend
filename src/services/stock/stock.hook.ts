import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api'
import { queryKeys } from '../queryKeys'
import type { Market } from '../common.type'
import {
  getClosedHoldings,
  getHoldingGroups,
  getHoldings,
  getStocks,
  getStockSectors,
  postStock,
  putStock,
} from './stock.service'
import type { CreateStockRequest, UpdateStockRequest } from './stock.type'

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

export function useGetStocks(keyword: string, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.stock.search(keyword),
    queryFn: () => getStocks(keyword || undefined),
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

/** 종목명·섹터 수정. 보유 종목·그룹 수익률(stock)과 매매 내역의 종목명(trade)이 함께 바뀐다. */
export function usePutStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateStockRequest }) => putStock(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trade.all() })
    },
  })
}
