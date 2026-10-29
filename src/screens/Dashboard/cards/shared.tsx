// 대시보드 카드들이 공유하는 작은 컴포넌트 조각(스타일 상수는 cardStyles.ts). 카드 하나가 한 파일(cards/*.tsx)이고, 레이아웃
// (layouts/DashboardLayout{A,B,C}.tsx)은 카드를 배치만 한다 — 카드가 자기 데이터 훅을 직접 부르므로
// 어느 레이아웃에서든 같은 카드를 그대로 쓸 수 있다(React Query가 같은 쿼리를 합쳐 요청은 한 번).

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { formatKoreanUnits, formatNumber } from '../../../utils/format'
import { useViewScope } from '../../../utils/viewScope'
import { useDashboardHero } from '../hooks/useDashboardHero'
import { useProfileName } from '@/services/user'
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

/**
 * 총자산 카드 아래 공유 안내(가족·커플 공유 v17 시안 dashNote). '개인'은 '우리집'으로 빠진 내 계좌 개수·합계,
 * '우리집'은 두 사람이 공유한 계좌 개수. 공유 계좌가 없으면 그리지 않는다. 숫자는 서버 summary 그대로.
 */
export function ShareScopeNote({ deep }: { deep?: boolean }) {
  const { scope, spaceName, partnerName } = useViewScope()
  const myName = useProfileName()
  const summary = useDashboardHero().summaryQuery.data
  if (!summary || summary.sharedAccountCount === 0) return null
  const text =
    scope === 'SHARED'
      ? `${myName || '나'}님과 ${partnerName ?? '상대'}님이 공유한 계좌 ${summary.sharedAccountCount}개를 합산했어요`
      : `공유 중인 계좌 ${summary.sharedAccountCount}개 · ${formatNumber(summary.sharedTotalKrw)}원은 '${spaceName}'에서 합산돼요`
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 7, marginTop: 16, paddingTop: 14, fontSize: 12, lineHeight: 1.5,
        borderTop: `0.5px solid ${deep ? 'var(--deep-divider)' : 'var(--track)'}`, color: deep ? 'var(--deep-label)' : 'var(--text-weak)',
      }}
    >
      <Icon name="group" size={16} style={{ flex: 'none' }} />
      <span>{text}</span>
    </div>
  )
}

export function EmptyState({
  text,
  ctaLabel,
  ctaIcon = 'add',
  onCta,
  deep,
  style,
}: {
  text: string
  ctaLabel?: string
  ctaIcon?: string
  onCta?: () => void
  deep?: boolean
  style?: CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={deep ? EMPTY_TEXT_STYLE_DEEP : EMPTY_TEXT_STYLE}>{text}</div>
      {ctaLabel && onCta && (
        <button onClick={onCta} className="qbtn" style={deep ? DASHED_CTA_STYLE_DEEP : DASHED_CTA_STYLE}>
          <Icon name={ctaIcon} size={16} />
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
