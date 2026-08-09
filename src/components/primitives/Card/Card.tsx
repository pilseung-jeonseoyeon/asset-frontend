// Source: secret/Asset Manager v14.dc.html L394-400 (.card-hov, hover shadow) + the common card shell
// seen at every card call site (e.g. L878-880): surface/border/radius/shadow/padding are the fixed
// part; layout (flex/grid, gap) and padding overrides are per-instance, passed via `style`.

import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  onClick?: () => void
  /** React Query의 isPending을 그대로 연결 — docs/code-convention.md 접근성 절 참고. */
  'aria-busy'?: boolean
}

export function Card({ children, style, className, onClick, ...rest }: CardProps) {
  return (
    <section
      className={className ? `card-hov ${className}` : 'card-hov'}
      onClick={onClick}
      {...rest}
      style={{
        background: 'var(--surface)',
        borderRadius: 10,
        border: '0.5px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </section>
  )
}
