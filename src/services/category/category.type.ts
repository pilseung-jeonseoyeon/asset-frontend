import type { CategoryKind } from '../common.type'

// API-SPEC §7. 대분류는 서버 시드 고정이라 API로 생성/삭제할 수 없고, 소분류만 추가·삭제 가능하다.

export interface SubcategoryResponse {
  id: number
  name: string
}

export interface CategoryResponse {
  id: number
  kind: CategoryKind
  name: string
  /** 아이콘 키. 허용 값 집합이 스펙에 없어 프론트 매핑 실패 시 폴백이 필요하다. */
  icon: string
  subcategories: SubcategoryResponse[]
}

export interface CreateSubcategoryRequest {
  /** 같은 대분류 안에서 유니크. 중복이면 409 SUBCATEGORY_DUPLICATE_NAME. */
  name: string
  sortOrder?: number
}
