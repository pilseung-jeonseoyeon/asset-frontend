import type { Currency, TransactionType } from '../common.type'

// 타입별 필드 규칙 (등록·수정 공통, 위반 시 400):
// INCOME / EXPENSE → subcategoryId 필수, transferAccountId 지정 불가
// SAVING → subcategoryId 필수 + transferAccountId도 필수(저축액이 들어간 계좌)
// TRANSFER → transferAccountId 필수, subcategoryId 지정 불가
//
// SAVING에 상대 계좌가 필수인 이유: 출금 계좌는 −amount, 상대 계좌는 +amount로 잡혀 총자산은
// 그대로고 자산 구성만 바뀐다. 상대 계좌가 없으면 출금만 반영되어 총자산이 줄어든다.

export interface TransactionResponse {
  id: number
  accountId: number
  type: TransactionType
  /** 대분류 — 소분류가 없는 이체는 null. */
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  /** 상대 계좌(이체·저축). 수입·지출은 null. */
  transferAccountId: number | null
  transferAccountName: string | null
  /** KRW 정수 — ADJUSTMENT·EXCHANGE만 부호 있는 증감액(음수 가능), 나머지는 항상 양수. */
  amount: number
  /** 외화 증감의 통화·금액(부호 있음) — 달러 종목 매매 정산·환전·달러 잔액 정정에서만 값이 있다. */
  foreignCurrency: Currency | null
  foreignAmount: number | null
  /** 'YYYY-MM-DD' */
  transactionDate: string
  description: string
  memo: string | null
}

export interface CreateTransactionRequest {
  type: TransactionType
  accountId: number
  subcategoryId?: number
  transferAccountId?: number
  /** 양수 정수 */
  amount: number
  transactionDate: string
  description: string
  memo?: string
}

/**
 * PUT은 전체 교체 — 등록 요청과 필수/선택 필드 구성이 동일하다(accountId 포함, 수정 가능).
 * 일부만 고쳐도 나머지 필수 필드를 전부 다시 보내야 하고, 선택 필드(memo)를 생략하면
 * null로 덮어써진다.
 */
export type UpdateTransactionRequest = CreateTransactionRequest

export interface DailySummaryResponse {
  /** 'YYYY-MM-DD'. 거래가 없는 날은 배열에서 빠질 수 있으므로 프론트에서 날짜 축을 채울 것. */
  date: string
  incomeAmount: number
  expenseAmount: number
  savingAmount: number
}

export interface PeriodSummaryResponse {
  incomeTotal: number
  expenseTotal: number
  savingTotal: number
  /** savingTotal / incomeTotal * 100 (정수 반올림). 해당 기간 수입이 0이면 0이 아니라 **null**. */
  savingsRatePercent: number | null
  incomeTotalPrevious: number
  expenseTotalPrevious: number
  savingTotalPrevious: number
}

export interface MonthlySummaryResponse {
  /** 1~12. 항상 12개가 온다. */
  month: number
  incomeTotal: number
  expenseTotal: number
  savingTotal: number
}

export interface CategoryRankingResponse {
  categoryId: number
  categoryName: string
  expenseTotal: number
  expenseTotalPrevious: number
  /** 음수 가능 */
  changeAmount: number
}

export interface CategoryDetailTransaction {
  transactionId: number
  date: string
  description: string
  amount: number
}

export interface CategoryDetailSubcategory {
  subcategoryId: number
  subcategoryName: string
  expenseTotal: number
  transactions: CategoryDetailTransaction[]
}

export interface CategoryDetailResponse {
  categoryId: number
  categoryName: string
  expenseTotal: number
  expenseTotalPrevious: number
  subcategories: CategoryDetailSubcategory[]
}
