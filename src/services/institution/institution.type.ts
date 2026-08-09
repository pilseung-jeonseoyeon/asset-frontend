import type { InstitutionType } from '../common.type'

// API-SPEC §2. 필터·페이지네이션 없이 전체 목록을 돌려준다.

export interface InstitutionResponse {
  id: number
  name: string
  type: InstitutionType
  /**
   * 아이콘 키. 프론트의 src/design/bank-institutions.ts `tokenKey`와 같은 체계인지 미확인이라
   * BankIcon이 못 찾으면 기본 아이콘으로 폴백된다(백엔드 확인 필요 항목).
   */
  icon: string | null
  /** '#FFCD00' 형태로 보이지만 서버 포맷 검증 여부는 미확인. */
  color: string | null
}

export interface CreateInstitutionRequest {
  name: string
  type: InstitutionType
  icon?: string
  color?: string
}

/** PATCH — 전 필드 선택. 스펙에 요청 필드 표가 없어 생성 요청과 같은 형태로 가정한다. */
export type UpdateInstitutionRequest = Partial<CreateInstitutionRequest>
