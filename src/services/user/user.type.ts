import type { Currency, ThemeType } from '../common.type'

// API-SPEC §15. 이 앱은 단일 사용자(서버가 user_id=1을 내부 주입)라 인증 헤더가 없다.

export interface UserResponse {
  id: number
  name: string
  email: string
}

export interface UserSettingsResponse {
  baseCurrency: Currency
  /** 정산월 시작일(1~28). 이 앱의 "이번 달"은 달력 1일이 아니라 이 값을 기준으로 한다. */
  monthStartDay: number
  fxAutoRefresh: boolean
  ddayNotifyEnabled: boolean
  ddayNotifyDays: number
  theme: ThemeType
}

/** PATCH /users/me/settings — 전 필드 선택. monthStartDay는 1~28, ddayNotifyDays는 양수. */
export type UpdateUserSettingsRequest = Partial<UserSettingsResponse>

/** PATCH /users/me/password. newPassword는 auth.type.ts의 PASSWORD_PATTERN과 같은 규칙. */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
