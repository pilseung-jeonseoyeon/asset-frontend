import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { RecurringExpenseKind } from '../common.type'
import type {
  CreateSubscriptionRequest,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from './subscription.type'

export async function getSubscriptions(kind?: RecurringExpenseKind) {
  return unwrap(
    await api.get<ApiResponse<SubscriptionResponse[]>>('/subscriptions', { params: { kind } }),
  )
}

export async function postSubscription(body: CreateSubscriptionRequest) {
  return unwrap(await api.post<ApiResponse<SubscriptionResponse>>('/subscriptions', body))
}

export async function putSubscription(subscriptionId: number, body: UpdateSubscriptionRequest) {
  return unwrap(
    await api.put<ApiResponse<SubscriptionResponse>>(`/subscriptions/${subscriptionId}`, body),
  )
}

/** 204 No Content. 소프트 삭제(isActive=false)라 목록에는 계속 나타난다. */
export async function deleteSubscription(subscriptionId: number) {
  await api.delete(`/subscriptions/${subscriptionId}`)
}
