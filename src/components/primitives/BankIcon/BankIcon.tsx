// Source: ds_rules_v2_5.md §1-7 (icon tile spec) + §12-2 (25 archetype SVG spec) — tile 28-44px square,
// radius 8px (§5 "small elements"), 24x24 viewBox stroke-only SVG, stroke-width 1.8 (2.0 for KB/Kakao
// "yellow exception" families, §1-7), symbol size = 58% of tile side. Colors from --bank-{key}-bg/-fg
// (src/styles/bank-tokens.css); undefined key falls back to --fill-subtle/--text-mid + pillar archetype
// (§12-3 "미지정 · 기타" row).

import { BANK_ARCHETYPE_PATHS } from '../../../design/bank-archetypes'
import { BANK_YELLOW_STROKE_EXCEPTIONS, findBankInstitution } from '../../../design/bank-institutions'

interface BankIconProps {
  tokenKey: string
  size?: number // 28-44px per spec
}

export function BankIcon({ tokenKey, size = 36 }: BankIconProps) {
  const institution = findBankInstitution(tokenKey)
  const archetype = institution?.archetype ?? 'pillar'
  const strokeWidth = BANK_YELLOW_STROKE_EXCEPTIONS.has(tokenKey) ? 2.0 : 1.8
  const bg = institution ? `var(--bank-${tokenKey}-bg)` : 'var(--fill-subtle)'
  const fg = institution ? `var(--bank-${tokenKey}-fg)` : 'var(--text-mid)'
  const symbolSize = size * 0.58

  return (
    <div
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
      }}
    >
      <svg
        width={symbolSize}
        height={symbolSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BANK_ARCHETYPE_PATHS[archetype]} />
      </svg>
    </div>
  )
}
