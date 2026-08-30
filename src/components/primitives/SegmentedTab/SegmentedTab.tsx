// state/selectors/tabStyles.ts의 스타일 계산 함수
// (segmentedTabStyle/deepCardTabStyle/dashboardTabStyle)를 감싼 얇은 래퍼.
//
// 모바일(<=767px, docs/mobile.md §5 — 터치 영역 44px): 위 스타일들은 padding만 줘서 탭 높이가
// 44px에 한참 못 미친다. 모바일에서만 44px 터치 영역으로 키우고, 긴 라벨이나 네 개짜리 탭 줄
// (예: LedgerEntryModal의 수입/지출/저축/이체)이 라벨을 자르지 않게 막는다. 데스크톱은 그대로다.

import type { CSSProperties, ReactNode } from 'react'
import { segmentedTabStyle, deepCardTabStyle, dashboardTabStyle } from '../../../state/selectors/tabStyles'
import { useIsMobile } from '../../../utils/useMediaQuery'

interface SegmentedTabProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'deep' | 'dashboard'
  style?: CSSProperties
}

const MOBILE_STYLE: CSSProperties = {
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export function SegmentedTab({ active, onClick, children, variant = 'default', style }: SegmentedTabProps) {
  const isMobile = useIsMobile()
  const base = variant === 'deep' ? deepCardTabStyle(active) : variant === 'dashboard' ? dashboardTabStyle(active) : segmentedTabStyle(active)
  return (
    <button onClick={onClick} style={{ ...base, ...(isMobile ? MOBILE_STYLE : undefined), ...style }}>
      {children}
    </button>
  )
}
