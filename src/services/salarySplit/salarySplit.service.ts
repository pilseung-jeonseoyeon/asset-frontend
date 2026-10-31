import { rpc } from '../supabase'
import type { CreateSalarySplitRequest, CreateSalarySplitResponse, SalarySplitPlanResponse } from './salarySplit.type'

/** 월급 나누기 기억. 한 번도 보낸 적 없으면 null. */
export async function getSalarySplitPlan() {
  return rpc<SalarySplitPlanResponse | null>('get_salary_split_plan')
}

/** 월급 수입(선택) + 이체·저축 N건을 한 번에 등록하고 기억을 갱신한다. 하나라도 틀리면 아무것도 등록되지 않는다. */
export async function postSalarySplit(body: CreateSalarySplitRequest) {
  return rpc<CreateSalarySplitResponse>('create_salary_split', { p: body })
}
