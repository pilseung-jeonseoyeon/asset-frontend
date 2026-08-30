import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { TradeSearchParams } from '../common.type'
import { deleteTrade, getTrades, postTrade, putTrade } from './trade.service'
import type { CreateTradeRequest, UpdateTradeRequest } from './trade.type'

export function useGetTrades(params: TradeSearchParams = {}, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.trade.list(params),
    queryFn: () => getTrades(params),
    enabled: options?.enabled,
  })
  return { ...query, trades: query.data?.content ?? [] }
}

/**
 * 매매는 보유 종목·계좌 잔액·자산 분포를 모두 다시 계산하게 만든다.
 * 목표(goal)도 포함한다 — GoalResponse.annual이 실시간 총자산 기준 진행률이라 매수/매도 한 건에도
 * 값이 달라진다(account.hook.ts의 같은 자리 주석 참고).
 */
function useInvalidateTrade() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trade.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
  }
}

export function usePostTrade() {
  const invalidate = useInvalidateTrade()
  return useMutation({
    mutationFn: (body: CreateTradeRequest) => postTrade(body),
    onSuccess: invalidate,
  })
}

/**
 * 이미 갖고 있던 종목을 기존 계좌에 한 번에 등록할 때 쓴다(주식 화면의 "보유 종목 추가").
 * 서버에는 "기존 계좌에 보유 종목 일괄 등록" 엔드포인트가 없고 POST /accounts의 holdings는 계좌를
 * 새로 만들 때만 쓸 수 있어서, 여기서는 줄 수만큼 POST /trades(BUY)를 **순차로** 보낸다.
 *
 * 순차인 이유: 매매는 서버가 보유 수량·계좌 잔액을 다시 계산하는 쓰기라 동시에 쏘면 같은 계좌에
 * 경합이 생긴다. 중간에 하나가 실패해도 나머지는 계속 보내고(부분 성공을 그대로 인정한다),
 * 실패한 요청만 돌려줘서 호출부가 그 줄을 화면에 남겨 다시 시도하게 한다 — 전부 롤백할 방법이
 * 없는데 실패를 통째로 감추면 어디까지 들어갔는지 알 수 없어진다.
 */
export interface BulkTradeResult {
  succeeded: number
  /**
   * `index`는 호출부가 넘긴 `bodies` 배열에서의 위치다. **stockId로 실패한 줄을 되짚으면 안 된다** —
   * 같은 종목을 평단가를 나눠 두 줄로 담을 수 있어서 stockId가 줄마다 유일하지 않고, 그러면 이미
   * 성공한 줄까지 "실패"로 판정해 화면에 남긴다. 사용자가 안내대로 다시 시도하면 그 줄이 두 번째
   * BUY로 기록되는데, 매매는 롤백 수단이 삭제뿐이다.
   */
  failed: { index: number; body: CreateTradeRequest; message: string }[]
}

export function usePostTradesBulk() {
  const invalidate = useInvalidateTrade()
  return useMutation({
    mutationFn: async (bodies: CreateTradeRequest[]): Promise<BulkTradeResult> => {
      let succeeded = 0
      const failed: BulkTradeResult['failed'] = []
      for (const [index, body] of bodies.entries()) {
        try {
          await postTrade(body)
          succeeded += 1
        } catch (error) {
          failed.push({ index, body, message: error instanceof Error ? error.message : '등록하지 못했어요' })
        }
      }
      return { succeeded, failed }
    },
    // 한 건이라도 들어갔으면 캐시를 갱신해야 하므로 성공/실패와 무관하게(onSettled) 한 번만 무효화한다
    // — 줄마다 무효화하면 같은 화면을 수십 번 다시 불러온다.
    onSettled: invalidate,
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
