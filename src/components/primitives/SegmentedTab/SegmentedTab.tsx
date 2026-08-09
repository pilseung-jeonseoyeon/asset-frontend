// Thin element wrapper around the style-computing functions in state/selectors/segTab.ts
// (segTab/segTabDeep/tabStyle, transcribed verbatim from dc.html L3563-3569/3643-3649).
//
// Mobile (<=767px, docs/mobile.md §5 — 44px touch targets): the selector-provided styles size the tab to
// its text (padding only, no min-height), which lands well under 44px tall. On mobile we grow the tab to
// a 44px touch target and guard against long/four-tab rows (e.g. LedgerEntryModal's 수입/지출/저축/이체)
// clipping their label instead of wrapping awkwardly. Desktop styling is untouched.

import type { CSSProperties, ReactNode } from 'react'
import { segTab, segTabDeep, tabStyle } from '../../../state/selectors/segTab'
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
  const base = variant === 'deep' ? segTabDeep(active) : variant === 'dashboard' ? tabStyle(active) : segTab(active)
  return (
    <button onClick={onClick} style={{ ...base, ...(isMobile ? MOBILE_STYLE : undefined), ...style }}>
      {children}
    </button>
  )
}
