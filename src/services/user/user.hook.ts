import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { qk } from '../queryKeys'
import { deleteMe, getMe, getUserSettings, patchMe, patchPassword, patchUserSettings } from './user.service'
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
} from './user.type'

/**
 * 사용자 설정 조회가 로딩 중이거나 실패했을 때 화면이 죽지 않도록 쓰는 렌더 안전망 기본값.
 *
 * 가입 시 회원 생성과 함께 user_settings가 항상 만들어짐이 백엔드에서 보장되므로(2026-08-15
 * 확정) "서버에 설정이 없는 상태"는 더 이상 없다. 그래도 최초 로딩 중이거나 네트워크 오류로
 * 요청이 실패한 짧은 구간에는 `settings`를 참조하는 화면이 undefined로 깨지지 않게 이 기본값을
 * 내려준다 — 실패 여부 자체는 `error`/`isError`로 별도 노출하므로 호출부가 함께 확인할 것.
 */
export const DEFAULT_USER_SETTINGS: UserSettingsResponse = {
  baseCurrency: 'KRW',
  monthStartDay: 1,
  fxAutoRefresh: true,
  ddayNotifyEnabled: true,
  ddayNotifyDays: 30,
  theme: 'SYSTEM',
}

export function useGetMe() {
  return useQuery({
    queryKey: qk.user.me(),
    queryFn: getMe,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/**
 * 헤더·사이드바에 표시할 사용자 이름. 최초 로딩 중이거나 조회가 실패하면 빈 문자열을 돌려준다
 * (다른 사람의 이름을 잠깐이라도 잘못 보여주지 않기 위해 — 예전엔 '정다은' 하드코딩 폴백이 있었지만
 * 인증 도입 후 남의 이름이 뜨는 경로만 남아 제거했다). `Avatar`는 이름이 비면 이니셜 대신
 * person 아이콘을 그리도록 이미 지원한다(Avatar.tsx의 `getAvatarInitial` 참고).
 */
export function useProfileName(): string {
  const { data } = useGetMe()
  return data?.name ?? ''
}

/**
 * 정산월 계산의 기준값이라 앱 전역이 의존한다.
 *
 * 실패(5xx, 네트워크 오류 등)는 삼키지 않고 `error`/`isError`로 그대로 올린다 — 호출부는
 * `error`가 있으면 화면에 노출할 것. `settings`는 로딩/에러 중에도 DEFAULT_USER_SETTINGS로
 * 채워지는 렌더 안전망이므로, 값이 채워져 있다고 요청이 성공했다고 착각하지 말 것.
 */
export function useGetUserSettings(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: qk.user.settings(),
    queryFn: getUserSettings,
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  })

  return {
    ...query,
    settings: query.data ?? DEFAULT_USER_SETTINGS,
  }
}

/** 이름 · 마케팅 수신 동의 수정. 성공하면 프로필 쿼리를 무효화해 헤더·사이드바 이름도 함께 갱신한다. */
export function usePatchMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => patchMe(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.user.me() })
    },
  })
}

/**
 * 회원 탈퇴. 로그아웃(usePostLogout)과 달리 **실패하면 세션을 그대로 둔다** — 탈퇴가 안 됐는데
 * 로그아웃까지 시키면 사용자는 "탈퇴됐다"고 오인하고 계정은 서버에 그대로 남는다. 성공했을 때만
 * signOut + 캐시 초기화로 로그인 화면으로 돌려보낸다.
 */
export function useDeleteMe() {
  const signOut = useAuthStore((s) => s.signOut)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMe,
    onSuccess: () => {
      signOut()
      queryClient.clear()
    },
  })
}

/** 로그인한 사용자의 비밀번호 변경. 서버가 현재 비밀번호를 검증한다(틀리면 실패 메시지를 그대로 노출). */
export function usePatchPassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => patchPassword(body),
  })
}

/**
 * `target`에서 `keys`에 해당하는 필드만 `source`의 값으로 덮은 새 객체를 만든다.
 * `target[key] = source[key]`를 인라인 for 루프로 쓰면 `key`가 제네릭 `keyof T`라 TS가
 * "동일한 인덱스 타입이지만 유니언이라 서로 대입 불가"로 거부한다(에러: `Type 'number |
 * boolean | ... ' is not assignable to type 'never'`) — 이 헬퍼 하나로 캡슐화해서 `as`
 * 단언을 한 곳에만 두고, 호출부는 완전히 타입 안전하게 쓴다.
 */
function withRestoredFields<T extends object>(target: T, source: T, keys: (keyof T)[]): T {
  // 순수 `keyof T` 제네릭 인덱스 쓰기는 TS가 대입 가능한 타입을 `never`로 좁혀버려 거부한다
  // (동일 필드를 같은 타입끼리 옮기는 것뿐인데도 그렇다) — 이 함수 안에서만 `Record<string,
  // unknown>`으로 다뤄 그 제약을 우회하고, 함수 시그니처(T → T)는 그대로 타입 안전하게 유지한다.
  const result = { ...target } as Record<string, unknown>
  for (const key of keys) {
    result[key as string] = source[key]
  }
  return result as T
}

// 2차 리뷰 #4: mutationKey 없이 queryClient.isMutating()을 부르면 앱 전역 mutation(예: 가계부
// 거래 저장)까지 세어, 이 화면과 무관한 요청 때문에 onSuccess의 setQueryData가 부당하게
// 건너뛰어진다. GeneralModal의 두 usePatchUserSettings() 인스턴스가 이 키를 공유해야 서로를
// "겹치는 설정 저장"으로 인식할 수 있으므로, 훅 밖 모듈 스코프 상수로 고정한다.
const SETTINGS_MUTATION_KEY = qk.user.settings()

/**
 * 낙관적 업데이트: 누르는 즉시 캐시(따라서 그걸 구독하는 화면)를 바꾸고, 실패하면 여기서
 * 되돌린다(onError). 화면(GeneralModal 등)은 실패 롤백을 직접 하지 않는다 — 캐시가 되돌아가면
 * useSyncUserTheme 같은 구독 훅이 AppState·localStorage까지 자동으로 따라 복원하므로, 롤백
 * 코드가 훅 하나와 화면 여러 곳으로 갈라지지 않는다.
 *
 * 같은 필드 집합을 여러 mutation 인스턴스가 동시에 건드릴 수 있어(예: GeneralModal의 테마·환율
 * 자동 갱신이 각각 독립된 usePatchUserSettings() 인스턴스를 씀), onError/onSuccess 모두 "이
 * mutation이 실제로 보낸 필드"만 건드리고 서로 겹치는 나머지 필드는 건드리지 않는다(리뷰 #2).
 */
export function usePatchUserSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: SETTINGS_MUTATION_KEY,
    mutationFn: (body: UpdateUserSettingsRequest) => patchUserSettings(body),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: qk.user.settings() })
      const previous = queryClient.getQueryData<UserSettingsResponse>(qk.user.settings())
      // 아직 한 번도 못 받아왔으면(캐시가 비어 있으면) 부분 병합이 불완전한 객체를 만들어버리므로
      // 건드리지 않는다 — 이 경우 요청이 끝날 때까지 화면은 DEFAULT_USER_SETTINGS 폴백을 본다.
      if (previous) queryClient.setQueryData(qk.user.settings(), { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, variables, context) => {
      // 스냅샷 전체가 아니라 "이 mutation이 실제로 보낸 필드"만 되돌린다. 서로 다른 필드를
      // 건드리는 두 mutation이 겹치면(예: 테마 저장 중 환율 토글), 전체를 되돌릴 경우 그 사이
      // 다른 mutation이 이미 성공시켜 캐시에 반영된 필드까지 같이 사라진다(리뷰 #2).
      if (!context?.previous) return
      const previous = context.previous
      const touchedKeys = Object.keys(variables) as (keyof UserSettingsResponse)[]
      queryClient.setQueryData<UserSettingsResponse>(qk.user.settings(), (current) =>
        current ? withRestoredFields(current, previous, touchedKeys) : current,
      )
    },
    onSuccess: (data, variables) => {
      // PATCH 응답이 설정 전체이므로 낙관적 병합 대신 서버 응답을 그대로 채택하는 게 원칙이지만,
      // 겹치는 mutation이 있으면(자기 자신 포함 2개 이상 pending) 이 응답은 아직 그 다른
      // mutation이 보낸 필드를 반영하지 않은 스냅샷이다. 그대로 덮으면 다른 행이 방금 낙관적으로
      // 반영한 값이 사라지므로, 겹치는 동안은 덮어쓰기를 건너뛰고 무효화로만 최종 수렴시킨다
      // (리뷰 #2). onSuccess는 mutation 상태가 'success'로 바뀌기 전에 실행되므로 자기 자신도
      // isMutating()에 잡힌다 — 그래서 겹치는 요청이 없을 때 기준값은 1이다.
      // 2차 리뷰 #4: mutationKey로 범위를 좁혀야 가계부 저장 등 무관한 mutation이 이 카운트에
      // 섞여 setQueryData가 부당하게 건너뛰어지는 일이 없다.
      const applied = queryClient.isMutating({ mutationKey: SETTINGS_MUTATION_KEY }) <= 1
      if (applied) {
        queryClient.setQueryData(qk.user.settings(), data)
      }
      // monthStartDay가 바뀌면 정산월에 의존하는 응답(가계부 요약·순위·캘린더, 목표, 대시보드)이
      // 전부 달라지므로 캐시 전체를 무효화한다. setQueryData 뒤에 둬야 이 쿼리 자체도 서버 값으로
      // 수렴한다(무효화만 하면 재요청이 끝나기 전까지 잠깐 낙관적 값이 남는다).
      if (variables.monthStartDay !== undefined) {
        void queryClient.invalidateQueries({
          // 방금 setQueryData로 서버 응답을 그대로 채운 설정 쿼리는 제외한다 — 같이 무효화하면
          // 이미 최신인데도 강제 refetch되어 저장할 때마다 불필요한 GET이 한 번 더 나간다(2차
          // 리뷰 #3). applied가 false면(겹치는 mutation 있음) 설정 쿼리도 그대로 무효화 대상에
          // 포함시켜 최종 수렴하게 둔다.
          predicate: (q) =>
            !(applied && q.queryKey[0] === 'user' && q.queryKey[1] === 'settings'),
        })
        return
      }
      // PATCH /users/me/settings는 GET /users/me(qk.user.me())에 영향을 주지 않으므로 qk.user.all()
      // 전체 무효화는 과하다 — 겹치는 mutation이 있어 setQueryData를 건너뛴 경우에만 설정 쿼리를
      // 무효화해 최종 수렴시킨다(2차 리뷰 #3). applied면 이미 서버 값으로 캐시가 최신이라 무효화가
      // 필요 없다.
      if (!applied) {
        void queryClient.invalidateQueries({ queryKey: qk.user.settings() })
      }
    },
  })
}
