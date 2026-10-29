import { rpc } from '../supabase'
import type { ViewScope, YearMonth } from '../common.type'
import type { GoalResponse, UpsertGoalRequest } from './goal.type'

/** year/month 미지정 시 현재 정산월 기준으로 진행률이 계산된다. */
export async function getGoal(period: Partial<YearMonth> = {}, scope: ViewScope = 'PERSONAL') {
  return rpc<GoalResponse>('get_goals', { p_year: period.year ?? null, p_month: period.month ?? null, p_scope: scope })
}

/** 등록·수정 공용. 다시 저장하면 기존 목표를 덮어쓴다. */
export async function putGoal(body: UpsertGoalRequest, scope: ViewScope = 'PERSONAL') {
  return rpc<GoalResponse>('upsert_goal', {
    p_target_amount: body.targetAmount,
    p_target_date: body.targetDate,
    p_monthly_income: body.monthlyIncome,
    p_scope: scope,
  })
}

/** 저장하지 않고 입력값만으로 월 필요 저축액·지출 가능액·실행 가능성을 계산한다(응답은 getGoal 과 같은 모양). */
export async function getGoalPreview(params: UpsertGoalRequest, scope: ViewScope = 'PERSONAL') {
  return rpc<GoalResponse>('preview_goal', {
    p_target_amount: params.targetAmount,
    p_target_date: params.targetDate,
    p_monthly_income: params.monthlyIncome,
    p_scope: scope,
  })
}

/** 목표 삭제(DB 함수 delete_goal). 없어도 오류가 아니다 — 공유 목표는 상대가 먼저 지웠을 수 있다. */
export async function deleteGoal(scope: ViewScope = 'PERSONAL') {
  await rpc<void>('delete_goal', { p_scope: scope })
}
