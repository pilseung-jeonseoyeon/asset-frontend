// Source: secret/Asset Manager v14.dc.html L546-621 (authTerms/authSignup/authVerify sc-if blocks).
// The source splits this into 3 screens (약관 동의 → 정보 입력 → 이메일 인증) because it's a UI
// prototype with no real backend — L618's "인증 메일 받기" button just flips to a 3rd static screen,
// it never actually sends anything, so the source never had to solve "what do I do with a code that
// hasn't been requested yet". The real POST /auth/signup contract needs email+code+name+password
// together in one call (secret/API-SPEC has no auth endpoints at all — this shape is from the OpenAPI
// doc; see auth.type.ts header comment). So this port collapses to 2 steps on one screen (matching the
// task's explicit instruction): email → "인증코드 받기", then code+name+password+동의 revealed
// in place → 가입. The terms-agreement screen (L546-580) is dropped — there's no /auth/signup field
// for individual terms flags in the real contract, and re-adding a stub agree-checkbox screen with
// nothing behind it would be UI for its own sake.
//
// Password/passwordConfirm are local useState — see LoginForm.tsx header comment for why.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen, useMarkAuthCodeSent } from '../../state/selectors/auth'
import { CodeInput } from './CodeInput'
import { useResendCooldown } from './useResendCooldown'
import { authInput, authPrimary, authPrimaryOff, checkBox, filterEmailInput, filterPwInput, EMAIL_PATTERN } from './authFormStyles'
import { usePostSignup, usePostSignupCode, PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/services/auth'

const NAME_MAX = 50

export function SignupForm() {
  const { state, setState } = useAppState()
  const goAuthScreen = useGoAuthScreen()
  const markCodeSent = useMarkAuthCodeSent()
  const codeMutation = usePostSignupCode()
  const signupMutation = usePostSignup()
  const resendCooldown = useResendCooldown(state.authCodeSentAt)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isSent = state.authStep === 'sent'
  const emailValid = EMAIL_PATTERN.test(state.authEmail)

  function handleSendCode(e: FormEvent) {
    e.preventDefault()
    if (!emailValid) {
      setValidationError('올바른 이메일 형식을 입력해 주세요.')
      return
    }
    setValidationError(null)
    codeMutation.mutate({ email: state.authEmail }, { onSuccess: markCodeSent })
  }

  function handleResend() {
    if (resendCooldown > 0 || codeMutation.isPending) return
    codeMutation.mutate({ email: state.authEmail }, { onSuccess: markCodeSent })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (state.authCode.length !== 6) {
      setValidationError('인증 코드 6자리를 입력해 주세요.')
      return
    }
    if (!state.authName.trim()) {
      setValidationError('이름을 입력해 주세요.')
      return
    }
    if (!PASSWORD_PATTERN.test(password)) {
      setValidationError(PASSWORD_RULE_TEXT)
      return
    }
    if (password !== passwordConfirm) {
      setValidationError('비밀번호가 서로 일치하지 않아요.')
      return
    }
    setValidationError(null)
    signupMutation.mutate({
      email: state.authEmail,
      code: state.authCode,
      name: state.authName.trim(),
      password,
      hasMarketingOptIn: state.authMarketingOptIn,
    })
  }

  const errorMessage =
    validationError ?? (isSent ? signupMutation.error?.message : codeMutation.error?.message) ?? null

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '34px 32px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
        <span style={{ flex: 1, height: 3, borderRadius: 999, background: 'var(--accent)' }} />
        <span style={{ flex: 1, height: 3, borderRadius: 999, background: isSent ? 'var(--accent)' : 'var(--border)' }} />
      </div>

      {!isSent ? (
        <form onSubmit={handleSendCode}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>이메일로 시작하기</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginBottom: 22 }}>인증 코드를 받을 이메일을 입력해 주세요.</div>

          <div style={{ marginBottom: 22 }}>
            <label htmlFor="signup-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              이메일
            </label>
            <input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={state.authEmail}
              onInput={filterEmailInput}
              onChange={(e) => setState({ authEmail: e.target.value })}
              style={authInput}
            />
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="pill-btn" disabled={!emailValid || codeMutation.isPending} style={emailValid && !codeMutation.isPending ? authPrimary : authPrimaryOff}>
            {codeMutation.isPending ? '코드 보내는 중…' : '인증코드 받기'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>계정 정보를 입력해 주세요</div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginBottom: 8 }}>
            {state.authEmail}
            <button
              type="button"
              onClick={() => setState({ authStep: 'form', authCode: '', authCodeSentAt: null })}
              style={{ border: 'none', background: 'transparent', padding: 0, marginLeft: 8, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              이메일 수정
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 16 }}>메일로 6자리 코드를 보냈어요.</div>

          <CodeInput value={state.authCode} onChange={(code) => setState({ authCode: code })} disabled={signupMutation.isPending} />

          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 20 }}>
            코드를 받지 못하셨나요?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || codeMutation.isPending}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                fontWeight: 700,
                color: resendCooldown > 0 ? 'var(--text-weak)' : 'var(--accent)',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {resendCooldown > 0 ? `다시 보내기 (${resendCooldown}초 후)` : '다시 보내기'}
            </button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="signup-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              이름
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="앱에서 사용할 이름"
              value={state.authName}
              maxLength={NAME_MAX}
              onChange={(e) => setState({ authName: e.target.value })}
              style={authInput}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="signup-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="영문 · 숫자 · 기호 조합 8자 이상"
              value={password}
              onInput={filterPwInput}
              onChange={(e) => setPassword(e.target.value)}
              style={authInput}
            />
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>{PASSWORD_RULE_TEXT}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="signup-password-confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 다시 입력"
              value={passwordConfirm}
              onInput={filterPwInput}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={authInput}
            />
          </div>

          <button
            type="button"
            onClick={() => setState({ authMarketingOptIn: !state.authMarketingOptIn })}
            aria-pressed={state.authMarketingOptIn}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 22 }}
          >
            <span style={checkBox(state.authMarketingOptIn)}>
              <Icon name="check" size={14} />
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>[선택] 마케팅 정보 수신 동의</span>
          </button>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="pill-btn" disabled={signupMutation.isPending} style={signupMutation.isPending ? authPrimaryOff : authPrimary}>
            {signupMutation.isPending ? '가입하는 중…' : '가입'}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--text-weak)' }}>
        이미 계정이 있으신가요?
        <button
          type="button"
          onClick={() => goAuthScreen('login')}
          style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', marginLeft: 4, fontFamily: 'inherit' }}
        >
          로그인
        </button>
      </div>
    </div>
  )
}
