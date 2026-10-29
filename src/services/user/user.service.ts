import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, invoke, rpc, supabase, unwrapResult } from '../supabase'
import { toApiError } from '../supabaseError'
import { TERMS_VERSION } from '../../data/termsContent'
import type {
  ChangePasswordRequest,
  SettlementPeriodResponse,
  UpdateProfileRequest,
  UpdateUserSettingsRequest,
  UserResponse,
  UserSettingsResponse,
  WithdrawUserRequest,
} from './user.type'

// ---------- 프로필 (profiles + user_agreements) ----------

interface ProfileRow {
  id: string
  name: string
  email: string
  password_changed_at: string | null
}

/** 내 정보. 마케팅 수신 동의는 user_agreements 의 MARKETING 최신 행(append-only 이력)이다. */
export async function getMe(): Promise<UserResponse> {
  const uid = await currentUserId()
  const profile = unwrapResult(
    await supabase.from('profiles').select('id, name, email, password_changed_at').eq('id', uid).single<ProfileRow>(),
  )
  const marketing = unwrapResult(
    await supabase
      .from('user_agreements')
      .select('is_agreed')
      .eq('user_id', uid)
      .eq('code', 'MARKETING')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle<{ is_agreed: boolean }>(),
  )
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    hasMarketingOptIn: marketing?.is_agreed ?? false,
    passwordChangedAt: profile.password_changed_at,
  }
}

/** 이름 · 마케팅 수신 동의를 부분 수정한다. 생략한 필드는 바꾸지 않는다. 동의 변경은 이력 한 줄을 더한다. */
export async function patchMe(body: UpdateProfileRequest): Promise<UserResponse> {
  const uid = await currentUserId()
  if (body.name !== undefined) {
    unwrapResult(await supabase.from('profiles').update({ name: body.name }).eq('id', uid).select('id').single())
  }
  if (body.hasMarketingOptIn !== undefined) {
    unwrapResult(
      await supabase
        .from('user_agreements')
        .insert({ user_id: uid, code: 'MARKETING', version: TERMS_VERSION, is_agreed: body.hasMarketingOptIn })
        .select('id')
        .single(),
    )
  }
  return getMe()
}

/** 현재 비밀번호를 다시 넣어 본인 확인한다. 틀리면 INVALID_CURRENT_PASSWORD(스프링과 같은 코드). */
async function reauthenticate(password: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const email = data.session?.user.email
  if (!email) throw new ApiError('UNAUTHENTICATED', errorMessageOf('UNAUTHENTICATED'), 401)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const mapped = toApiError(error)
    if (mapped.code === 'INVALID_CREDENTIALS') {
      throw new ApiError('INVALID_CURRENT_PASSWORD', errorMessageOf('INVALID_CURRENT_PASSWORD'), 400)
    }
    throw mapped
  }
}

/**
 * 회원 탈퇴. 비밀번호 재인증 필요(틀리면 INVALID_CURRENT_PASSWORD). 계정은 즉시 삭제되지 않고
 * 탈퇴일로부터 30일 뒤 배치가 영구 삭제하며, 유예 기간에는 로그인이 막힌다(Edge Function 'withdraw' 가
 * 프로필을 탈퇴 처리하고 Auth 계정을 차단한 뒤 전 기기 세션을 끊는다). 성공하면 이 기기 세션도 정리한다.
 */
export async function deleteMe(body: WithdrawUserRequest): Promise<void> {
  await reauthenticate(body.password)
  await invoke<{ ok: boolean }>('withdraw')
  await supabase.auth.signOut({ scope: 'local' })
}

// ---------- 설정 (user_settings) ----------

interface UserSettingsRow {
  base_currency: UserSettingsResponse['baseCurrency']
  month_start_day: number
  foreign_exchange_auto_refresh: boolean
  dday_notify_enabled: boolean
  dday_notify_days: number
  theme: UserSettingsResponse['theme']
}

const SETTINGS_COLUMNS = 'base_currency, month_start_day, foreign_exchange_auto_refresh, dday_notify_enabled, dday_notify_days, theme'

function toSettings(row: UserSettingsRow): UserSettingsResponse {
  return {
    baseCurrency: row.base_currency,
    monthStartDay: row.month_start_day,
    fxAutoRefresh: row.foreign_exchange_auto_refresh,
    ddayNotifyEnabled: row.dday_notify_enabled,
    ddayNotifyDays: row.dday_notify_days,
    theme: row.theme,
  }
}

export async function getUserSettings(): Promise<UserSettingsResponse> {
  const uid = await currentUserId()
  const row = unwrapResult(await supabase.from('user_settings').select(SETTINGS_COLUMNS).eq('user_id', uid).single<UserSettingsRow>())
  return toSettings(row)
}

export async function patchUserSettings(body: UpdateUserSettingsRequest): Promise<UserSettingsResponse> {
  const uid = await currentUserId()
  const patch: Partial<UserSettingsRow> = {}
  if (body.baseCurrency !== undefined) patch.base_currency = body.baseCurrency
  if (body.monthStartDay !== undefined) patch.month_start_day = body.monthStartDay
  if (body.fxAutoRefresh !== undefined) patch.foreign_exchange_auto_refresh = body.fxAutoRefresh
  if (body.ddayNotifyEnabled !== undefined) patch.dday_notify_enabled = body.ddayNotifyEnabled
  if (body.ddayNotifyDays !== undefined) patch.dday_notify_days = body.ddayNotifyDays
  if (body.theme !== undefined) patch.theme = body.theme
  const row = unwrapResult(
    await supabase.from('user_settings').update(patch).eq('user_id', uid).select(SETTINGS_COLUMNS).single<UserSettingsRow>(),
  )
  return toSettings(row)
}

/** 오늘이 속한 정산월의 경계. "이번 달"은 반드시 이 응답의 year·month로 잡는다(정산월 시작일이 오늘 이후일 수 있다). */
export async function getCurrentSettlement(): Promise<SettlementPeriodResponse> {
  return rpc<SettlementPeriodResponse>('get_current_settlement')
}

/** 로그인한 상태에서 현재 비밀번호를 확인하고 바꾼다. 바꾼 시각은 profiles.password_changed_at 에 남긴다. */
export async function patchPassword(body: ChangePasswordRequest): Promise<void> {
  await reauthenticate(body.currentPassword)
  const { error } = await supabase.auth.updateUser({ password: body.newPassword })
  if (error) throw toApiError(error)
  const uid = await currentUserId()
  unwrapResult(await supabase.from('profiles').update({ password_changed_at: new Date().toISOString() }).eq('id', uid).select('id').single())
}
