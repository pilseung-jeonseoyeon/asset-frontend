import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { RecurringExpenseKind, ViewScope } from '../common.type'
import type { CreateSubscriptionRequest, SubscriptionResponse, UpdateSubscriptionRequest } from './subscription.type'

const KST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })

/** 화면은 종료된 항목을 쓰지 않아 활성만 받는다(해지 항목은 isActive=false 로 남지만 목록에서 뺀다). */
export async function getSubscriptions(kind?: RecurringExpenseKind, scope: ViewScope = 'PERSONAL') {
  return rpc<SubscriptionResponse[]>('list_subscriptions', { p_kind: kind ?? null, p_active: true, p_scope: scope })
}

/** 쓰기 뒤 응답(SubscriptionRes — 계좌 이름 조인)은 목록 함수로 다시 읽는다. */
async function findSubscription(id: number): Promise<SubscriptionResponse> {
  const all = await rpc<SubscriptionResponse[]>('list_subscriptions', { p_kind: null, p_active: null })
  const found = all.find((s) => s.id === id)
  if (!found) throw new ApiError('RECURRING_EXPENSE_NOT_FOUND', errorMessageOf('RECURRING_EXPENSE_NOT_FOUND'), 404)
  return found
}

export async function postSubscription(body: CreateSubscriptionRequest) {
  const uid = await currentUserId()
  const inserted = unwrapResult(
    await supabase
      .from('recurring_expenses')
      .insert({
        user_id: uid,
        account_id: body.accountId,
        subcategory_id: body.subcategoryId,
        name: body.name,
        kind: body.kind,
        amount: body.amount,
        payment_day: body.paymentDay,
        icon: body.icon ?? null,
        started_at: body.startedAt ?? null,
      })
      .select('id')
      .single<{ id: number }>(),
  )
  return findSubscription(inserted.id)
}

/** PUT 은 전체 교체 — 빠진 선택 필드(icon·startedAt)는 null 로 지워진다. kind 는 바꿀 수 없다. */
export async function putSubscription(subscriptionId: number, body: UpdateSubscriptionRequest) {
  const uid = await currentUserId()
  const updated = unwrapResult(
    await supabase
      .from('recurring_expenses')
      .update({
        account_id: body.accountId,
        subcategory_id: body.subcategoryId,
        name: body.name,
        amount: body.amount,
        payment_day: body.paymentDay,
        icon: body.icon ?? null,
        started_at: body.startedAt ?? null,
      })
      .eq('id', subscriptionId)
      .eq('user_id', uid)
      .select('id'),
  )
  if (!updated || updated.length === 0) throw new ApiError('RECURRING_EXPENSE_NOT_FOUND', errorMessageOf('RECURRING_EXPENSE_NOT_FOUND'), 404)
  return findSubscription(subscriptionId)
}

/** 해지(소프트 삭제): isActive=false, endedAt=오늘(KST). 목록에서는 빠지고 과거 자동 기록은 남는다. */
export async function deleteSubscription(subscriptionId: number) {
  const uid = await currentUserId()
  const updated = unwrapResult(
    await supabase
      .from('recurring_expenses')
      .update({ is_active: false, ended_at: KST_DATE.format(new Date()) })
      .eq('id', subscriptionId)
      .eq('user_id', uid)
      .eq('is_active', true)
      .select('id'),
  )
  if (!updated || updated.length === 0) throw new ApiError('RECURRING_EXPENSE_NOT_FOUND', errorMessageOf('RECURRING_EXPENSE_NOT_FOUND'), 404)
}
