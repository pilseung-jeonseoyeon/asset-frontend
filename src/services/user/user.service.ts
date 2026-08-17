import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdateUserSettingsRequest,
  UserResponse,
  UserSettingsResponse,
  WithdrawUserRequest,
} from './user.type'

export async function getMe() {
  return unwrap(await api.get<ApiResponse<UserResponse>>('/users/me'))
}

/** 이름 · 마케팅 수신 동의를 부분 수정한다. 생략한 필드는 서버가 바꾸지 않는다. */
export async function patchMe(body: UpdateProfileRequest) {
  return unwrap(await api.patch<ApiResponse<UserResponse>>('/users/me', body))
}

/**
 * 회원 탈퇴. 비밀번호 재인증 필요(틀리면 400 INVALID_CURRENT_PASSWORD). 계정은 즉시 삭제되지
 * 않고 탈퇴일로부터 30일 뒤 영구 삭제되며, 유예 기간에는 로그인·토큰 갱신·동일 이메일 재가입이
 * 모두 막힌다(이미 탈퇴 처리된 계정이면 409 ALREADY_WITHDRAWN). 전 기기 세션은 즉시 폐기된다.
 * 204 No Content.
 */
export async function deleteMe(body: WithdrawUserRequest) {
  await api.delete('/users/me', { data: body })
}

export async function getUserSettings() {
  return unwrap(await api.get<ApiResponse<UserSettingsResponse>>('/users/me/settings'))
}

export async function patchUserSettings(body: UpdateUserSettingsRequest) {
  return unwrap(await api.patch<ApiResponse<UserSettingsResponse>>('/users/me/settings', body))
}

/** 로그인한 상태에서 현재 비밀번호를 확인하고 바꾼다. 204 No Content. */
export async function patchPassword(body: ChangePasswordRequest) {
  await api.patch('/users/me/password', body)
}
