// 아이콘 + 값 형태의 증감 칩(ds_rules_v2_5.md §10-1 규칙 B —
// Material Symbols arrow_drop_up/arrow_drop_down + 값).
// bg/color는 여기서 하드코딩하지 않는다 — 아이콘 없이 padding·radius가 다른 평문 배지 변형도
// 따로 있어서, 이 컴포넌트는 아이콘+칩 모양만 맡고 색은 화면이 넘긴다.

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
