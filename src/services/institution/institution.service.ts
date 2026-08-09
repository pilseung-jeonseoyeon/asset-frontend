import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  CreateInstitutionRequest,
  InstitutionResponse,
  UpdateInstitutionRequest,
} from './institution.type'

export async function getInstitutions() {
  return unwrap(await api.get<ApiResponse<InstitutionResponse[]>>('/institutions'))
}

export async function postInstitution(body: CreateInstitutionRequest) {
  return unwrap(await api.post<ApiResponse<InstitutionResponse>>('/institutions', body))
}

export async function patchInstitution(institutionId: number, body: UpdateInstitutionRequest) {
  return unwrap(
    await api.patch<ApiResponse<InstitutionResponse>>(`/institutions/${institutionId}`, body),
  )
}

/** 204 No Content. 해당 기관에 활성 계좌가 남아 있으면 409 INSTITUTION_HAS_ACTIVE_ACCOUNTS. */
export async function deleteInstitution(institutionId: number) {
  await api.delete(`/institutions/${institutionId}`)
}
