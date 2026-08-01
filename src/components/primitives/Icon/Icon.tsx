// Source: secret/Asset Manager v14.dc.html L340-353 (.ms class, 150 usages) — the class body itself
// lives in src/styles/base.css; this component is just a typed wrapper around `<span class="ms">`.

import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  color?: string
  style?: CSSProperties
  className?: string
}

export function Icon({ name, size, color, style, className }: IconProps) {
  return (
    <span
      className={className ? `ms ${className}` : 'ms'}
      style={{ fontSize: size, color, ...style }}
    >
      {name}
    </span>
  )
}
