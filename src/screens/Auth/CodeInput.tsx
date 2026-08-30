// 인증 코드 6자리 입력 상자. 입력하면 다음 칸으로 자동 이동하고, 백스페이스로 이전 칸,
// 붙여넣기와 자동완성(여러 글자가 한꺼번에 들어오는 경우)도 받는다.
// SignupForm과 ResetPasswordForm이 함께 쓴다 — 인증 흐름 밖에서는 쓰지 않으므로
// components/primitives가 아니라 screens/Auth에 둔다.
//
// 값은 길이 6 고정 문자열로 들고, 빈 칸은 공백 ' '으로 채운다(부모에 넘기기 직전에 끝쪽 공백만
// 잘라낸다). 가운데 칸을 비웠을 때 뒤 숫자가 앞으로 당겨지지 않게 하기 위함이다 — 아래 `commit`이
// 아직 빈 칸을 전부 ' '로 채워 이어 붙이고 **끝쪽** 공백만 걷어내므로, 가운데 빈 칸은 문자열에
// 공백 한 칸으로 남는다(화면에는 빈 상자로 보인다). 그래서 호출부는 '미완성 코드'를
// `.length !== 6`이 아니라 /^\d{6}$/에 안 맞는 것으로 판단해야 한다.

import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

const CODE_LENGTH = 6

interface CodeInputProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function CodeInput({ value, onChange, disabled }: CodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '')

  /** 자릿수 배열을 통째로 교체 — 빈 칸은 공백으로 채워 위치를 보존한 뒤, 뒤쪽 연속 공백만 잘라낸다. */
  function commit(next: string[]) {
    onChange(
      next
        .map((c) => c || ' ')
        .join('')
        .replace(/\s+$/, ''),
    )
  }

  function setDigit(index: number, char: string) {
    const next = digits.slice()
    next[index] = char
    commit(next)
  }

  /** 항상 0번 칸부터 순서대로 숫자를 채운다. 붙여넣기와, "겹쳐 타이핑"이 아닌 다중 문자 onChange
   * (자동완성 등)가 공유한다. 어느 칸에서 발생했든 0번부터 채워야 뒷자리가 잘리지 않는다 — 포커스
   * 인덱스 기준으로 채우면 뒤쪽 칸에 포커스가 있을 때 뒷자리가 조용히 버려진다. */
  function fillFrom(rawDigits: string) {
    const clean = rawDigits.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)
    if (!clean) return
    const next = digits.slice()
    for (let i = 0; i < clean.length; i++) {
      next[i] = clean[i]
    }
    commit(next)
    const lastFilled = Math.min(clean.length, CODE_LENGTH - 1)
    inputsRef.current[lastFilled]?.focus()
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/[^0-9]/g, '')

    if (clean.length === 2) {
      // maxLength가 없으므로, 이미 숫자가 든 칸을 지우지 않고 커서만 두고 새 숫자를 타이핑하면
      // raw가 "기존값+새값"(또는 순서가 반대) 2글자가 된다. 두 글자 중 하나가 이 칸의 기존 값과
      // 같으면 "겹쳐 타이핑"으로 보고, 그 칸 하나만 새 값으로 덮어쓴다 — 옆 칸은 절대 건드리지 않는다.
      const prev = digits[index].trim()
      const [a, b] = clean
      if (a === prev || b === prev) {
        const overwritten = a === prev ? b : a
        setDigit(index, overwritten)
        if (overwritten && index < CODE_LENGTH - 1) {
          inputsRef.current[index + 1]?.focus()
        }
        return
      }
    }

    if (clean.length >= 2) {
      // 겹쳐 타이핑이 아닌 다중 문자 입력(자동완성 등) — 항상 0번 칸부터 채운다.
      fillFrom(clean)
      return
    }

    setDigit(index, clean)
    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  /** 어느 칸에서 붙여넣든 포커스 위치와 무관하게 항상 0번 칸부터 채운다. 숫자가 없는 텍스트를
   * 붙여넣어도 브라우저 기본 붙여넣기가 DOM 값을 바꿔버리면 화면(입력칸)과 상태가 어긋나므로,
   * 채울 게 없을 때도 preventDefault는 항상 먼저 호출한다. */
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    fillFrom(e.clipboardData.getData('text'))
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    // 중간 칸을 지우면 그 자리가 ''가 아니라 위치 보존용 ' '로 남으므로(commit 참고), 공백까지
    // "비어 있다"로 취급해야 그 칸에서 다시 backspace를 눌렀을 때 이전 칸으로 이동한다.
    if (e.key === 'Backspace' && !digits[index].trim() && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
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
          autoComplete="one-time-code"
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
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
