import type { RecurringExpenseKind } from '../common.type'

// paymentDay마다 서버 배치가 거래를 자동 생성하므로 프론트에서 별도 거래를 만들지 않는다.

export interface SubscriptionResponse {
  id: number
  name: string
  kind: RecurringExpenseKind
  amount: number
  /** 1~31 */
  paymentDay: number
  accountId: number
  subcategoryId: number
  icon: string | null
  /** 삭제(종료)해도 목록에서 사라지지 않고 false로 바뀐다 — 화면에서 걸러야 한다. */
  isActive: boolean
}

export interface CreateSubscriptionRequest {
  name: string
  kind: RecurringExpenseKind
  amount: number
  paymentDay: number
  accountId: number
  subcategoryId: number
  icon?: string
  startedAt?: string
}

/** PUT은 전체 교체. kind는 수정 불가라 여기에 없다. */
export type UpdateSubscriptionRequest = Omit<CreateSubscriptionRequest, 'kind'>
