import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { YearMonth } from '../common.type'
import { deleteGoal, getGoal, getGoalPreview, putGoal } from './goal.service'
import type { UpsertGoalRequest } from './goal.type'

interface QueryOptions {
  enabled?: boolean
}

/**
 * 목표 조회. `isUnset`은 "아직 목표를 등록하지 않음" — 서버가 이 상태를 에러가 아니라
 * targetDate: null로 표현하기 때문에 화면에서 등록 유도 UI를 띄울 때 쓴다.
 *
 * **응답이 도착한 뒤에만 true가 된다.** `data?.targetDate == null`로 두면 로딩 중에도 true라,
 * 목표가 멀쩡히 있는 사용자에게 모달을 열 때마다(그리고 목표를 저장해 쿼리가 무효화된 직후마다)
 * "아직 목표를 설정하지 않았어요"가 잠깐 스쳐 지나간다.
 */
export function useGetGoal(period: Partial<YearMonth> = {}, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.goal.detail(period),
    queryFn: () => getGoal(period),
    enabled: options?.enabled,
  })
  return {
    ...query,
    goal: query.data ?? null,
    isUnset: query.data !== undefined && query.data.targetDate === null,
  }
}

export function usePutGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertGoalRequest) => putGoal(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
      // 대시보드의 "자산 목표" 위젯이 같은 값을 읽는다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
    },
  })
}

/**
 * 목표 설정 모달의 미리보기. params가 null이면(입력이 아직 유효하지 않음) 부르지 않는다. 호출부가 입력을
 * 디바운스해서 넘긴다 — 글자마다 계산 요청이 나가지 않게.
 */
export function useGetGoalPreview(params: UpsertGoalRequest | null) {
  return useQuery({
    queryKey: params ? queryKeys.goal.preview(params) : ['goal', 'preview', 'idle'],
    queryFn: () => getGoalPreview(params as UpsertGoalRequest),
    enabled: params !== null,
    // 같은 입력으로 다시 계산할 필요가 없다.
    staleTime: 60_000,
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
    },
  })
}
