import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { RecurringExpenseKind } from '../common.type'
import {
  deleteSubscription,
  getSubscriptions,
  postSubscription,
  putSubscription,
} from './subscription.service'
import type { CreateSubscriptionRequest, UpdateSubscriptionRequest } from './subscription.type'

export function useGetSubscriptions(
  kind?: RecurringExpenseKind,
  options?: { enabled?: boolean },
) {
  const query = useQuery({
    queryKey: qk.subscription.list(kind),
    queryFn: () => getSubscriptions(kind),
    enabled: options?.enabled,
  })
  return {
    ...query,
    subscriptions: query.data ?? [],
    /** 종료된 항목을 뺀 목록. 서버가 isActive:false도 그대로 내려준다. */
    activeSubscriptions: (query.data ?? []).filter((s) => s.isActive),
  }
}

/**
 * 구독/고정지출을 바꿔도 거래는 서버 배치가 결제일에 만들기 때문에 즉시 바뀌지 않는다.
 * 그래서 transaction까지 무효화하지 않는다.
 */
function useInvalidateSubscription() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.subscription.all() })
  }
}

export function usePostSubscription() {
  const invalidate = useInvalidateSubscription()
  return useMutation({
    mutationFn: (body: CreateSubscriptionRequest) => postSubscription(body),
    onSuccess: invalidate,
  })
}

export function usePutSubscription() {
  const invalidate = useInvalidateSubscription()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateSubscriptionRequest }) =>
      putSubscription(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSubscription() {
  const invalidate = useInvalidateSubscription()
  return useMutation({
    mutationFn: (subscriptionId: number) => deleteSubscription(subscriptionId),
    onSuccess: invalidate,
  })
}
