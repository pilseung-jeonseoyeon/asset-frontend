// 대시보드 카드들이 공유하는 작은 컴포넌트 조각(스타일 상수는 cardStyles.ts). 카드 하나가 한 파일(cards/*.tsx)이고, 레이아웃
// (layouts/DashboardLayout{A,B,C}.tsx)은 카드를 배치만 한다 — 카드가 자기 데이터 훅을 직접 부르므로
// 어느 레이아웃에서든 같은 카드를 그대로 쓸 수 있다(React Query가 같은 쿼리를 합쳐 요청은 한 번).

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { formatKoreanUnits } from '../../../utils/format'
import { DASHED_CTA_STYLE, DASHED_CTA_STYLE_DEEP, EMPTY_TEXT_STYLE, EMPTY_TEXT_STYLE_DEEP } from './cardStyles'

// 1억 원 미만 금액에는 축약 캡션을 병기하지 않는다(ds_rules §4-2).
const ABBREV_THRESHOLD = 100_000_000

export function KoreanUnitsCaption({ amountKrw, deep }: { amountKrw: number; deep?: boolean }) {
  if (Math.abs(amountKrw) < ABBREV_THRESHOLD) return null
  const sign = amountKrw < 0 ? '−' : ''
  const style = deep
    ? { fontSize: 12, color: 'var(--deep-label)', fontWeight: 500, marginTop: 4 }
    : { fontSize: 11.5, color: 'var(--text-weak)' }
  return (
    <div style={style}>
      약 {sign}
      {formatKoreanUnits(amountKrw)} 원
    </div>
  )
}

export function EmptyState({
  text,
  ctaLabel,
  onCta,
  deep,
  style,
}: {
  text: string
  ctaLabel?: string
  onCta?: () => void
  deep?: boolean
  style?: CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={deep ? EMPTY_TEXT_STYLE_DEEP : EMPTY_TEXT_STYLE}>{text}</div>
      {ctaLabel && onCta && (
        <button onClick={onCta} className="qbtn" style={deep ? DASHED_CTA_STYLE_DEEP : DASHED_CTA_STYLE}>
          <Icon name="add" size={16} />
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
