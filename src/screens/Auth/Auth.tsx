// Source: secret/Asset Manager v14.dc.html L457-509 (brand aside), L695-699 (footer + outer shell).
// The per-screen sc-if blocks (L513-693) are split into LoginForm/SignupForm/ResetPasswordForm so each
// mutation/validation lives next to its own markup instead of one giant switch — this file only owns
// the two-pane shell and the login/signup/resetPassword router.
// Logo SVG mirrors components/layout/MonitLogo.tsx (same light/dark swap via CSS class, see
// base.css .monit-logo-light/-dark) at the source's 44px auth size instead of the sidebar's 40px.
// 도형은 secret/monit-symbol-spec.md §3-1/§3-2 규격 그대로이고, 그라데이션·clipPath id는
// useId()로 인스턴스마다 고유하게 만든다(규격 §4 — id가 겹치면 그라데이션이 깨진다).

import { useId, useLayoutEffect } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen } from '../../state/selectors/auth'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'
import { ResetPasswordForm } from './ResetPasswordForm'

const BRAND_POINTS: { icon: string; label: string }[] = [
  { icon: 'account_balance_wallet', label: '흩어진 계좌를 한 곳에서 확인' },
  { icon: 'flag', label: '월간 · 연간 목표까지 남은 거리 계산' },
  { icon: 'group', label: '개인 자산과 공유 자산을 따로 (준비 중)' },
]

function AuthLogo() {
  // useId()가 돌려주는 «r0» 같은 특수문자를 빼야 url(#…) 참조가 안전하다.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ovL = `monit-ov-${uid}L`
  const clipL = `monit-clip-${uid}L`
  const bgD = `monit-bg-${uid}D`
  const ovD = `monit-ov-${uid}D`
  const clipD = `monit-clip-${uid}D`

  return (
    <>
      <svg className="monit-logo-light" width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={ovL} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipL}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill="#2A2E5C" />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${ovL})`} clipPath={`url(#${clipL})`} />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
      </svg>
      <svg className="monit-logo-dark" width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={bgD} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3F75" />
            <stop offset="1" stopColor="#1E2359" />
          </linearGradient>
          <linearGradient id={ovD} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipD}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill={`url(#${bgD})`} />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${ovD})`} clipPath={`url(#${clipD})`} />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
        <rect x=".5" y=".5" width="99" height="99" rx="23.76" ry="23.76" fill="none" stroke="#FFFFFF" strokeOpacity=".08" strokeWidth="1" />
      </svg>
    </>
  )
}

export function Auth() {
  const { state } = useAppState()
  const goAuthScreen = useGoAuthScreen()

  // AppShell only mounts this component when authStatus flips to 'anonymous' — both on manual
  // logout (AccountModal's doLogout) and on the axios interceptor's forced signOut() after a
  // failed token refresh (services/api.ts). AppStateProvider lives above AppShell, so authScreen/
  // authStep from a previous session (e.g. mid-signup 'onboard') would otherwise still be sitting
  // there and this component would render whatever step the user was last on instead of the login
  // form. Reset once on mount so every anonymous session always starts at login. Auth stays mounted
  // for the whole login/signup/resetPassword flow (AppShell doesn't unmount it between those), so
  // this never fires mid-flow — only when a fresh 'anonymous' status first mounts Auth.
  // useEffect가 아니라 useLayoutEffect인 이유: useEffect는 페인트 "후"에 돌아서, 로그아웃 직후
  // 한 프레임 동안 이전 세션의 화면(예: 온보딩 "프로필을 확인해 주세요")이 그대로 보였다가
  // 로그인 폼으로 바뀐다. 페인트 전에 리셋해서 그 깜빡임을 없앤다.
  useLayoutEffect(() => {
    goAuthScreen('login')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount only
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--canvas)' }}>
      <aside className="auth-brand" style={{ width: '42%', maxWidth: 520, flex: 'none', padding: 18, display: 'flex' }}>
        <div
          className="deep-card"
          style={{
            flex: 1,
            background: 'var(--deep-bg)',
            borderRadius: 10,
            padding: '52px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <AuthLogo />
            <div
              style={{
                marginTop: 32,
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--deep-value)',
                lineHeight: 1.36,
              }}
            >
              모으는 흐름이
              <br />
              보이기 시작합니다
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--deep-label)', lineHeight: 1.75 }}>
              자산 · 주식 · 가계부를 한 화면에서.
              <br />
              모닛이 매달의 변화를 대신 계산합니다.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {BRAND_POINTS.map((point) => (
              <div key={point.icon} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'var(--deep-chip)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <Icon name={point.icon} size={18} color="var(--deep-value)" />
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--deep-label)' }}>{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 28px' }}>
        <div style={{ width: '100%', maxWidth: 404 }}>
          {state.authScreen === 'login' && <LoginForm />}
          {state.authScreen === 'signup' && <SignupForm />}
          {state.authScreen === 'resetPassword' && <ResetPasswordForm />}

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-weak)', lineHeight: 1.7 }}>
            이용약관 · 개인정보처리방침
            <br />© Monit
          </div>
        </div>
      </main>
    </div>
  )
}
