// API-SPEC §5. 목표는 사용자당 하나뿐이라 등록·수정이 같은 PUT 하나다(멱등 upsert).
// 저장하는 값은 목표 자산 / 목표 시점 / 월평균 수입 세 개뿐이고, 진행률과 월 필요 저축액은
// 서버가 매 요청 계산해 내려준다.

export interface GoalDetail {
  targetAmount: number
  currentValue: number
  progressPercent: number
}

export interface GoalResponse {
  /** 월간 진행률을 계산한 정산월 */
  year: number
  month: number
  /** 저장된 입력값 — 수정 모달의 초기값으로 그대로 쓴다. */
  targetAmount: number
  /**
   * 목표를 아직 등록하지 않았으면 서버가 404가 아니라 0으로 채운 200을 준다.
   * 이 값이 null인지로 "목표 미설정"을 판단한다.
   */
  targetDate: string | null
  monthlyIncome: number
  /** 연간 · 총자산 — currentValue는 최신 스냅샷 총자산 */
  annual: GoalDetail
  /** 월간 · 필요 저축 — targetAmount가 서버가 역산한 월 필요 저축액, currentValue는 이번 정산월 순증 */
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
