import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { CategoryKind } from '../common.type'
import { deleteSubcategory, getCategories, postSubcategory } from './category.service'
import type { CreateSubcategoryRequest } from './category.type'

// 카테고리는 자주 바뀌지 않는 마스터 데이터라 staleTime을 길게 잡는다.
const CATEGORY_STALE_TIME = 5 * 60_000

export function useGetCategories(kind?: CategoryKind, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.category.list(kind),
    queryFn: () => getCategories(kind),
    staleTime: CATEGORY_STALE_TIME,
    enabled: options?.enabled,
  })
  return { ...query, categories: query.data ?? [] }
}

/** 소분류가 바뀌면 거래 목록에 표시되는 subcategoryName도 달라질 수 있다. */
function useInvalidateCategory() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.category.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.transaction.all() })
  }
}

export function usePostSubcategory() {
  const invalidate = useInvalidateCategory()
  return useMutation({
    mutationFn: ({ categoryId, body }: { categoryId: number; body: CreateSubcategoryRequest }) =>
      postSubcategory(categoryId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSubcategory() {
  const invalidate = useInvalidateCategory()
  return useMutation({
    mutationFn: ({ categoryId, subcategoryId }: { categoryId: number; subcategoryId: number }) =>
      deleteSubcategory(categoryId, subcategoryId),
    onSuccess: invalidate,
  })
}
