import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { refreshAccessToken } from '../api'
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
    refreshAccessToken().catch(() => {
      if (!cancelled) markAnonymous()
    })
    return () => {
      cancelled = true
    }
  }, [status, markAnonymous])

  return status
}

export function usePostLogin() {
  const signIn = useAuthStore((s) => s.signIn)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: LoginRequest) => postLogin(body),
    onSuccess: (token) => {
      signIn(token.accessToken)
      // 이전 사용자의 캐시가 남아 있으면 안 된다.
      queryClient.clear()
    },
  })
}

export function usePostSignupCode() {
  return useMutation({
    mutationFn: (body: SendSignupCodeRequest) => postSignupCode(body),
  })
}

/**
 * 회원가입 자체는 성공 시(가입 즉시 로그인 — API-SPEC §16.2) 서버가 이미 액세스 토큰과 refresh
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
