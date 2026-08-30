import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { InstitutionResponse } from './institution.type'

export async function getInstitutions() {
  return unwrap(await api.get<ApiResponse<InstitutionResponse[]>>('/institutions'))
}
