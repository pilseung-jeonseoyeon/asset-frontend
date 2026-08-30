import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { ApiError, refreshAccessToken } from '../api'
import {
  postLogin,
  postLogout,
  postPasswordResetCode,
  postSignup,
  postSignupCode,
  putPassword,
} from './auth.service'
import type {
  LoginRequest,
  ResetPasswordRequest,
  SendPasswordResetCodeRequest,
  SendSignupCodeRequest,
  SignupRequest,
} from './auth.type'

// 부팅 시 refresh는 대기 화면 지속 시간에 직결되므로, 일반 요청 타임아웃(10초, api.ts)을 다
// 기다리지 않고 이 시간이 지나면 먼저 손을 뗀다. refresh 요청 자체는 취소하지 않는다 — 늦게라도
// 성공하면 signInFromRestore가 반영해 준다(그때는 이미 로그인 화면이 떠 있고, 사용자가 그 사이
// 직접 로그인을 시작했다면 manualAuthPending이 덮어쓰기를 막는다).
const BOOT_REFRESH_GIVE_UP_MS = 3500

/** 서버가 "이 세션은 무효"라고 명확히 답했는가. 타임아웃·네트워크 오류·5xx는 여기 해당하지 않는다. */
function isSessionInvalid(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 401 || error.status === 403
}

/**
 * 앱 부팅 시 한 번, 리프레시 쿠키로 액세스 토큰을 되찾아온다.
 * 액세스 토큰을 메모리에만 두기 때문에(stores/auth.ts 참고) 새로고침하면 반드시 이 과정이 필요하다.
 * 쿠키가 없거나 만료됐으면 로그인 화면으로 떨어진다.
 */
export function useRestoreSession() {
  const status = useAuthStore((s) => s.status)
  const markAnonymous = useAuthStore((s) => s.markAnonymous)

  useEffect(() => {
    if (status !== 'unknown') return
    let cancelled = false

    // 서버가 답이 없어도 이 시간 안에 로그인 화면으로 떨어진다. sessionInvalid는 주지 않는다 —
    // 응답을 못 받은 것이지 세션이 무효라고 확인된 게 아니므로 힌트를 남겨둬야 한다.
    const giveUpTimer = window.setTimeout(() => {
      if (!cancelled) markAnonymous()
    }, BOOT_REFRESH_GIVE_UP_MS)

    refreshAccessToken()
      .catch((error: unknown) => {
        if (!cancelled) markAnonymous({ sessionInvalid: isSessionInvalid(error) })
      })
      .finally(() => window.clearTimeout(giveUpTimer))

    return () => {
      cancelled = true
      window.clearTimeout(giveUpTimer)
    }
  }, [status, markAnonymous])

  return status
}

export function usePostLogin() {
  const signIn = useAuthStore((s) => s.signIn)
  const beginManualAuth = useAuthStore((s) => s.beginManualAuth)
  const endManualAuth = useAuthStore((s) => s.endManualAuth)
  const queryClient = useQueryClient()

  return useMutation({
    // 제출 순간부터 "사용자가 직접 시작한 로그인"으로 표시한다. 이 구간에 백그라운드 refresh가
    // 예전 쿠키로 성공해도 신원을 덮어쓰지 못한다(stores/auth.ts의 signInFromRestore).
    mutationFn: (body: LoginRequest) => {
      beginManualAuth()
      return postLogin(body)
    },
    onSuccess: (token) => {
      signIn(token.accessToken)
      // 이전 사용자의 캐시가 남아 있으면 안 된다.
      queryClient.clear()
    },
    onError: () => endManualAuth(),
  })
}

export function usePostSignupCode() {
  return useMutation({
    mutationFn: (body: SendSignupCodeRequest) => postSignupCode(body),
  })
}

/**
 * 회원가입 자체는 성공 시(가입 즉시 로그인) 서버가 이미 액세스 토큰과 refresh
 * 쿠키를 내려주지만, 여기서 곧바로 signIn하지 않는다. 온보딩(프로필 확인) 화면을 authenticated
 * 상태가 된 "뒤"가 아니라 "직전"에 anonymous 상태로 보여주기 위해서다 — mutation이 돌려주는
 * accessToken은 SignupForm이 들고 있다가, 사용자가 "모닛 시작하기"를 눌렀을 때
 * useCompleteSignupOnboarding으로 넘겨 그제서야 signIn한다.
 */
export function usePostSignup() {
  return useMutation({
    mutationFn: (body: SignupRequest) => postSignup(body),
  })
}

/** 온보딩(프로필 확인) 화면의 "모닛 시작하기" — usePostSignup이 이미 받아둔 액세스 토큰으로
 * 실제 로그인 상태를 확정한다. */
export function useCompleteSignupOnboarding() {
  const signIn = useAuthStore((s) => s.signIn)
  const queryClient = useQueryClient()

  return (accessToken: string) => {
    signIn(accessToken)
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

export function usePutPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => putPassword(body),
  })
}
