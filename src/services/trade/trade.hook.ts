import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { TradeSearchParams } from '../common.type'
import { deleteTrade, getTrades, postTrade, putTrade } from './trade.service'
import type { CreateTradeRequest, UpdateTradeRequest } from './trade.type'

export function useGetTrades(params: TradeSearchParams = {}, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: qk.trade.list(params),
    queryFn: () => getTrades(params),
    enabled: options?.enabled,
  })
  return { ...query, trades: query.data?.content ?? [] }
}

/** 매매는 보유 종목·계좌 잔액·자산 분포를 모두 다시 계산하게 만든다. */
function useInvalidateTrade() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.trade.all() })
    void queryClient.invalidateQueries({ queryKey: qk.stock.all() })
    void queryClient.invalidateQueries({ queryKey: qk.account.all() })
    void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
    void queryClient.invalidateQueries({ queryKey: qk.dashboard.all() })
  }
}

export function usePostTrade() {
  const invalidate = useInvalidateTrade()
  return useMutation({
    mutationFn: (body: CreateTradeRequest) => postTrade(body),
    onSuccess: invalidate,
  })
}

export function usePutTrade() {
  const invalidate = useInvalidateTrade()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTradeRequest }) => putTrade(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteTrade() {
  const invalidate = useInvalidateTrade()
  return useMutation({
    mutationFn: (tradeId: number) => deleteTrade(tradeId),
    onSuccess: invalidate,
  })
}
