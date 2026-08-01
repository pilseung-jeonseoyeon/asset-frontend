// Source: secret/Asset Manager v14.dc.html L359-361 (.qbtn:hover), L412-418 (.pill-btn/:hover) — these
// two named classes (transition + hover transform only) are the only "button system" that exists in the
// source; there is no generic size/variant/padding spec (ds_rules_v2_5.md has none either — confirmed
// gap, see plan). Every real instance's padding/height/colors must be passed in via `style` at the call
// site, transcribed from that button's own line in dc.html — this component never invents a default.

import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'qbtn' | 'pill-btn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
}

export function Button({ variant, className, style, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${variant} ${className}` : variant}
      style={{ fontFamily: 'inherit', ...style }}
      {...rest}
    >
      {children}
    </button>
  )
}
