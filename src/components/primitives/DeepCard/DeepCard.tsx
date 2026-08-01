// Source: secret/Asset Manager v14.dc.html L858-868 (총 자산 hero card, first instance) + .deep-card
// class (base.css, border: 0.5px solid var(--deep-border) — transparent in light, visible in dark per
// ds_rules_v2_5.md §2-3). Only --deep-* tokens may be used inside (ds_rules §1-3).

import type { CSSProperties, ReactNode } from 'react'

interface DeepCardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function DeepCard({ children, style, className }: DeepCardProps) {
  return (
    <section
      className={className ? `deep-card ${className}` : 'deep-card'}
      style={{
        background: 'var(--deep-bg)',
        borderRadius: 10,
        padding: '30px 32px',
        color: 'var(--deep-value)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </section>
  )
}
