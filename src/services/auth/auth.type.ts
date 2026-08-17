// 백엔드가 작업 도중 인증을 도입했다(JWT Bearer). 스키마는 서버의 OpenAPI 문서
// (GET http://localhost:8080/v3/api-docs)에서 확인한 것이며, secret/API-SPEC.md는 아직 인증이
// 없던 시점의 문서라 이 부분이 반영되어 있지 않다.

export interface TokenResponse {
  accessToken: string
  tokenType?: string
  /** 초 단위 만료 시간 */
  expiresIn?: number
}

export interface LoginRequest {
  email: string
  password: string
  /** 켜면 서버가 리프레시 쿠키를 더 길게 유지한다. */
  rememberMe?: boolean
}

export interface SendSignupCodeRequest {
  email: string
}

/** 서버 AgreementReq.code. TERMS_OF_SERVICE·PRIVACY_POLICY는 필수, MARKETING은 선택. */
export type AgreementCode = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY' | 'MARKETING'

export interface AgreementRequest {
  code: AgreementCode
  /** 화면이 실제로 보여준 약관 문서의 버전(최대 20자). */
  version: string
}

export interface SignupRequest {
  email: string
  /** 영문 + 숫자 + 특수문자를 각각 하나 이상 포함한 8자 이상 */
  password: string
  name: string
  /** 이메일로 받은 6자리 숫자 */
  code: string
  /**
   * 동의한 약관 목록. 필수(최소 1건)이며 TERMS_OF_SERVICE·PRIVACY_POLICY가 빠지면
   * 400 REQUIRED_AGREEMENT_MISSING. MARKETING이 들어 있으면 마케팅 수신 동의로 기록된다.
   */
  agreements: AgreementRequest[]
}

export interface SendPasswordResetCodeRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

/** 서버가 검증하는 비밀번호 규칙. 제출 전에 같은 조건으로 안내하기 위해 프론트에도 둔다. */
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/
export const PASSWORD_RULE_TEXT = '영문 · 숫자 · 특수문자를 모두 포함해 8자 이상'
