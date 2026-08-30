// Source: secret/Asset Manager v14.dc.html L647-671 (authForgot sc-if block, resetSent toggling
// between "이메일 입력" and "메일을 보냈습니다" panels). The source's flow only ever sends a reset
// *link* by email — there's no code/new-password step because the prototype has no PUT /auth/password
// to call. The real contract is code-based (POST /auth/password/code → PUT /auth/password with
// {email, code, newPassword}), so this port adds a middle "code + new password" step between the
// source's two panels: email → 코드 받기 → 코드+새 비밀번호 → 완료. The completion panel's copy/button
// ("로그인으로 돌아가기") is transcribed from the source's resetSent panel almost verbatim.
//
// newPassword/newPasswordConfirm are local useState — see LoginForm.tsx header comment for why.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen, useMarkAuthCodeSent } from '../../state/selectors/auth'
import { CodeInput } from './CodeInput'
import { useResendCooldown } from './useResendCooldown'
import { authInputStyle, authPrimaryButtonStyle, authPrimaryButtonDisabledStyle, filterEmailInput, filterPasswordInput, EMAIL_PATTERN } from './authFormStyles'
import { usePostPasswordResetCode, usePutPassword, PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/services/auth'

export function ResetPasswordForm() {
  const { state, setState } = useAppState()
  const goAuthScreen = useGoAuthScreen()
  const markCodeSent = useMarkAuthCodeSent()
  const codeMutation = usePostPasswordResetCode()
  const resetMutation = usePutPassword()
  const resendCooldown = useResendCooldown(state.authCodeSentAt)

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

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
    if (!/^\d{6}$/.test(state.authCode)) {
      setValidationError('인증 코드 6자리를 입력해 주세요.')
      return
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setValidationError(PASSWORD_RULE_TEXT)
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setValidationError('비밀번호가 서로 일치하지 않아요.')
      return
    }
    setValidationError(null)
    resetMutation.mutate(
      { email: state.authEmail, code: state.authCode, newPassword },
      { onSuccess: () => setState({ authStep: 'done' }) },
    )
  }

  const errorMessage =
    validationError ?? (state.authStep === 'sent' ? resetMutation.error?.message : codeMutation.error?.message) ?? null

  if (state.authStep === 'done') {
    return (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '34px 32px' }}>
        <span
          style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
        >
          <Icon name="check_circle" size={22} />
        </span>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>비밀번호가 변경되었습니다</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 24 }}>
          새 비밀번호로 다시 로그인해 주세요.
        </div>
        <button type="button" className="pill-btn" onClick={() => goAuthScreen('login')} style={authPrimaryButtonStyle}>
          로그인으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '34px 32px' }}>
      {state.authStep !== 'sent' ? (
        <form onSubmit={handleSendCode}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>비밀번호 찾기</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 24 }}>
            가입하신 이메일 주소를 입력하시면
            <br />
            인증 코드를 보내드립니다.
          </div>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="reset-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              이메일
            </label>
            <input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={state.authEmail}
              // 코드 발송 요청이 이 이메일로 나가 있는 동안 값을 바꾸면, 다음 단계 안내 문구는 새 이메일을
              // 보여주는데 실제 코드는 옛 이메일로 발급된 채라 재설정 요청이 반드시 실패한다 —
              // 요청이 끝날 때까지 잠근다(SignupForm.tsx의 같은 입력란과 동일한 이유).
              disabled={codeMutation.isPending}
              onInput={filterEmailInput}
              onChange={(e) => setState({ authEmail: e.target.value })}
              style={authInputStyle}
            />
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="pill-btn" disabled={!emailValid || codeMutation.isPending} style={emailValid && !codeMutation.isPending ? authPrimaryButtonStyle : authPrimaryButtonDisabledStyle}>
            {codeMutation.isPending ? '코드 보내는 중…' : '코드 받기'}
          </button>
          <button type="button" className="pill-btn" onClick={() => goAuthScreen('login')} style={{ marginTop: 8, width: '100%', height: 48, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            로그인으로 돌아가기
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>새 비밀번호를 설정해 주세요</div>
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

          <CodeInput value={state.authCode} onChange={(code) => setState({ authCode: code })} disabled={resetMutation.isPending} />

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
            <label htmlFor="reset-new-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              새 비밀번호
            </label>
            <input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="영문 · 숫자 · 기호 조합 8자 이상"
              value={newPassword}
              onInput={filterPasswordInput}
              onChange={(e) => setNewPassword(e.target.value)}
              style={authInputStyle}
            />
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>{PASSWORD_RULE_TEXT}</div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label htmlFor="reset-new-password-confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              새 비밀번호 확인
            </label>
            <input
              id="reset-new-password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 다시 입력"
              value={newPasswordConfirm}
              onInput={filterPasswordInput}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              style={authInputStyle}
            />
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="pill-btn" disabled={resetMutation.isPending} style={resetMutation.isPending ? authPrimaryButtonDisabledStyle : authPrimaryButtonStyle}>
            {resetMutation.isPending ? '변경하는 중…' : '비밀번호 재설정'}
          </button>
        </form>
      )}
    </div>
  )
}
