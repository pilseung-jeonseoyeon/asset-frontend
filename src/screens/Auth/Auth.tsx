// 인증 화면의 두 단 껍데기 + 로그인/회원가입/비밀번호 재설정 라우터.
// 화면별 폼은 LoginForm/SignupForm/ResetPasswordForm으로 나눠, 각 요청·검증이 자기 마크업 옆에
// 있게 했다.
// 로고 SVG는 components/layout/MonitLogo.tsx와 같은 심볼이고(라이트/다크 전환도 base.css의
// .monit-logo-light/-dark로 동일) 크기만 인증 화면용 44px이다.
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
  const overlayGradientLight = `monit-ov-${uid}L`
  const clipPathLight = `monit-clip-${uid}L`
  const backgroundGradientDark = `monit-bg-${uid}D`
  const overlayGradientDark = `monit-ov-${uid}D`
  const clipPathDark = `monit-clip-${uid}D`

  return (
    <>
      <svg className="monit-logo-light" width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={overlayGradientLight} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipPathLight}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill="#2A2E5C" />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${overlayGradientLight})`} clipPath={`url(#${clipPathLight})`} />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
      </svg>
      <svg className="monit-logo-dark" width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={backgroundGradientDark} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3F75" />
            <stop offset="1" stopColor="#1E2359" />
          </linearGradient>
          <linearGradient id={overlayGradientDark} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipPathDark}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill={`url(#${backgroundGradientDark})`} />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${overlayGradientDark})`} clipPath={`url(#${clipPathDark})`} />
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
    <div className="full-height-center" style={{ display: 'flex', width: '100%', background: 'var(--canvas)' }}>
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

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // status-bar-style=black-translucent라 콘텐츠가 상태바 뒤까지 깔린다(index.html 주석) —
          // 폼이 화면보다 길어 위로 스크롤될 때 맨 위 줄이 시계·배터리 아이콘에 가리지 않게 한다.
          padding: 'calc(40px + env(safe-area-inset-top)) 28px 40px',
        }}
      >
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
