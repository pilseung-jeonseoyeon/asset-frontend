// 기관 아이콘 타일 스펙: ds_rules_v2_5.md §1-7 + §12-2(공용 archetype SVG 25종).
// 타일 28~44px 정사각, radius 8px(§5), 24x24 viewBox에 stroke만 쓰는 SVG, stroke-width 1.8
// (KB·카카오 등 노란 브랜드는 2.0, §1-7), 심볼 크기는 타일 한 변의 58%.
// 색은 --bank-{key}-bg/-fg(src/styles/bank-tokens.css)에서 오고, 없는 키는
// --fill-subtle/--text-mid + pillar archetype으로 폴백한다(§12-3 '미지정 · 기타' 행).

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
