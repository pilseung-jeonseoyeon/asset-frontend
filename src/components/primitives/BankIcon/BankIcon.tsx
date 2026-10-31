// 기관 아이콘 타일 스펙: ds_rules_v3.md §1-7(타일 28~44px 정사각, radius 8px §5, 색 --bank-{key}-bg/-fg).
// 2026-10-31 사용자 결정: 타일 안을 추상 심볼(§12-2 archetype) 대신 기관 이름 글자(bank-monograms.ts — 'KB' · '신한' · '카카오')로
// 채운다. 실제 CI 로고는 쓰지 않는다. 글자 크기는 타일과 글자 폭에 맞춰 줄이고, 28px 미만 타일에서 세 글자 이름은 첫 글자만 쓴다.
// 표에 없는 키는 --fill-subtle/--text-mid + pillar 심볼로 폴백한다(§12-3 '미지정 · 기타' 행).
// 기관 이름은 늘 옆에 글로 함께 나오므로 타일은 스크린리더에서 숨긴다.

import type { ReactNode } from 'react'
import { BANK_ARCHETYPE_PATHS } from '../../../design/bank-archetypes'
import { findBankInstitution } from '../../../design/bank-institutions'
import { bankMonogramOf } from '../../../design/bank-monograms'

interface BankIconProps {
  tokenKey: string
  size?: number // 28-44px per spec
}

/** 글자 폭(한글 한 자 = 1). 영문 대문자는 좁고 소문자는 더 좁다. */
function monogramUnits(text: string): number {
  let units = 0
  for (const ch of text) units += /[A-Z0-9]/.test(ch) ? 0.68 : /[a-z]/.test(ch) ? 0.56 : 1
  return units
}

export function BankIcon({ tokenKey, size = 36 }: BankIconProps) {
  const institution = findBankInstitution(tokenKey)
  const bg = institution ? `var(--bank-${tokenKey}-bg)` : 'var(--fill-subtle)'
  const fg = institution ? `var(--bank-${tokenKey}-fg)` : 'var(--text-mid)'

  const tile = (content: ReactNode) => (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  )

  if (!institution) {
    const symbolSize = size * 0.58
    return tile(
      <svg width={symbolSize} height={symbolSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={BANK_ARCHETYPE_PATHS.pillar} />
      </svg>,
    )
  }

  const full = bankMonogramOf(tokenKey, institution.name)
  const label = size < 28 && monogramUnits(full) > 2 ? Array.from(full)[0] : full
  const fontSize = Math.min(size * 0.4, (size * 0.8) / monogramUnits(label))
  return tile(
    <span style={{ fontSize, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{label}</span>,
  )
}
