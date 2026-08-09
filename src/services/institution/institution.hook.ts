import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import {
  deleteInstitution,
  getInstitutions,
  patchInstitution,
  postInstitution,
} from './institution.service'
import type { CreateInstitutionRequest, UpdateInstitutionRequest } from './institution.type'

// 금융기관은 거의 바뀌지 않는 마스터 데이터라 staleTime을 길게 잡는다.
const INSTITUTION_STALE_TIME = 5 * 60_000

export function useGetInstitutions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.institution.list(),
    queryFn: getInstitutions,
    staleTime: INSTITUTION_STALE_TIME,
    enabled: options?.enabled,
  })
}

/** 기관을 바꾸면 계좌 목록의 institutionName과 기관별 자산 분포가 함께 달라진다. */
function useInvalidateInstitution() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.institution.all() })
    void queryClient.invalidateQueries({ queryKey: qk.account.all() })
    void queryClient.invalidateQueries({ queryKey: qk.asset.all() })
  }
}

export function usePostInstitution() {
  const invalidate = useInvalidateInstitution()
  return useMutation({
    mutationFn: (body: CreateInstitutionRequest) => postInstitution(body),
    onSuccess: invalidate,
  })
}

export function usePatchInstitution() {
  const invalidate = useInvalidateInstitution()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateInstitutionRequest }) =>
      patchInstitution(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteInstitution() {
  const invalidate = useInvalidateInstitution()
  return useMutation({
    mutationFn: (institutionId: number) => deleteInstitution(institutionId),
    onSuccess: invalidate,
  })
}
