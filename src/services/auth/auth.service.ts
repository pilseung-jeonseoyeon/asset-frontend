import type { Session } from '@supabase/supabase-js'
import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { setRememberMe, supabase } from '../supabase'
import { toApiError } from '../supabaseError'
import type {
  LoginRequest,
  ResendSignupCodeRequest,
  ResetPasswordRequest,
  SendPasswordResetCodeRequest,
  SignupRequest,
  VerifySignupCodeRequest,
} from './auth.type'

/** 이메일 + 비밀번호 로그인. rememberMe 에 따라 세션 저장소를 고른 뒤 로그인한다(저장 위치는 로그인 순간에 정해진다). */
export async function postLogin(body: LoginRequest): Promise<Session> {
  setRememberMe(body.rememberMe ?? false)
  const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
  if (error) throw toApiError(error)
  if (!data.session) throw new ApiError('UNAUTHENTICATED', errorMessageOf('UNAUTHENTICATED'), 401)
  return data.session
}

/**
 * 가입 2단계: 계정을 만들고 6자리 인증 코드 메일을 보낸다. 이름·약관 동의는 메타데이터로 실어 보내면
 * 가입 트리거(handle_new_user)가 프로필·설정·기본 소분류·동의 이력을 만든다.
 * 이미 가입된 이메일이면 Supabase 는 가입 여부가 새어 나가지 않도록 빈 identities 의 사용자를 돌려주고 메일을 보내지 않는다
 * — 그 경우를 스프링과 같은 DUPLICATE_EMAIL 로 바꾼다(가입 화면이 이 코드로 안내한다).
 */
export async function postSignup(body: SignupRequest): Promise<void> {
  setRememberMe(true)
  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        name: body.name,
        agreements: body.agreements.map((a) => ({ code: a.code, version: a.version, agreed: true })),
      },
    },
  })
  if (error) throw toApiError(error)
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    throw new ApiError('DUPLICATE_EMAIL', errorMessageOf('DUPLICATE_EMAIL'), 409)
  }
}

/** 가입 3단계: 메일의 6자리 코드 확인. 성공하면 세션이 생기지만 로그인 상태로 올리는 건 온보딩의 "모닛 시작하기"다. */
export async function verifySignupCode(body: VerifySignupCodeRequest): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({ email: body.email, token: body.code, type: 'signup' })
  if (error) throw toApiError(error)
  if (!data.session) throw new ApiError('INVALID_VERIFICATION_CODE', errorMessageOf('INVALID_VERIFICATION_CODE'), 400)
  return data.session
}

/** 가입 인증 코드 재발송. */
export async function resendSignupCode(body: ResendSignupCodeRequest): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email: body.email })
  if (error) throw toApiError(error)
}

/** 이 기기의 세션만 끊는다. 서버 쪽 리프레시 토큰도 함께 폐기된다. */
export async function postLogout(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw toApiError(error)
}

/** 비밀번호 재설정 코드 발송. 가입 여부는 알려 주지 않는다(미가입 이메일도 조용히 성공). */
export async function postPasswordResetCode(body: SendPasswordResetCodeRequest): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(body.email)
  if (error) throw toApiError(error)
}

/**
 * 비밀번호 재설정: 코드 확인(임시 세션) → 새 비밀번호 저장 → 임시 세션 종료.
 * 스프링처럼 재설정 뒤 로그인 화면으로 돌려보낸다(임시 세션은 남기지 않는다).
 */
export async function putPassword(body: ResetPasswordRequest): Promise<void> {
  const { error: verifyError } = await supabase.auth.verifyOtp({ email: body.email, token: body.code, type: 'recovery' })
  if (verifyError) throw toApiError(verifyError)
  try {
    const { error } = await supabase.auth.updateUser({ password: body.newPassword })
    if (error) throw toApiError(error)
  } finally {
    await supabase.auth.signOut({ scope: 'local' })
  }
}
