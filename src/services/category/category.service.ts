import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { CategoryKind } from '../common.type'
import type { CategoryResponse, CreateSubcategoryRequest, SubcategoryResponse } from './category.type'

/** 대분류(전역 시드) + 내 소분류(삭제 제외). */
export async function getCategories(kind?: CategoryKind) {
  return rpc<CategoryResponse[]>('get_categories', { p_kind: kind ?? null })
}

/** 같은 대분류 안에 같은 이름의 살아 있는 소분류가 있으면 SUBCATEGORY_DUPLICATE_NAME(스프링 동일). */
export async function postSubcategory(categoryId: number, body: CreateSubcategoryRequest) {
  const uid = await currentUserId()
  const name = body.name.trim()
  const dup = unwrapResult(
    await supabase.from('subcategories').select('id').eq('user_id', uid).eq('category_id', categoryId).eq('name', name).is('deleted_at', null).limit(1),
  )
  if (dup && dup.length > 0) throw new ApiError('SUBCATEGORY_DUPLICATE_NAME', errorMessageOf('SUBCATEGORY_DUPLICATE_NAME'), 409)
  return unwrapResult(
    await supabase
      .from('subcategories')
      .insert({ user_id: uid, category_id: categoryId, name, sort_order: body.sortOrder ?? 0 })
      .select('id, name')
      .single<SubcategoryResponse>(),
  )
}

/**
 * 소프트 삭제(deleted_at). 서버가 참조 무결성을 막지 않는다 — 이 소분류를 쓰는 거래·구독이 있어도 삭제된다.
 * 삭제 전에 사용자 확인을 받을 것.
 */
export async function deleteSubcategory(categoryId: number, subcategoryId: number) {
  const uid = await currentUserId()
  const updated = unwrapResult(
    await supabase
      .from('subcategories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', subcategoryId)
      .eq('category_id', categoryId)
      .eq('user_id', uid)
      .is('deleted_at', null)
      .select('id'),
  )
  if (!updated || updated.length === 0) throw new ApiError('SUBCATEGORY_NOT_FOUND', errorMessageOf('SUBCATEGORY_NOT_FOUND'), 404)
}
