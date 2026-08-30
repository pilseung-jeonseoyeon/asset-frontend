// 목표는 사용자당 하나뿐이라 등록·수정이 같은 PUT 하나다(멱등 upsert).
// 저장하는 값은 목표 자산 / 목표 시점 / 월평균 수입 세 개뿐이고, 진행률과 월 필요 저축액은
// 서버가 매 요청 계산해 내려준다.

/**
 * 진행률 한 축(연간 또는 월간). **계산 근거가 없으면 세 값이 모두 null**이다 — `0`(측정 결과
 * 0)과 반드시 구분해서 다룰 것. `progressPercent`는 초과 달성이어도 100으로 자르지 않는다
 * (클램프는 화면 책임 — dashboardView.ts 참고).
 */
export interface GoalDetail {
  targetAmount: number | null
  currentValue: number | null
  progressPercent: number | null
}

export type GoalFeasibility = 'FEASIBLE' | 'TIGHT' | 'INFEASIBLE'

export type GoalStatus = 'NO_LEDGER_DATA' | 'BEHIND' | 'ON_TRACK' | 'ACHIEVED' | 'EXPIRED' | 'INFEASIBLE'

export interface GoalResponse {
  /** 월간 진행률을 계산한 정산월 */
  year: number
  month: number
  /**
   * 저장된 입력값 — 수정 모달의 초기값으로 그대로 쓴다. 목표를 아직 등록하지 않았으면
   * 서버가 404가 아니라 0으로 채운 200을 준다.
   */
  targetAmount: number
  /** 목표를 아직 등록하지 않았으면 null — "목표 미설정" 판단 기준. */
  targetDate: string | null
  monthlyIncome: number
  /** 가계부 최근 3개 정산월 평균 수입(원) — 목표 설정 화면의 자동 입력값. 계산 불가하면 null. */
  suggestedMonthlyIncome: number | null
  /** 목표 시점까지 남은 정산월 수(이번 달 포함) — 계산 불가하면 null. */
  monthsRemaining: number | null
  /** 월 지출 가능액(원) = 월평균 수입 − 월 필요 저축액, 하한 0 — 계산 불가하면 null. */
  monthlySpendableAmount: number | null
  /** 월 부족액(원) = 월 필요 저축액 − 월평균 수입, 하한 0 — 계산 불가하면 null. */
  monthlyShortfallAmount: number | null
  /** 투자·시세 변동(원) = 총자산 순증 − 순저축 — 기준 스냅샷이나 원장이 없으면 null. */
  investmentChangeKrw: number | null
  /** 실행 가능성 — 계산 불가하면 null. */
  feasibility: GoalFeasibility | null
  /** 목표 상태 — 목표 미설정이면 null. EXPIRED면 monthly.* 세 값이 전부 null이 된다. */
  status: GoalStatus | null
  /** 연간 진행률 — 실시간 총자산 기준 */
  annual: GoalDetail
  /** 월간 진행률 — 이번 정산월 순저축 기준 */
  monthly: GoalDetail
}

export interface UpsertGoalRequest {
  /** 0 초과 */
  targetAmount: number
  /** 'YYYY-MM-DD', 오늘 이후 */
  targetDate: string
  /** 0 이상 */
  monthlyIncome: number
}
