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
  /** 결제 계좌 이름 — 목록 행에는 기관명을 우선해 보여주므로(ledgerView accountLabelOf) 폴백용이다. */
  accountName: string
  subcategoryId: number
  icon: string | null
  /** 'YYYY-MM-DD'. 등록 때 안 넣었으면 null. PUT에서 빼면 null로 지워지므로 수정 저장에 다시 실어야 한다. */
  startedAt: string | null
  /** 'YYYY-MM-DD' — 종료(해지)한 날. 활성 항목은 null. */
  endedAt: string | null
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

/** PUT은 전체 교체 — 빠진 선택 필드(icon·startedAt)는 null로 지워진다. kind는 수정 불가라 여기에 없다. */
export type UpdateSubscriptionRequest = Omit<CreateSubscriptionRequest, 'kind'>
