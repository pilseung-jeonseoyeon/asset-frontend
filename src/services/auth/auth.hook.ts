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

export function usePostSignup() {
  const signIn = useAuthStore((s) => s.signIn)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: SignupRequest) => postSignup(body),
    onSuccess: (token) => {
      signIn(token.accessToken)
      queryClient.clear()
    },
  })
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
