// 인증은 Supabase Auth(이메일 + 비밀번호, 6자리 코드 메일)다. 화면 흐름은 스프링 때와 같다:
// 로그인 / 회원가입 4단계(약관 → 정보 → 코드 → 온보딩) / 비밀번호 찾기(코드).
// 세션 객체(@supabase/supabase-js 의 Session)는 이 레이어 밖으로 토큰을 꺼내지 않고 stores/auth.ts 에 userId 만 올린다.

export interface LoginRequest {
  email: string
  password: string
  /** 켜면 세션을 localStorage 에 두어 앱·탭을 닫아도 유지한다. 끄면 sessionStorage(닫으면 풀림). */
  rememberMe?: boolean
}

/** 서버 AgreementReq.code. TERMS_OF_SERVICE·PRIVACY_POLICY는 필수, MARKETING은 선택. */
export type AgreementCode = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING'

export interface AgreementRequest {
  code: AgreementCode
  /** 화면이 실제로 보여준 약관 문서의 버전(최대 20자). */
  version: string
}

/** 가입 2단계 — 계정을 만들고 6자리 인증 코드 메일을 보낸다(auth.signUp). 코드 확인은 VerifySignupCodeRequest. */
export interface SignupRequest {
  email: string
  /** 영문 + 숫자 + 특수문자를 각각 하나 이상 포함한 8자 이상 */
  password: string
  name: string
  /**
   * 동의한 약관 목록. TERMS_OF_SERVICE·PRIVACY_POLICY 가 빠지면 화면이 2단계로 보내지 않는다.
   * MARKETING 이 들어 있으면 마케팅 수신 동의로 기록된다(가입 트리거 handle_new_user 가 user_agreements 에 적는다).
   */
  agreements: AgreementRequest[]
}

/** 가입 3단계 — 메일로 받은 6자리 코드 확인(auth.verifyOtp type 'signup'). 성공하면 세션이 생긴다. */
export interface VerifySignupCodeRequest {
  email: string
  code: string
}

export interface ResendSignupCodeRequest {
  email: string
}

export interface SendPasswordResetCodeRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

/** 서버가 검증하는 비밀번호 규칙. 제출 전에 같은 조건으로 안내하기 위해 프론트에도 둔다(Supabase 는 최소 8자만 본다). */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/
export const PASSWORD_RULE_TEXT = '영문 · 숫자 · 특수문자를 모두 포함해 8자 이상'
