import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UpdateUserSettingsRequest,
  UserResponse,
  UserSettingsResponse,
} from './user.type'

export async function getMe() {
  return unwrap(await api.get<ApiResponse<UserResponse>>('/users/me'))
}

/** 이름 · 마케팅 수신 동의를 부분 수정한다. 생략한 필드는 서버가 바꾸지 않는다. */
export async function patchMe(body: UpdateProfileRequest) {
  return unwrap(await api.patch<ApiResponse<UserResponse>>('/users/me', body))
}

/** 회원 탈퇴. 계정과 소유 데이터를 모두 삭제한다(복구 불가). 204 No Content. */
export async function deleteMe() {
  await api.delete('/users/me')
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
