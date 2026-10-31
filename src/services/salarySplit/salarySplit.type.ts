// 월급 나누기 — DB 함수 get_salary_split_plan · create_salary_split(supabase/migrations/20261031000028_salary_split.sql)의
// jsonb 그대로. 필드 유무·null 규칙의 정본은 함수 본문(jsonb_build_object)이다.

/** 받는 통장 줄의 유형. 저축은 소분류가 있어야 하고(가계부 저축률에 잡힌다), 이체는 소분류가 없다. */
export type SalarySplitLineType = 'TRANSFER' | 'SAVING'

/** 기억한 받는 통장 한 줄. 배열 순서 = 화면 순서. */
export interface SalarySplitPlanLine {
  accountId: number
  type: SalarySplitLineType
  /** 저축 소분류. 이체이거나, 기억한 소분류가 그사이 지워졌으면 null */
  subcategoryId: number | null
  /** 마지막으로 실제 보낸 금액. 한 번도 보낸 적 없는 줄은 null */
  lastAmount: number | null
}

/** 월급 나누기 기억(사용자당 하나). 한 번도 보낸 적 없으면 서버가 null을 준다. */
export interface SalarySplitPlanResponse {
  /** 월급통장. 그사이 해지됐으면 null */
  sourceAccountId: number | null
  /** 지난번에 '수입으로 적기'를 켰는지 — 기록용. 체크 기본값은 lastSalaryAmount · lastIncomeOn으로 정한다(000031) */
  includeIncome: boolean
  /** 지난번 월급의 수입 소분류. 그사이 지워졌으면 null */
  incomeSubcategoryId: number | null
  /** 마지막으로 적은 월급. 월급을 끈 달에는 바뀌지 않는다 */
  lastSalaryAmount: number | null
  /** 마지막으로 보낸 날짜 'YYYY-MM-DD' — 월급 없이 이체만 보낸 날도 포함 */
  lastSentOn: string | null
  /** 마지막으로 월급(수입)을 같이 적은 거래일 'YYYY-MM-DD'. 월급을 끈 보내기는 바꾸지 않는다(000031) */
  lastIncomeOn: string | null
  lastSentCount: number | null
  lastSentTotal: number | null
  /** 해지됐거나 내 것이 아니게 된 통장은 빠져 있다 */
  lines: SalarySplitPlanLine[]
  /** 위 이유로 빠진 줄 수 */
  droppedCount: number
}

export interface CreateSalarySplitLine {
  accountId: number
  type: SalarySplitLineType
  /** 저축만. 이체는 null */
  subcategoryId: number | null
  /** 이번 달 건너뛰는 줄(체크 해제 · 금액 없음)은 null — 기억에는 남는다 */
  amount: number | null
}

export interface CreateSalarySplitRequest {
  sourceAccountId: number
  /** 'YYYY-MM-DD' */
  transactionDate: string
  /** 이체·저축 거래의 내용(1~200자) */
  description: string
  /** 월급 수입 거래의 내용(1~200자) */
  incomeDescription: string
  /** '수입으로 적기'를 끈 달은 null */
  income: { amount: number; subcategoryId: number } | null
  /** 화면의 모든 줄(건너뛴 줄 포함), 0~10개 */
  lines: CreateSalarySplitLine[]
}

export interface CreateSalarySplitResponse {
  /** 월급을 적지 않았으면 null */
  incomeTransactionId: number | null
  transactionIds: number[]
  /** 이체·저축 줄 수(월급 제외) */
  count: number
  /** 이체·저축 합계(월급 제외) */
  total: number
}
