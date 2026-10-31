import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import { getSalarySplitPlan, postSalarySplit } from './salarySplit.service'
import type { CreateSalarySplitRequest } from './salarySplit.type'

/** 기억 조회 — 창이 열려 있을 때만 받는다(enabled). 범위('개인 | 우리집')·정산월과 무관하다. */
export function useGetSalarySplitPlan(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.salarySplit.plan(),
    queryFn: getSalarySplitPlan,
    enabled: options?.enabled,
  })
}

/**
 * 한 번에 보내기. 거래가 여러 건 생기므로 거래 1건 등록(transaction.hook의 useInvalidateTransaction)과 같은 묶음 —
 * 잔액·자산 분포·대시보드·목표가 원장에서 다시 계산된다 — 에 기억까지 무효화한다.
 */
export function usePostSalarySplit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSalarySplitRequest) => postSalarySplit(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transaction.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.salarySplit.all() })
    },
  })
}
