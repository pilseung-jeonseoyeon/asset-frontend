import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '../supabase'
import {
  postLogin,
  postLogout,
  postPasswordResetCode,
  postSignup,
  putPassword,
  resendSignupCode,
  verifySignupCode,
} from './auth.service'
import type {
  LoginRequest,
  ResendSignupCodeRequest,
  ResetPasswordRequest,
  SendPasswordResetCodeRequest,
  SignupRequest,
  VerifySignupCodeRequest,
} from './auth.type'

// 부팅 시 세션 복원은 대기 화면 지속 시간에 직결되므로, 이 시간이 지나면 먼저 손을 뗀다.
// 복원 자체는 취소하지 않는다 — 늦게라도 성공하면 applyRestoredSession이 반영해 준다(그때는 이미 로그인
// 화면이 떠 있고, 사용자가 그 사이 직접 로그인을 시작했다면 manualAuthPending이 덮어쓰기를 막는다).
const BOOT_REFRESH_GIVE_UP_MS = 3500

/**
 * 앱 부팅 시 한 번, 저장된 세션을 읽어 로그인 상태를 되찾는다(액세스 토큰이 만료돼 있으면 Supabase 가 갱신한다).
 * 저장된 세션이 없으면 로그인 화면으로 떨어진다. 그 뒤로는 Supabase 의 세션 이벤트(갱신·로그아웃)를 store 에 반영한다.
 */
export function useRestoreSession() {
  const status = useAuthStore((s) => s.status)
  const markAnonymous = useAuthStore((s) => s.markAnonymous)
  const applyRestoredSession = useAuthStore((s) => s.applyRestoredSession)
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    if (status !== 'unknown') return
    let cancelled = false
    const startedAtGeneration = useAuthStore.getState().authGeneration

    // 응답이 없어도 이 시간 안에 로그인 화면으로 떨어진다. sessionInvalid는 주지 않는다 —
    // 응답을 못 받은 것이지 세션이 없다고 확인된 게 아니므로 힌트를 남겨둬야 한다.
    const giveUpTimer = window.setTimeout(() => {
      if (!cancelled) markAnonymous()
    }, BOOT_REFRESH_GIVE_UP_MS)

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (data.session) {
          applyRestoredSession(data.session, startedAtGeneration)
          return
        }
        // 저장된 세션이 없다 = 이 브라우저엔 로그인이 없다고 확정. 갱신 오류(네트워크)는 "모름".
        markAnonymous({ sessionInvalid: !error })
      })
      .catch(() => {
        if (!cancelled) markAnonymous()
      })
      .finally(() => window.clearTimeout(giveUpTimer))

    return () => {
      cancelled = true
      window.clearTimeout(giveUpTimer)
    }
  }, [status, markAnonymous, applyRestoredSession])

  // Supabase 가 알려 오는 세션 변화. SIGNED_OUT 은 다른 탭의 로그아웃이나 갱신 실패(리프레시 토큰 무효)도 포함한다.
  // SIGNED_IN 은 수동 로그인·가입 코드 확인·비밀번호 재설정에서도 오는데, 그 구간은 manualAuthPending 이 막고
  // 완료 시점에 훅이 직접 signIn 한다. 콜백 안에서 Supabase 를 다시 부르지 않는다(교착 방지 권고).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (useAuthStore.getState().status === 'authenticated') signOut()
        return
      }
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
        applyRestoredSession(session, useAuthStore.getState().authGeneration)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [applyRestoredSession, signOut])

  return status
}

export function usePostLogin() {
  const signIn = useAuthStore((s) => s.signIn)
  const beginManualAuth = useAuthStore((s) => s.beginManualAuth)
  const endManualAuth = useAuthStore((s) => s.endManualAuth)
  const queryClient = useQueryClient()

  return useMutation({
    // 제출 순간부터 "사용자가 직접 시작한 로그인"으로 표시한다. 이 구간에 저장돼 있던 다른 세션이
    // 복원돼도 신원을 덮어쓰지 못한다(stores/auth.ts의 applyRestoredSession).
    mutationFn: (body: LoginRequest) => {
      beginManualAuth()
      return postLogin(body)
    },
    onSuccess: (session) => {
      signIn(session)
      // 이전 사용자의 캐시가 남아 있으면 안 된다.
      queryClient.clear()
    },
    onError: () => endManualAuth(),
  })
}

/**
 * 가입 2단계: 계정 생성 + 인증 코드 메일. 여기서부터 온보딩 완료(useCompleteSignupOnboarding)까지
 * manualAuthPending 을 세워 두어, 3단계 코드 확인으로 생긴 세션이 곧바로 앱을 열어 버리지 않게 한다
 * (온보딩 화면은 'anonymous' 상태에서 보여 준다 — 스프링 때와 같은 순서).
 */
export function usePostSignup() {
  const beginManualAuth = useAuthStore((s) => s.beginManualAuth)
  const endManualAuth = useAuthStore((s) => s.endManualAuth)
  return useMutation({
    mutationFn: (body: SignupRequest) => {
      beginManualAuth()
      return postSignup(body)
    },
    onError: () => endManualAuth(),
  })
}

/** 가입 3단계: 코드 확인. 돌려받은 세션은 SignupForm 이 들고 있다가 "모닛 시작하기"에서 로그인 상태로 올린다. */
export function useVerifySignupCode() {
  return useMutation({
    mutationFn: (body: VerifySignupCodeRequest) => verifySignupCode(body),
  })
}

export function useResendSignupCode() {
  return useMutation({
    mutationFn: (body: ResendSignupCodeRequest) => resendSignupCode(body),
  })
}

/** 온보딩(프로필 확인) 화면의 "모닛 시작하기" — 코드 확인으로 이미 받아둔 세션으로 실제 로그인 상태를 확정한다. */
export function useCompleteSignupOnboarding() {
  const signIn = useAuthStore((s) => s.signIn)
  const queryClient = useQueryClient()

  return (session: Session) => {
    signIn(session)
    queryClient.clear()
  }
}

export function usePostLogout() {
  const signOut = useAuthStore((s) => s.signOut)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: postLogout,
    // 서버 로그아웃이 실패해도 클라이언트 세션은 반드시 끊는다 — 로그아웃을 눌렀는데
    // 로그인 상태로 남아 있는 것이 더 위험하다.
    onSettled: () => {
      signOut()
      queryClient.clear()
    },
  })
}

export function usePostPasswordResetCode() {
  return useMutation({
    mutationFn: (body: SendPasswordResetCodeRequest) => postPasswordResetCode(body),
  })
}

/** 비밀번호 재설정. 코드 확인이 만드는 임시 세션이 앱을 열지 않도록 끝날 때까지 수동 인증 중으로 표시한다. */
export function usePutPassword() {
  const beginManualAuth = useAuthStore((s) => s.beginManualAuth)
  const endManualAuth = useAuthStore((s) => s.endManualAuth)
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => {
      beginManualAuth()
      return putPassword(body)
    },
    onSettled: () => endManualAuth(),
  })
}
