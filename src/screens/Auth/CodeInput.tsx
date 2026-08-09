// Source: secret/Asset Manager v14.dc.html L636-639 (sc-for codeCells, 6 single-char boxes) +
// L3637-3641 (advanceCodeInput — auto-focus the next box on input). The source only auto-advances
// forward; backspace-to-previous is this port's own addition since dc.html has no keydown handler and
// a 6-box code field is painful to correct without it. Shared by SignupForm and ResetPasswordForm
// (both need the same 6-digit code entry) — kept local to screens/Auth rather than
// components/primitives since nothing outside the auth flow uses it.

import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

const CODE_LENGTH = 6

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function CodeInput({ value, onChange, disabled }: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '')

  function setDigit(index: number, char: string) {
    const next = digits.slice()
    next[index] = char
    onChange(next.join('').replace(/\s+$/, ''))
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1)
    setDigit(index, digit)
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }} role="group" aria-label="인증 코드 6자리">
      {digits.map((digit, i) => (
        // 6개 박스 모두 값 하나짜리 임시 입력칸이라 id/name이 없다 — index가 곧 자릿수이므로 안전하다.
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`인증 코드 ${i + 1}번째 자리`}
          style={{
            flex: 1,
            minWidth: 0,
            height: 54,
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'var(--fill-subtle)',
            textAlign: 'center',
            fontSize: 19,
            fontWeight: 700,
            fontFamily: 'inherit',
            color: 'var(--text-strong)',
            outline: 'none',
          }}
        />
      ))}
    </div>
  )
}
