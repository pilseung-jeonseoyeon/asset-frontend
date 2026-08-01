// Thin element wrapper around the style-computing functions in state/selectors/segTab.ts
// (segTab/segTabDeep/tabStyle, transcribed verbatim from dc.html L3563-3569/3643-3649).

import type { CSSProperties, ReactNode } from 'react'
import { segTab, segTabDeep, tabStyle } from '../../../state/selectors/segTab'

interface SegmentedTabProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'deep' | 'dashboard'
  style?: CSSProperties
}

export function SegmentedTab({ active, onClick, children, variant = 'default', style }: SegmentedTabProps) {
  const base = variant === 'deep' ? segTabDeep(active) : variant === 'dashboard' ? tabStyle(active) : segTab(active)
  return (
    <button onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  )
}
