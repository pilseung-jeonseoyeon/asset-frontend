import { supabase, unwrapResult } from '../supabase'
import type { InstitutionResponse } from './institution.type'

/** 금융기관 마스터(전역). 로그인 사용자 누구나 읽는다. */
export async function getInstitutions() {
  return unwrapResult(
    await supabase.from('institutions').select('id, name, type, icon, color').order('id').returns<InstitutionResponse[]>(),
  )
}
