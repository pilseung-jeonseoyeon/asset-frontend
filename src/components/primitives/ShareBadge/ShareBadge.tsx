// 계좌 이름 옆에 붙는 '공유' 배지. 연동 배지(AssetCategoryModal)와 같은 자리·크기(10px)로, 이름이
// 길면 이름이 먼저 줄어들고 배지는 잘리지 않는다(flex:none). 글자는 '공유' 두 글자로 고정한다 —
// 누구와 공유 중인지는 옆 줄(기관명 자리)이 말한다.

import { Icon } from '../Icon/Icon'

interface ShareBadgeProps {
  /** 마우스를 올리면 보이는 설명(예: '멤버 2명과 함께 보는 중'). */
  title?: string
  /** 'NEW'처럼 '공유' 대신 쓸 짧은 글자. 설정 카드의 새 기능 표시에만 쓴다. */
  label?: string
}

export function ShareBadge({ title, label = '공유' }: ShareBadgeProps) {
  return (
    <span
      title={title}
      style={{
        fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)',
        borderRadius: 6, padding: '2px 7px', flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name="group" size={11} ariaHidden />
      {label}
    </span>
  )
}
