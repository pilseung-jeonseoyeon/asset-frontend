import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  LoginRequest,
  ResetPasswordRequest,
  SendPasswordResetCodeRequest,
  SendSignupCodeRequest,
  SignupRequest,
  TokenResponse,
} from './auth.type'

export async function postLogin(body: LoginRequest) {
  return unwrap(await api.post<ApiResponse<TokenResponse>>('/auth/login', body))
}

/** 가입 인증 코드 발송. 204 No Content. */
export async function postSignupCode(body: SendSignupCodeRequest) {
  await api.post('/auth/signup/code', body)
}

export async function postSignup(body: SignupRequest) {
  return unwrap(await api.post<ApiResponse<TokenResponse>>('/auth/signup', body))
}

/** 204 No Content. 서버가 리프레시 쿠키를 지운다. */
export async function postLogout() {
  await api.post('/auth/logout')
}

/** 비밀번호 재설정 코드 발송. 204 No Content. */
export async function postPasswordResetCode(body: SendPasswordResetCodeRequest) {
  await api.post('/auth/password/code', body)
}

/** 비밀번호 재설정. 204 No Content. */
export async function putPassword(body: ResetPasswordRequest) {
  await api.put('/auth/password', body)
}
