import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { Currency, ExchangeSearchParams } from '../common.type'
import { isFxRateMissing } from '../stock/stock.hook'
import {
  deleteExchange,
  getExchangeSummary,
  getExchanges,
  postExchange,
  putExchange,
} from './exchange.service'
import type { CreateExchangeRequest, UpdateExchangeRequest } from './exchange.type'

interface QueryOptions {
  enabled?: boolean
}

/** params.currency를 생략하면 전 통화 내역을 함께 조회한다. */
export function useGetExchanges(params: ExchangeSearchParams = {}, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.exchange.list(params),
    queryFn: () => getExchanges(params),
    enabled: options?.enabled,
  })
  return { ...query, exchanges: query.data?.content ?? [] }
}

export function useGetExchangeSummary(currency: Currency, options?: QueryOptions) {
  const query = useQuery({
    queryKey: qk.exchange.summary(currency),
    queryFn: () => getExchangeSummary(currency),
    enabled: options?.enabled,
  })
  return { ...query, isFxRateMissing: isFxRateMissing(query.error) }
}

/** 환전은 계좌 잔액과 해외 자산 평가액을 함께 바꾼다. */
function useInvalidateExchange() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.exchange.all() })
    void queryClient.invalidateQueries({ queryKey: qk.account.all() })
    void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
    void queryClient.invalidateQueries({ queryKey: qk.stock.all() })
    void queryClient.invalidateQueries({ queryKey: qk.dashboard.all() })
  }
}

export function usePostExchange() {
  const invalidate = useInvalidateExchange()
  return useMutation({
    mutationFn: (body: CreateExchangeRequest) => postExchange(body),
    onSuccess: invalidate,
  })
}

export function usePutExchange() {
  const invalidate = useInvalidateExchange()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateExchangeRequest }) =>
      putExchange(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteExchange() {
  const invalidate = useInvalidateExchange()
  return useMutation({
    mutationFn: (exchangeId: number) => deleteExchange(exchangeId),
    onSuccess: invalidate,
  })
}
