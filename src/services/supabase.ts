// Supabase 클라이언트 하나와 호출 래퍼. 화면·훅은 이 파일을 직접 쓰지 않고 각 도메인 service 가 쓴다.
//
// 세션 저장: rememberMe 가 꺼져 있으면 sessionStorage(앱·탭을 닫으면 풀림), 켜져 있으면 localStorage.
// 스프링의 httpOnly 리프레시 쿠키보다 XSS 에 약한 구조라, 데스크톱 앱은 외부 스크립트 없이 CSP 로 잠근다(스펙 5.8).
import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import { fromFunctionsError, toApiError } from './supabaseError'

const url = import.meta.env.VITE_SUPABASE_URL
// 공개 키(Publishable · sb_publishable_…). 2026-10-31 이름을 VITE_SUPABASE_PUBLIC_KEY 로 바꿨고, 이미 만들어 둔
// .env.local 이 깨지지 않게 옛 이름(VITE_SUPABASE_ANON_KEY)도 잠시 같이 읽는다.
const publicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !publicKey) {
  // 개발 중 .env.local 이 없을 때 조용히 깨지지 않도록 바로 알린다
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLIC_KEY 가 비어 있어요. .env.local 을 확인해 주세요.')
}

const REMEMBER_KEY = 'monit.rememberMe'

export function setRememberMe(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // 저장소 접근 불가(프라이빗 모드 등)면 기본값(유지)으로 동작한다
  }
}

function shouldPersist(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

/** 로그인 유지 여부에 따라 localStorage/sessionStorage 를 고르는 저장소. 읽기는 둘 다 본다. */
export const sessionAwareStorage: SupportedStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      if (shouldPersist()) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
        window.localStorage.removeItem(key)
      }
    } catch {
      // 무시 — 세션은 메모리에만 남고 새로고침하면 로그인 화면으로 간다
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export const supabase = createClient(url, publicKey, {
  auth: {
    storage: sessionAwareStorage,
    flowType: 'pkce',
    detectSessionInUrl: false,
    autoRefreshToken: true,
    persistSession: true,
  },
})

/** 로그인한 사용자 id(uuid). 세션이 없으면 UNAUTHENTICATED. 네트워크를 타지 않는다(저장된 세션). */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw toApiError({ name: 'AuthError', code: 'session_not_found', message: 'no session', status: 401 })
  return id
}

/** PostgREST 결과 { data, error } 를 풀어 준다. error 면 ApiError 로 던진다. */
export function unwrapResult<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toApiError(result.error)
  return result.data as T
}

/** DB 함수(RPC) 호출. 응답은 함수가 만든 camelCase jsonb 그대로. */
export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toApiError(error)
  return data as T
}

/** Edge Function 호출. 오류 본문 { error: { code, message } } 를 ApiError 로. */
export async function invoke<T>(name: string, options: { body?: Record<string, unknown>; method?: 'GET' | 'POST' } = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: options.body,
    method: options.method ?? 'POST',
  })
  if (error) throw await fromFunctionsError(error)
  return data as T
}
