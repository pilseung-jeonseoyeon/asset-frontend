import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api'
import { qk } from '../queryKeys'
import { getMe, getUserSettings, patchPassword, patchUserSettings } from './user.service'
import type {
  ChangePasswordRequest,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
} from './user.type'

/**
 * 서버에 사용자 설정 행이 없을 때 쓰는 기본값.
 *
 * 백엔드에 시드 데이터가 아직 없어 GET /users/me/settings가 404 USER_SETTINGS_NOT_FOUND를
 * 돌려준다. 설정이 없다고 앱 전체가 에러 화면이 되면 안 되므로 기본값으로 대체한다.
 * 서버가 기본행을 시드하거나 미존재 시 기본값을 응답하도록 바뀌면 이 폴백은 제거할 것.
 */
export const DEFAULT_USER_SETTINGS: UserSettingsResponse = {
  baseCurrency: 'KRW',
  monthStartDay: 1,
  fxAutoRefresh: true,
  ddayNotifyEnabled: true,
  ddayNotifyDays: 30,
  theme: 'SYSTEM',
}

/** 사용자 설정이 아직 서버에 없는 상태인지 (에러가 아니라 "미준비"로 다뤄야 하는 케이스) */
export function isSettingsMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'USER_SETTINGS_NOT_FOUND'
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
 * 404(설정 행 없음)만 DEFAULT_USER_SETTINGS로 대체하고 `isFallback: true`로 알린다.
 * 그 외 실패(5xx, 네트워크 오류)는 삼키지 않고 `error`/`isError`로 그대로 올린다 —
 * 진짜 장애를 "설정 없음"과 같은 모양으로 보이게 하면 사용자가 잘못된 값을 기준으로 판단하게 된다.
 * 호출부는 `error`가 있으면 화면에 노출할 것.
 */
export function useGetUserSettings(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: qk.user.settings(),
    queryFn: async () => {
      try {
        return { settings: await getUserSettings(), isFallback: false }
      } catch (error) {
        if (isSettingsMissing(error)) {
          return { settings: DEFAULT_USER_SETTINGS, isFallback: true }
        }
        throw error
      }
    },
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  })

  return {
    ...query,
    // 조회에 실패한 동안에도 화면이 죽지 않도록 기본값을 내주지만, isFallback은 "서버에 설정이
    // 없음"이 확인된 경우에만 true다. 실패/로딩 중에는 false이고 error로 구분한다.
    settings: query.data?.settings ?? DEFAULT_USER_SETTINGS,
    isFallback: query.data?.isFallback ?? false,
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
