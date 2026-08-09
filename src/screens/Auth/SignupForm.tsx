// Source: secret/Asset Manager v14.dc.html L546-645 (authTerms/authSignup/authVerify sc-if blocks).
// Ported as the original 3 steps — 1/3 약관 동의(authTerms, L546-580) → 2/3 정보 입력(authSignup,
// L582-620) → 3/3 이메일 인증(authVerify, L622-645) — mapped onto the real POST /auth/signup/code +
// POST /auth/signup contract: step 1 has no server call (client-only agreement state), step 2's
// "인증 메일 받기" calls usePostSignupCode, step 3's "인증 완료" calls usePostSignup with the values
// collected across steps 1-2. The source's agreeItems (L564, sc-for hint-placeholder-count="4") is a
// placeholder with no real copy behind it — the 4 items below (연령·이용약관·개인정보·마케팅) are this
// port's own copy, not transcribed. The source's "보기 ›" link (L570) is dropped — there's no terms
// page to open, and a dead link isn't worth reproducing.
//
// Password/passwordConfirm are local useState — see LoginForm.tsx header comment for why.

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useGoAuthScreen, useMarkAuthCodeSent } from '../../state/selectors/auth'
import type { AuthAgreementKey } from '../../state/types'
import { CodeInput } from './CodeInput'
import { useResendCooldown } from './useResendCooldown'
import {
  agreeAllBtn,
  agreementRow,
  agreementToggleBtn,
  authInput,
  authInputPw,
  authPrimary,
  authPrimaryOff,
  authSecondary,
  checkBox,
  filterEmailInput,
  filterPwInput,
  EMAIL_PATTERN,
} from './authFormStyles'
import { usePostSignup, usePostSignupCode, PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/services/auth'

const NAME_MAX = 50

interface AgreementItem {
  key: AuthAgreementKey
  tag: string
  label: string
  required: boolean
}

const AGREEMENT_ITEMS: AgreementItem[] = [
  { key: 'service', tag: '[필수]', label: '서비스 이용약관 동의', required: true },
  { key: 'privacy', tag: '[필수]', label: '개인정보 수집 및 이용 동의', required: true },
  { key: 'marketing', tag: '[선택]', label: '마케팅 정보 수신 동의', required: false },
]

const STEP_LABEL: Record<'terms' | 'form' | 'sent', number> = { terms: 1, form: 2, sent: 3 }

export function SignupForm() {
  const { state, setState } = useAppState()
  const goAuthScreen = useGoAuthScreen()
  const markCodeSent = useMarkAuthCodeSent()
  const codeMutation = usePostSignupCode()
  const signupMutation = usePostSignup()
  const resendCooldown = useResendCooldown(state.authCodeSentAt)

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const step = state.authStep === 'done' ? 'terms' : state.authStep
  const filledCount = STEP_LABEL[step]
  const allRequiredAgreed = state.authAgreements.service && state.authAgreements.privacy
  const allAgreed = AGREEMENT_ITEMS.every((item) => state.authAgreements[item.key])
  const emailValid = EMAIL_PATTERN.test(state.authEmail)

  /** 단계 이동 버튼(다음/이전/이메일 수정) 공용 — 직전 단계에서 보이던 검증 에러가 다음 화면까지
   * 따라오지 않도록 이동할 때마다 지운다. */
  function goStep(patch: { authStep: 'terms' | 'form'; authCode?: string; authCodeSentAt?: null }) {
    setValidationError(null)
    setState(patch)
  }

  /** 필수 3개가 모두 체크되면, 3단계에서 미동의로 튕겨 남아 있던 안내 메시지를 지운다(그렇지 않으면
   * "다음"을 다시 눌러야만 사라진다). */
  function clearErrorIfRequiredMet(next: Record<AuthAgreementKey, boolean>) {
    if (next.service && next.privacy) {
      setValidationError(null)
    }
  }

  function toggleAgreement(key: AuthAgreementKey) {
    const next = { ...state.authAgreements, [key]: !state.authAgreements[key] }
    setState({ authAgreements: next })
    clearErrorIfRequiredMet(next)
  }

  function toggleAgreeAll() {
    const on = !allAgreed
    const next = { service: on, privacy: on, marketing: on }
    setState({ authAgreements: next })
    clearErrorIfRequiredMet(next)
  }

  function handleSendCode(e: FormEvent) {
    e.preventDefault()
    if (!emailValid) {
      setValidationError('올바른 이메일 형식을 입력해 주세요.')
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
    if (!allRequiredAgreed) {
      // 정상 플로우라면 1단계 "다음" 버튼이 필수 약관 미동의를 막아 여기까지 오지 않지만, 최종 제출
      // 직전에 한 번 더 확인해 상태가 어긋난 채로 가입 요청이 나가는 것을 막는다.
      setValidationError('필수 약관에 모두 동의해 주세요.')
      setState({ authStep: 'terms' })
      return
    }
    setValidationError(null)
    signupMutation.mutate({
      email: state.authEmail,
      code: state.authCode,
      name: state.authName.trim(),
      password,
      hasMarketingOptIn: state.authAgreements.marketing,
    })
  }

  const errorMessage =
    validationError ??
    (step === 'sent' ? signupMutation.error?.message : step === 'form' ? codeMutation.error?.message : null) ??
    null

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '34px 32px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
        {[1, 2, 3].map((n) => (
          <span key={n} style={{ flex: 1, height: 3, borderRadius: 999, background: n <= filledCount ? 'var(--accent)' : 'var(--border)' }} />
        ))}
      </div>

      {step === 'terms' && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>약관에 동의해 주세요</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginBottom: 22 }}>1단계 · 총 3단계</div>

          <button type="button" onClick={toggleAgreeAll} aria-pressed={allAgreed} style={agreeAllBtn}>
            <span style={checkBox(allAgreed)}>
              <Icon name="check" size={14} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>모두 동의합니다</span>
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-weak)', lineHeight: 1.6, margin: '0 4px 14px' }}>
            선택 항목 동의를 포함합니다. 선택 항목에 동의하지 않아도 가입할 수 있습니다.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 22 }}>
            {AGREEMENT_ITEMS.map((item) => {
              const checked = state.authAgreements[item.key]
              return (
                <div key={item.key} style={agreementRow}>
                  <button type="button" onClick={() => toggleAgreement(item.key)} aria-pressed={checked} style={agreementToggleBtn}>
                    <Icon name={checked ? 'check_circle' : 'radio_button_unchecked'} size={19} color={checked ? 'var(--accent)' : 'var(--text-weak)'} />
                    <span style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>
                      <span style={{ fontWeight: 700, color: item.required ? 'var(--accent)' : 'var(--text-weak)' }}>{item.tag}</span> {item.label}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            className="pill-btn"
            disabled={!allRequiredAgreed}
            onClick={() => goStep({ authStep: 'form' })}
            style={allRequiredAgreed ? authPrimary : authPrimaryOff}
          >
            다음
          </button>

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
      )}

      {step === 'form' && (
        <form onSubmit={handleSendCode}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>계정 정보를 입력해 주세요</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginBottom: 22 }}>2단계 · 총 3단계</div>

          <div style={{ marginBottom: 14 }}>
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
              // 코드 발송 요청이 이 이메일로 나가 있는 동안 값을 바꾸면, 3단계 안내 문구는 새 이메일을
              // 보여주는데 실제 코드는 옛 이메일로 발급된 채라 최종 가입 요청이 반드시 실패한다 —
              // 요청이 끝날 때까지 잠근다.
              disabled={codeMutation.isPending}
              onInput={filterEmailInput}
              onChange={(e) => setState({ authEmail: e.target.value })}
              style={authInput}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="signup-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              비밀번호
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="영문 · 숫자 · 기호 조합 8자 이상"
                value={password}
                onInput={filterPwInput}
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
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>{PASSWORD_RULE_TEXT}</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="signup-password-confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
              비밀번호 확인
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password-confirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="비밀번호 다시 입력"
                value={passwordConfirm}
                onInput={filterPwInput}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                style={authInputPw}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((v) => !v)}
                aria-label={showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
                style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 46, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Icon name={showPasswordConfirm ? 'visibility_off' : 'visibility'} size={19} color="var(--text-weak)" />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
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
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>기본 프로필 이미지는 이름의 첫 글자로 자동 생성됩니다.</div>
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="pill-btn"
            disabled={!emailValid || codeMutation.isPending}
            style={emailValid && !codeMutation.isPending ? authPrimary : authPrimaryOff}
          >
            {codeMutation.isPending ? '코드 보내는 중…' : '인증 메일 받기'}
          </button>
          {/* codeMutation이 진행 중일 때 1단계로 돌아가면, 응답이 도착한 시점에 markCodeSent가
              authStep을 무조건 'sent'로 덮어써 약관 화면을 보고 있던 사용자가 갑자기 3단계로
              튕긴다 — 요청이 끝날 때까지 "이전"을 눌러 화면을 벗어날 수 없게 막는다. */}
          <button type="button" className="pill-btn" disabled={codeMutation.isPending} onClick={() => goStep({ authStep: 'terms' })} style={authSecondary}>
            이전
          </button>
        </form>
      )}

      {step === 'sent' && (
        <form onSubmit={handleSubmit}>
          <span
            style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
          >
            <Icon name="mark_email_unread" size={22} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 6 }}>메일함을 확인해 주세요</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 24 }}>
            {state.authEmail} 으로 6자리 인증 코드를 보냈습니다.
            <br />
            메일이 보이지 않으면 스팸함도 확인해 주세요.
          </div>

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

          {errorMessage && (
            <div role="alert" aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="pill-btn" disabled={signupMutation.isPending} style={signupMutation.isPending ? authPrimaryOff : authPrimary}>
            {signupMutation.isPending ? '가입하는 중…' : '인증 완료'}
          </button>
          <button
            type="button"
            className="pill-btn"
            onClick={() => goStep({ authStep: 'form', authCode: '', authCodeSentAt: null })}
            style={authSecondary}
          >
            이메일 주소 수정
          </button>
        </form>
      )}
    </div>
  )
}
