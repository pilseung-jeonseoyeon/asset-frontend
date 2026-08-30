// 딥 카드 껍데기. 테두리 0.5px solid var(--deep-border)는 라이트에서 투명, 다크에서 보인다
// (ds_rules_v2_5.md §2-3). 안쪽에서는 --deep-* 토큰만 쓸 것(§1-3).

import type { CSSProperties, ReactNode } from 'react'

interface DeepCardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  /** React Query의 isPending을 그대로 연결 — docs/code-convention.md 접근성 절 참고. */
  'aria-busy'?: boolean
}

export function DeepCard({ children, style, className, ...rest }: DeepCardProps) {
  return (
    <section
      className={className ? `deep-card ${className}` : 'deep-card'}
      {...rest}
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
