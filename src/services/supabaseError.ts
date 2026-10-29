// Supabase 오류(PostgREST · Auth · Edge Function · 네트워크)를 기존 ApiError(code, message, status) 로 바꾼다.
// 원칙: 3단계 RPC·트리거는 `raise exception '<코드>'` 라 PostgrestError.message 가 곧 코드다. Auth 는 Supabase 코드를
// 스프링 코드로 옮긴다(화면이 그 코드로 분기한다). 문구는 errorMessages 의 사전이 정본.
import { AuthError, FunctionsFetchError, FunctionsHttpError, FunctionsRelayError, type PostgrestError } from '@supabase/supabase-js'
import { ApiError } from './api'
import { errorMessageOf, errorStatusOf } from './errorMessages'

const CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/

/** Supabase Auth 오류 코드 → 스프링 코드 (화면의 분기 이름을 유지하기 위해) */
const AUTH_CODE_MAP: Record<string, string> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  user_banned: 'WITHDRAWN_ACCOUNT',
  email_exists: 'DUPLICATE_EMAIL',
  user_already_exists: 'DUPLICATE_EMAIL',
  otp_expired: 'INVALID_VERIFICATION_CODE',
  otp_disabled: 'INVALID_VERIFICATION_CODE',
  over_email_send_rate_limit: 'VERIFICATION_CODE_SEND_LIMIT_EXCEEDED',
  over_request_rate_limit: 'TOO_MANY_REQUESTS',
  over_sms_send_rate_limit: 'TOO_MANY_REQUESTS',
  weak_password: 'PASSWORD_POLICY',
  same_password: 'SAME_PASSWORD',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  session_not_found: 'UNAUTHENTICATED',
  session_expired: 'UNAUTHENTICATED',
  refresh_token_not_found: 'UNAUTHENTICATED',
  refresh_token_already_used: 'UNAUTHENTICATED',
  user_not_found: 'USER_NOT_FOUND',
  validation_failed: 'INVALID_INPUT',
  bad_json: 'INVALID_INPUT',
  reauthentication_needed: 'INVALID_CURRENT_PASSWORD',
}

/** PostgreSQL SQLSTATE → 코드 (3단계 함수가 코드를 메시지에 싣지 않은 경우만) */
const SQLSTATE_MAP: Record<string, string> = {
  '23505': 'DUPLICATE',
  '23503': 'INVALID_INPUT',
  '23514': 'INVALID_INPUT',
  '22P02': 'INVALID_INPUT',
  '42501': 'FORBIDDEN',
  PGRST116: 'NOT_FOUND',
  PGRST301: 'UNAUTHENTICATED',
}

function build(code: string, message?: string, status?: number): ApiError {
  return new ApiError(code, errorMessageOf(code, message), status ?? errorStatusOf(code))
}

function isPostgrestError(e: unknown): e is PostgrestError {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e && 'details' in e && 'hint' in e
}

/** PostgREST·Auth·네트워크 오류 → ApiError (동기). Edge Function 오류는 fromFunctionsError 로. */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof AuthError) {
    const code = AUTH_CODE_MAP[e.code ?? ''] ?? (e.status && e.status >= 500 ? 'DB_ERROR' : 'INVALID_INPUT')
    return build(code, undefined, e.status ?? errorStatusOf(code))
  }
  if (isPostgrestError(e)) {
    if (CODE_PATTERN.test(e.message)) return build(e.message)
    const code = SQLSTATE_MAP[e.code] ?? (e.code?.startsWith('PGRST') ? 'DB_ERROR' : 'DB_ERROR')
    return build(code)
  }
  if (e instanceof TypeError && /fetch|network|Load failed/i.test(e.message)) return build('NETWORK_ERROR')
  if (e instanceof Error) return build('DB_ERROR', e.message)
  return build('DB_ERROR')
}

/** Edge Function 오류 → ApiError. 본문 { error: { code, message } } 를 읽어야 하므로 비동기 */
export async function fromFunctionsError(e: unknown): Promise<ApiError> {
  if (e instanceof FunctionsHttpError) {
    let payload: { error?: { code?: string; message?: string } } | null = null
    try {
      payload = await e.context.json()
    } catch {
      payload = null
    }
    const code = payload?.error?.code ?? (e.context.status === 401 ? 'UNAUTHENTICATED' : 'DB_ERROR')
    return build(code, payload?.error?.message, e.context.status)
  }
  if (e instanceof FunctionsRelayError) return build('DB_ERROR', e.message, 502)
  if (e instanceof FunctionsFetchError) return build('NETWORK_ERROR')
  return toApiError(e)
}
