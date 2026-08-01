// Source: secret/Asset Manager v14.dc.html L870-872 (dk-accent chip, "이번 달 증감액") — the only
// confirmed instance following ds_rules_v2_5.md §10-1 rule B (chip/badge = Material Symbols
// arrow_drop_up/arrow_drop_down + value). bg/color are NOT hardcoded here — a plain-text badge variant
// with different padding/radius and no icon also exists (L2335-2336, Assets account-detail, Phase 10) —
// this component only covers the icon+chip shape; screens pass their own confirmed bg/color per instance.

import { Icon } from '../Icon/Icon'

interface StatBadgeProps {
  direction: 'up' | 'down'
  text: string
  bg: string
  color: string
}

export function StatBadge({ direction, text, bg, color }: StatBadgeProps) {
  return (
    <span
      className="dk-accent"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: bg,
        color,
        padding: '5px 11px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <Icon name={direction === 'up' ? 'arrow_drop_up' : 'arrow_drop_down'} size={15} />
      {text}
    </span>
  )
}
