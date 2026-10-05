import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { YearMonth } from '../common.type'
import type { GoalResponse, UpsertGoalRequest } from './goal.type'

/** year/month 미지정 시 현재 정산월 기준으로 진행률이 계산된다. */
export async function getGoal(period: Partial<YearMonth> = {}) {
  return unwrap(await api.get<ApiResponse<GoalResponse>>('/goals', { params: period }))
}

/** 등록·수정 공용. 다시 PUT하면 기존 목표를 덮어쓴다(409 없음). */
export async function putGoal(body: UpsertGoalRequest) {
  return unwrap(await api.put<ApiResponse<GoalResponse>>('/goals', body))
}

/** 저장하지 않고 입력값만으로 월 필요 저축액·지출 가능액·실행 가능성을 계산한다(응답은 GET /goals와 같은 모양). */
export async function getGoalPreview(params: UpsertGoalRequest) {
  return unwrap(await api.get<ApiResponse<GoalResponse>>('/goals/preview', { params }))
}

/** 204. 목표가 없으면 404 GOAL_NOT_FOUND. */
export async function deleteGoal() {
  await api.delete('/goals')
}
