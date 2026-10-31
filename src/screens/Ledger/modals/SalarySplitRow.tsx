// 월급 나누기 창의 받는 통장 한 줄(A안 — 얇은 선 목록). 화면 정본: docs/plan/view/월급 나누기 디자인 A·B·C.html.
// 웹은 한 줄(체크 · 아이콘 · 이름/태그 · 금액 · ✕), 폰은 두 줄(체크 · 아이콘 · 이름 · ✕ / 태그 · 금액)로 접는다.
// 상태는 갖지 않는다 — 값과 바꾸는 법은 SalarySplitModal이 넘긴다.

import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { formatNumber } from '../../../utils/format'
import type { SalarySplitRow as SalarySplitRowValue } from '../../../state/types'
import type { SalarySplitLineType } from '@/services/salarySplit'

/** 유형 선택 줄의 한 칸(이체, 또는 저축 · 소분류). */
export interface SalarySplitTypeOption {
  type: SalarySplitLineType
  subcategoryId: number | null
  label: string
}

interface SalarySplitRowProps {
  row: SalarySplitRowValue
  index: number
  name: string
  leading: ReactNode
  /** 저축 소분류 이름. 저축인데 null이면 '소분류 고르기' */
  subcategoryName: string | null
  /** 금액 칸 아래 한 줄. null이면(잔액을 모름) 비운다 */
  after: { sending: boolean; amount: number } | null
  /** 보내기가 이 통장 때문에 실패했다 */
  failed: boolean
  menuOpen: boolean
  typeOptions: SalarySplitTypeOption[]
  isMobile: boolean
  onToggle: () => void
  onAmountChange: (raw: string) => void
  onToggleMenu: () => void
  onPickType: (option: SalarySplitTypeOption) => void
  onRemove: () => void
}

/** 둥근 체크 — 보이는 원은 20px, 눌리는 영역은 44px(docs/mobile.md). text를 주면 원 옆에 글자를 붙여 함께 눌린다. */
export function RoundCheck({ checked, label, onChange, text }: { checked: boolean; label: string; onChange: () => void; text?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: text ? 'flex-start' : 'center', gap: 8, border: 'none',
        background: 'transparent', cursor: 'pointer', padding: text ? '0 2px' : 0, flex: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        color: 'var(--text-strong)', whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 20, height: 20, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
          border: checked ? 'none' : '1.5px solid var(--text-weak)', background: checked ? 'var(--accent)' : 'var(--surface)', color: '#fff',
        }}
      >
        {checked && <Icon name="check" size={14} />}
      </span>
      {text}
    </button>
  )
}

/** 태그(▾) 버튼 — 보이는 칩은 22px, 위아래 음수 여백으로 눌리는 높이만 44px로 늘린다. */
export function TagButton({ tone, label, open, onClick }: { tone: 'transfer' | 'saving' | 'income'; label: string; open: boolean; onClick: () => void }) {
  const colors: Record<typeof tone, CSSProperties> = {
    transfer: { background: 'var(--track)', color: 'var(--text-mid)' },
    saving: { background: 'var(--sav-chip)', color: 'var(--sav-text)' },
    income: { background: 'var(--up-chip)', color: 'var(--inc-text)' },
  }
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      style={{ border: 'none', background: 'transparent', padding: '11px 2px', margin: '-11px -2px', cursor: 'pointer', fontFamily: 'inherit', flex: 'none' }}
    >
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 1, height: 22, padding: '0 4px 0 7px', borderRadius: 8,
          fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', ...colors[tone],
        }}
      >
        {label}
        <Icon name={open ? 'expand_less' : 'expand_more'} size={14} />
      </span>
    </button>
  )
}

/** 태그를 눌러 펼친 선택 줄 — 알약 버튼(44px)들. */
export function PickRow({ options, isSelected, onPick, label, indent }: {
  options: { key: string; label: string; tone: 'transfer' | 'saving' | 'income' }[]
  isSelected: (key: string) => boolean
  onPick: (key: string) => void
  label: string
  indent: number
}) {
  const toneColor = { transfer: 'var(--text-mid)', saving: 'var(--sav-text)', income: 'var(--inc-text)' }
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: `2px 0 8px ${indent}px` }}>
      {options.map((o) => {
        const on = isSelected(o.key)
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o.key)}
            style={{
              minHeight: 44, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              border: `0.5px solid ${on ? 'var(--text-strong)' : 'var(--border)'}`, background: 'var(--surface)',
              color: on ? 'var(--text-strong)' : toneColor[o.tone],
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** 금액 칸 — ₩ + 오른쪽 정렬 숫자. */
export function AmountField({ value, label, onChange, width, disabled }: { value: number; label: string; onChange: (raw: string) => void; width: number | string; disabled?: boolean }) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 3, border: '0.5px solid var(--border)', borderRadius: 10, background: 'var(--surface)',
        padding: '0 10px', height: 44, width, boxSizing: 'border-box', cursor: 'text',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
      <input
        type="text"
        inputMode="numeric"
        enterKeyHint="next"
        placeholder="0"
        aria-label={label}
        disabled={disabled}
        value={value ? formatNumber(value) : ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none', outline: 'none', width: '100%', minWidth: 0, textAlign: 'right', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          color: disabled ? 'var(--text-weak)' : 'var(--text-strong)', background: 'transparent', fontVariantNumeric: 'tabular-nums',
        }}
      />
    </label>
  )
}

export function SalarySplitRow(props: SalarySplitRowProps) {
  const { row, index, name, leading, subcategoryName, after, failed, menuOpen, typeOptions, isMobile } = props
  const dim: CSSProperties = row.on ? {} : { opacity: 0.45 }
  const hint = failed
    ? { text: '해지된 통장이에요', color: 'var(--down)' }
    : !row.on
      ? { text: '이번 달은 건너뛰어요', color: 'var(--text-mid)' }
      : row.amount <= 0
        ? { text: '금액이 없어 건너뛰어요', color: 'var(--text-mid)' }
        : null
  const tagLabel = row.type === 'SAVING' ? `저축 · ${subcategoryName ?? '소분류 고르기'}` : '이체'
  const optionKey = (o: SalarySplitTypeOption) => `${o.type}:${o.subcategoryId ?? ''}`

  return (
    <>
      <div
        data-row={row.accountId}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '44px 32px minmax(0, 1fr) 112px 44px' : '44px 34px minmax(0, 1fr) auto 44px',
          gridTemplateAreas: isMobile ? '"chk ic name name x" "chk sub sub amt amt"' : '"chk ic name amt x" "chk ic sub amt x"',
          columnGap: 8, rowGap: 3, alignItems: 'center', padding: isMobile ? '4px 0 8px' : '6px 0', minHeight: 62,
          borderBottom: '0.5px solid var(--border)', borderTop: index === 0 ? '0.5px solid var(--border)' : undefined,
          outline: failed ? '1px solid var(--down)' : undefined, outlineOffset: -1,
        }}
      >
        <div style={{ gridArea: 'chk' }}>
          <RoundCheck checked={row.on} label={`${name}에 보내기`} onChange={props.onToggle} />
        </div>
        <div style={{ gridArea: 'ic', ...dim }}>{leading}</div>
        <div style={{ gridArea: 'name', alignSelf: isMobile ? 'center' : 'end', minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...dim }}>
          {name}
        </div>
        <div style={{ gridArea: 'sub', alignSelf: 'start', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          <TagButton tone={row.type === 'SAVING' ? 'saving' : 'transfer'} label={tagLabel} open={menuOpen} onClick={props.onToggleMenu} />
          {hint && <span style={{ fontSize: 11.5, color: hint.color, whiteSpace: 'nowrap' }}>{hint.text}</span>}
        </div>
        <div style={{ gridArea: 'amt', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <div style={dim}>
            <AmountField value={row.amount} label={`${name} 금액`} onChange={props.onAmountChange} width={isMobile ? '100%' : 150} />
          </div>
          {after && (
            <span style={{ fontSize: 11.5, color: 'var(--text-mid)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {after.sending ? '보낸 뒤 ' : '지금 '}
              <b style={{ color: after.sending ? 'var(--text-strong)' : 'var(--text-mid)', fontWeight: after.sending ? 700 : 500 }}>{formatNumber(after.amount)}</b>원
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={props.onRemove}
          aria-label={`${name} 다음 달부터 목록에서 빼기`}
          style={{ gridArea: 'x', width: 44, height: 44, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-weak)' }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      {menuOpen && (
        <PickRow
          label={`${name} 유형`}
          indent={52}
          options={typeOptions.map((o) => ({ key: optionKey(o), label: o.label, tone: o.type === 'SAVING' ? 'saving' : 'transfer' }))}
          isSelected={(key) => key === `${row.type}:${row.type === 'SAVING' ? (row.subcategoryId ?? '') : ''}`}
          onPick={(key) => {
            const option = typeOptions.find((o) => optionKey(o) === key)
            if (option) props.onPickType(option)
          }}
        />
      )}
    </>
  )
}
