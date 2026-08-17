import type { Currency, ThemeType } from '../common.type'

// GET/PATCH /users/me (UserProfileRes). JWT 인증이 붙은 뒤로는 user_id를 서버가 토큰에서 읽는다.

export interface UserResponse {
  id: number
  name: string
  email: string
  hasMarketingOptIn: boolean
  /** 가입 후 한 번도 비밀번호를 바꾸지 않았으면 null. */
  passwordChangedAt: string | null
}

/** PATCH /users/me. 두 필드 모두 선택이고 null은 보내지 않는다(서버가 "생략 = 변경 안 함"으로 처리). */
export interface UpdateProfileRequest {
  /** 1~50자. */
  name?: string
  hasMarketingOptIn?: boolean
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

/** DELETE /users/me. 재인증용 현재 비밀번호 — 틀리면 400 INVALID_CURRENT_PASSWORD. */
export interface WithdrawUserRequest {
  password: string
}
