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
