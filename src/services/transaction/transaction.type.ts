import type { Currency, TransactionType } from '../common.type'

// API-SPEC §6.
//
// 타입별 필드 규칙 (등록·수정 공통, 위반 시 400):
//   INCOME / EXPENSE / SAVING → subcategoryId 필수, transferAccountId 지정 불가
//   TRANSFER                  → transferAccountId 필수, subcategoryId 지정 불가

export interface TransactionResponse {
  id: number
  accountId: number
  type: TransactionType
  subcategoryId: number | null
  subcategoryName: string | null
  /** 이체 상대 계좌. 계좌명은 응답에 없어 계좌 목록과 조인해야 한다. */
  transferAccountId: number | null
  /** KRW 정수 */
  amount: number
  nativeAmount: number | null
  nativeCurrency: Currency | null
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
  nativeAmount?: number
  nativeCurrency?: Currency
  transactionDate: string
  description: string
  memo?: string
}

/** PUT은 전체 교체. accountId는 수정 불가라 여기에 없다 — 일부만 바꿔도 필수 필드를 전부 보내야 한다. */
export type UpdateTransactionRequest = Omit<CreateTransactionRequest, 'accountId'>

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
  /** savingTotal / incomeTotal * 100. incomeTotal이 0이면 0으로 온다. */
  savingsRatePercent: number
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
