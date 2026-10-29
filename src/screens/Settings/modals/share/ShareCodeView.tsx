// 1단계 · 초대 코드 입력(초대받은 사람, v17 시안). 6칸 — 한 글자씩 넣으면 다음 칸으로, 지우면 앞 칸으로,
// 붙여넣으면 여러 칸을 한 번에 채운다. 대문자로 바꾸고 코드에 없는 글자(0·O·1·I 등)는 받지 않는다.

import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { SHARE_CODE_LENGTH, normalizeShareCode, normalizeShareCodeChar } from '../../../../data/shareView'
import { FlowHeader, StepBars } from './shareParts'
import { ERROR_TEXT_STYLE, PRIMARY_BTN_DISABLED_STYLE, PRIMARY_BTN_STYLE } from './shareStyles'

interface ShareCodeViewProps {
  /** 칸별 글자(길이 6) */
  cells: string[]
  busy: boolean
  error: string | null
  onChange: (cells: string[]) => void
  onSubmit: () => void
  onBack: () => void
  onClose: () => void
}

export function ShareCodeView({ cells, busy, error, onChange, onSubmit, onBack, onClose }: ShareCodeViewProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const complete = cells.every((c) => c !== '')

  const setCell = (i: number, value: string) => {
    const next = [...cells]
    next[i] = value
    onChange(next)
  }

  const onInput = (i: number, raw: string) => {
    if (raw.length > 1) {
      fill(i, raw)
      return
    }
    const ch = normalizeShareCodeChar(raw)
    setCell(i, ch)
    if (ch && i < SHARE_CODE_LENGTH - 1) refs.current[i + 1]?.focus()
  }

  const fill = (from: number, raw: string) => {
    const chars = normalizeShareCode(raw).split('')
    if (chars.length === 0) return
    const next = [...cells]
    chars.forEach((ch, k) => {
      if (from + k < SHARE_CODE_LENGTH) next[from + k] = ch
    })
    onChange(next)
    refs.current[Math.min(from + chars.length, SHARE_CODE_LENGTH - 1)]?.focus()
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && cells[i] === '' && i > 0) {
      e.preventDefault()
      setCell(i - 1, '')
      refs.current[i - 1]?.focus()
    } else if (e.key === 'Enter' && complete && !busy) {
      onSubmit()
    }
  }

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    fill(i, e.clipboardData.getData('text'))
  }

  return (
    <>
      <FlowHeader title="초대 코드 입력" onBack={onBack} onClose={onClose} />
      <StepBars step={1} />
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>받은 초대 코드를 입력해 주세요</div>
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginTop: 4, marginBottom: 20, lineHeight: 1.6 }}>
        초대한 사람에게 받은 6자리 코드를 입력해 주세요. 코드는 발급 후 10분 동안만 유효해요.
      </div>
      <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="초대 코드 6자리">
        {cells.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={`${i + 1}번째 글자`}
            value={c}
            autoFocus={i === 0}
            onChange={(e) => onInput(i, e.target.value.slice(-SHARE_CODE_LENGTH))}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            style={{
              flex: 1, minWidth: 0, height: 54, borderRadius: 10, border: `0.5px solid ${error ? 'var(--down)' : 'var(--border)'}`,
              background: 'var(--fill-subtle)', textAlign: 'center', fontSize: 19, fontWeight: 700, fontFamily: 'inherit',
              color: 'var(--text-strong)', outline: 'none', textTransform: 'uppercase', padding: 0,
            }}
          />
        ))}
      </div>
      {error && <div role="alert" style={ERROR_TEXT_STYLE}>{error}</div>}
      <div style={{ marginTop: 22 }}>
        <button
          type="button"
          className="pill-btn"
          onClick={onSubmit}
          disabled={!complete || busy}
          style={complete && !busy ? PRIMARY_BTN_STYLE : PRIMARY_BTN_DISABLED_STYLE}
        >
          {busy ? '확인하는 중…' : '초대 확인'}
        </button>
      </div>
    </>
  )
}
