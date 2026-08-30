// `.ms` 클래스(src/styles/base.css)를 감싼 타입 붙은 래퍼. 앱의 모든 아이콘이 이걸 쓴다.

import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  color?: string
  style?: CSSProperties
  className?: string
  /** 순수 장식용이라 스크린리더가 리거처 텍스트(예: "lock")를 그대로 읽으면 안 되는 경우에만 true로
   * 넘긴다 — 보통은 옆이나 부모(예: role="group" aria-label)가 이미 의미를 전달하는 자리다. */
  ariaHidden?: boolean
}

export function Icon({ name, size, color, style, className, ariaHidden }: IconProps) {
  return (
    <span
      className={className ? `ms ${className}` : 'ms'}
      style={{ fontSize: size, color, ...style }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  )
}
