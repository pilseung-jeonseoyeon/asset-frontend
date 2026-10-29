// 설정 › 가족 · 커플 공유 흐름(v17 시안)의 창들이 함께 쓰는 조각 — 머리글, 단계 막대, 공유 화면 이름 칸, 계좌 줄, 공통 스타일.
// 문구·판정 규칙은 data/shareView.ts에 있고, 여기는 그리기만 한다.

import type { CSSProperties, ReactNode } from 'react'
import { BankIcon } from '../../../../components/primitives/BankIcon/BankIcon'
import { Icon } from '../../../../components/primitives/Icon/Icon'
import { accountInstitutionMeta } from '../../../../data/accountView'
import { SPACE_NAME_MAX, spaceNamePresets } from '../../../../data/shareView'
import { formatKrw } from '../../../../utils/format'
import type { AccountResponse } from '@/services/account'
import type { InstitutionResponse } from '@/services/institution'
import { ERROR_TEXT_STYLE, ICON_TILE_STYLE } from './shareStyles'

const ROUND_BTN_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
}

interface FlowHeaderProps {
  title?: string
  /** 제목 아래 작은 설명 */
  subtitle?: string
  /** 있으면 왼쪽에 뒤로 버튼 */
  onBack?: () => void
  /** 뒤로 버튼이 없을 때 제목 왼쪽 아이콘 */
  icon?: string
  onClose: () => void
}

/** 흐름 창 머리글 — [뒤로] 또는 아이콘 + 제목, 오른쪽 닫기. 제목이 없으면 닫기만 오른쪽에 둔다(확인·완료 창). */
export function FlowHeader({ title, subtitle, onBack, icon, onClose }: FlowHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: title ? 22 : 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="뒤로" title="뒤로" style={ROUND_BTN_STYLE}>
            <Icon name="arrow_back" size={19} color="var(--text-mid)" />
          </button>
        ) : icon ? (
          <span style={{ ...ICON_TILE_STYLE, width: 38, height: 38, borderRadius: 8 }}>
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        {title && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{subtitle}</div>}
          </div>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="닫기" style={ROUND_BTN_STYLE}>
        <Icon name="close" size={19} color="var(--text-mid)" />
      </button>
    </div>
  )
}

/** 1·2·3단계 진행 막대 */
export function StepBars({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 22 }} aria-label={`3단계 중 ${step}단계`}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? 'var(--accent)' : 'var(--border)' }} />
      ))}
    </div>
  )
}

/** 가운데 정렬 큰 아이콘 + 제목 + 설명(초대 확인 · 연결 완료 · 공유 시작 완료) */
export function CenteredIntro({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <span style={ICON_TILE_STYLE}>
        <Icon name={icon} size={22} />
      </span>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 16, textWrap: 'balance' }}>{title}</div>
      {children && <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginTop: 8 }}>{children}</div>}
    </div>
  )
}

interface SpaceNameFieldProps {
  value: string
  partnerName: string | null
  onChange: (value: string) => void
  /** 칸에서 벗어나거나 추천을 누르면 저장 */
  onCommit: (value: string) => void
  error?: string | null
}

/** 공유 화면 이름 — 입력(8자) · 추천 칩 · 상단 탭 미리보기 · 안내(시안 v16) */
export function SpaceNameField({ value, partnerName, onChange, onCommit, error }: SpaceNameFieldProps) {
  const preview = value.trim() || '우리집'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label htmlFor="share-space-name" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>공유 화면 이름</label>
        <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>{value.length}/{SPACE_NAME_MAX}</span>
      </div>
      <input
        id="share-space-name"
        type="text"
        maxLength={SPACE_NAME_MAX}
        placeholder="우리집"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, SPACE_NAME_MAX))}
        onBlur={() => onCommit(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        style={{
          width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700,
          fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', background: 'var(--surface)', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {spaceNamePresets(partnerName).map((name) => {
          const active = preview === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name)
                onCommit(name)
              }}
              aria-pressed={active}
              style={{
                padding: '7px 12px', minHeight: 32, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                border: `0.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-soft)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-mid)',
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: '10px 12px 10px 14px', marginTop: 12 }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-weak)', flex: 'none' }}>상단 탭 미리보기</span>
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 3, gap: 2, minWidth: 0 }}>
          <span style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-weak)' }}>개인</span>
          <span style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--seg-active)', color: 'var(--text-strong)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 8, lineHeight: 1.6 }}>
        내 화면에서만 쓰이는 이름이에요. '우리집'이나 상대 이름처럼 부르기 편한 이름을 정해주세요.
      </div>
      {error && <div role="alert" style={ERROR_TEXT_STYLE}>{error}</div>}
    </div>
  )
}

interface AccountRowProps {
  account: AccountResponse
  institutions: InstitutionResponse[]
  /** 기관명 뒤에 ' · '로 붙는 보조 문구(이력 표기·소유자) */
  caption: string
}

/** 공유 계좌 한 줄 — 기관 아이콘 · 이름 · '기관 · 보조 문구' · 잔액(시안 myShareRows/partnerShareRows) */
export function SharedAccountRow({ account, institutions, caption }: AccountRowProps) {
  const meta = accountInstitutionMeta(account, institutions)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', borderBottom: '0.5px solid var(--track)' }}>
      {meta ? (
        <BankIcon tokenKey={meta.tokenKey} size={30} />
      ) : (
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--track)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name={account.type === 'DEPOSIT' ? 'savings' : 'wallet'} size={17} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>
          {[account.institutionName, caption].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {formatKrw(account.balanceKrw)}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-weak)' }}>원</span>
      </div>
    </div>
  )
}
