import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { CategoryKind } from '../common.type'
import type {
  CategoryResponse,
  CreateSubcategoryRequest,
  SubcategoryResponse,
} from './category.type'

export async function getCategories(kind?: CategoryKind) {
  return unwrap(
    await api.get<ApiResponse<CategoryResponse[]>>('/categories', { params: { kind } }),
  )
}

export async function postSubcategory(categoryId: number, body: CreateSubcategoryRequest) {
  return unwrap(
    await api.post<ApiResponse<SubcategoryResponse>>(
      `/categories/${categoryId}/subcategories`,
      body,
    ),
  )
}

/**
 * 204 No Content.
 * 주의: 서버가 참조 무결성을 막지 않는다 — 이 소분류를 쓰는 거래·구독이 있어도 삭제된다.
 * 삭제 전에 사용자 확인을 받을 것.
 */
export async function deleteSubcategory(categoryId: number, subcategoryId: number) {
  await api.delete(`/categories/${categoryId}/subcategories/${subcategoryId}`)
}
