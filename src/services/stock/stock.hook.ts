import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api'
import { qk } from '../queryKeys'
import type { Market } from '../common.type'
import {
  getClosedHoldings,
  getHoldingGroups,
  getHoldings,
  getStocks,
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
export function isFxRateMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'FX_RATE_NOT_FOUND'
}

export function useGetStocks(keyword: string, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.stock.search(keyword),
    queryFn: () => getStocks(keyword || undefined),
    enabled: options?.enabled,
  })
  return { ...query, stocks: query.data ?? [] }
}

export function useGetHoldings(market?: Market, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.stock.holdings(market),
    queryFn: () => getHoldings(market),
    enabled: options?.enabled,
  })
  return {
    ...query,
    holdings: query.data ?? [],
    isFxRateMissing: isFxRateMissing(query.error),
  }
}

export function useGetHoldingGroups(by: 'sector' | 'market', options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.stock.holdingGroups(by),
    queryFn: () => getHoldingGroups(by),
    enabled: options?.enabled,
  })
  return {
    ...query,
    groups: query.data ?? [],
    isFxRateMissing: isFxRateMissing(query.error),
  }
}

export function useGetClosedHoldings(market?: Market, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.stock.closedHoldings(market),
    queryFn: () => getClosedHoldings(market),
    enabled: options?.enabled,
  })
  return { ...query, closedHoldings: query.data ?? [] }
}

function useInvalidateStock() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.stock.all() })
  }
}

export function usePostStock() {
  const invalidate = useInvalidateStock()
  return useMutation({
    mutationFn: (body: CreateStockRequest) => postStock(body),
    onSuccess: invalidate,
  })
}
