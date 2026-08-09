// Source: secret/Asset Manager v14.dc.html L512-544 (authLogin sc-if block) — layout/copy transcribed,
// wired to the real POST /auth/login instead of the source's no-op onClick stubs.
//
// Password is intentionally local useState, not AppState: AppState lives in a React Context that (a)
// every screen/modal reads via useAppState() and (b) persists for the life of the tab, so a plaintext
// password sitting there is one extra place it could leak from (devtools, an accidental console.log of
// state, a future "log state on error" helper). A local variable dies with this component/submit and
// never needs to be threaded through the reducer at all.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen } from '../../state/selectors/auth'
import { authInput, authInputPw, authPrimary, authPrimaryOff, checkBox, filterEmailInput, EMAIL_PATTERN } from './authFormStyles'
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
          placeholder="name@example.com"
          value={state.authEmail}
          onInput={filterEmailInput}
          onChange={(e) => setState({ authEmail: e.target.value })}
          style={authInput}
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
            placeholder="비밀번호 입력"
            value={password}
            onInput={(e) => {
              const target = e.target as HTMLInputElement
              target.value = target.value.replace(/[^\x21-\x7E]/g, '')
            }}
            onChange={(e) => setPassword(e.target.value)}
            style={authInputPw}
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
          <span style={checkBox(state.authKeepLogin)}>
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

      <button type="submit" className="pill-btn" disabled={!canSubmit} style={canSubmit ? authPrimary : authPrimaryOff}>
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
