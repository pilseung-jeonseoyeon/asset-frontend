// 로그인 폼. POST /auth/login에 연결돼 있다.
//
// 비밀번호는 의도적으로 AppState가 아니라 로컬 useState에 둔다: AppState는 (a) 모든 화면·모달이
// useAppState()로 읽고 (b) 탭이 살아 있는 동안 계속 남는 React Context라, 평문 비밀번호가 거기
// 있으면 새어나갈 통로가 하나 더 생긴다(devtools, 실수로 찍은 console.log, 나중에 누가 만들
// '에러 시 상태 덤프' 헬퍼). 로컬 변수는 이 컴포넌트와 함께 사라지고 리듀서를 거칠 일도 없다.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen } from '../../state/selectors/auth'
import { authInputStyle, authPasswordInputStyle, authPrimaryButtonStyle, authPrimaryButtonDisabledStyle, checkboxStyle, filterEmailInput, EMAIL_PATTERN } from './authFormStyles'
import { usePostLogin } from '@/services/auth'

export function LoginForm() {
  const { state, setState } = useAppState()
  const goAuthScreen = useGoAuthScreen()
  const loginMutation = usePostLogin()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const canSubmit = state.authEmail.trim() !== '' && password !== '' && !loginMutation.isPending
  const errorMessage = validationError ?? loginMutation.error?.message ?? null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_PATTERN.test(state.authEmail)) {
      setValidationError('올바른 이메일 형식을 입력해 주세요.')
      return
    }
    if (!password) {
      setValidationError('비밀번호를 입력해 주세요.')
      return
    }
    setValidationError(null)
    loginMutation.mutate({ email: state.authEmail, password, rememberMe: state.authKeepLogin })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '34px 32px' }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>로그인</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginBottom: 26 }}>모닛 계정으로 계속하기</div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
          이메일
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="name@example.com"
          value={state.authEmail}
          onInput={filterEmailInput}
          onChange={(e) => setState({ authEmail: e.target.value })}
          style={authInputStyle}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label htmlFor="login-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
          비밀번호
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            value={password}
            onInput={(e) => {
              const target = e.target as HTMLInputElement
              target.value = target.value.replace(/[^\x21-\x7E]/g, '')
            }}
            onChange={(e) => setPassword(e.target.value)}
            style={authPasswordInputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 46, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={19} color="var(--text-weak)" />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <button
          type="button"
          onClick={() => setState({ authKeepLogin: !state.authKeepLogin })}
          aria-pressed={state.authKeepLogin}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span style={checkboxStyle(state.authKeepLogin)}>
            <Icon name="check" size={14} />
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>로그인 상태 유지</span>
        </button>
        <button
          type="button"
          onClick={() => goAuthScreen('resetPassword')}
          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          비밀번호 찾기
        </button>
      </div>

      {errorMessage && (
        <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
          {errorMessage}
        </div>
      )}

      <button type="submit" className="pill-btn" disabled={!canSubmit} style={canSubmit ? authPrimaryButtonStyle : authPrimaryButtonDisabledStyle}>
        {loginMutation.isPending ? '로그인하는 중…' : '로그인'}
      </button>

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text-weak)' }}>
        아직 계정이 없으신가요?
        <button
          type="button"
          onClick={() => goAuthScreen('signup')}
          style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }}
        >
          회원가입
        </button>
      </div>
    </form>
  )
}
