import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  ChangePasswordRequest,
  UpdateUserSettingsRequest,
  UserResponse,
  UserSettingsResponse,
} from './user.type'

export async function getMe() {
  return unwrap(await api.get<ApiResponse<UserResponse>>('/users/me'))
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
