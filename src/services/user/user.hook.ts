import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import { getMe, getUserSettings, patchPassword, patchUserSettings } from './user.service'
import type {
  ChangePasswordRequest,
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

/**
 * 서버에 사용자 행이 없을 때(GET /users/me → 404 USER_NOT_FOUND) 화면에 쓸 이름.
 * 원본 프로토타입의 하드코딩 값과 동일하게 두어, 시드 전에도 화면이 비지 않게 한다.
 */
const FALLBACK_PROFILE_NAME = '정다은'

export function useGetMe() {
  return useQuery({
    queryKey: qk.user.me(),
    queryFn: getMe,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** 헤더·사이드바에 표시할 사용자 이름. 서버에 사용자가 없으면 폴백 이름을 쓴다. */
export function useProfileName(): string {
  const { data } = useGetMe()
  return data?.name ?? FALLBACK_PROFILE_NAME
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

/** 로그인한 사용자의 비밀번호 변경. 서버가 현재 비밀번호를 검증한다(틀리면 실패 메시지를 그대로 노출). */
export function usePatchPassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => patchPassword(body),
  })
}

export function usePatchUserSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateUserSettingsRequest) => patchUserSettings(body),
    onSuccess: (_data, variables) => {
      // monthStartDay가 바뀌면 정산월에 의존하는 응답(가계부 요약·순위·캘린더, 목표, 대시보드)이
      // 전부 달라지므로 캐시 전체를 무효화한다.
      if (variables.monthStartDay !== undefined) {
        void queryClient.invalidateQueries()
        return
      }
      void queryClient.invalidateQueries({ queryKey: qk.user.all() })
    },
  })
}
