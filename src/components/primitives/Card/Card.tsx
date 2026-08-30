// 카드 껍데기. surface/border/radius/shadow/padding은 고정이고, 레이아웃(flex/grid, gap)과
// padding 덮어쓰기는 인스턴스마다 `style`로 넘긴다. hover 그림자는 .card-hov(src/styles/base.css).

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
