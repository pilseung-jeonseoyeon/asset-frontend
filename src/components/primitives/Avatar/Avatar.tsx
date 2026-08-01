// Source: ds_rules_v2_5.md §13-2/13-3/13-4/13-5 (avatar spec) + dc.html L3616-3621 (avatarInitial logic,
// transcribed verbatim) + L751-756 (S/36px sidebar usage, ds_rules cross-checked).
// Circle 999px, --deep-bg background, --deep-value letter (weight 700, letter-spacing -0.01em), border
// 0.5px solid var(--deep-border) (transparent in light / visible in dark — token already encodes that,
// no theme branching needed here). No shadow, no ball-terminal/logo motif (avatar != brand mark, §13-1).

import { Icon } from '../Icon/Icon'

export type AvatarSize = 'xs' | 's' | 'm' | 'l'

const SIZE_MAP: Record<AvatarSize, { diameter: number; letterSize: number }> = {
  xs: { diameter: 24, letterSize: 10 },
  s: { diameter: 36, letterSize: 14 },
  m: { diameter: 52, letterSize: 21 },
  l: { diameter: 96, letterSize: 38 },
}

export function getAvatarInitial(name: string): string | null {
  const nameTrim = (name || '').trim()
  const firstChar = nameTrim.charAt(0)
  const isLatin = /^[A-Za-z]/.test(firstChar)
  return nameTrim ? (isLatin ? firstChar.toUpperCase() : firstChar) : null
}

interface AvatarProps {
  name: string
  size: AvatarSize
}

export function Avatar({ name, size }: AvatarProps) {
  const { diameter, letterSize } = SIZE_MAP[size]
  const initial = getAvatarInitial(name)

  return (
    <div
      style={{
        width: diameter,
        height: diameter,
        borderRadius: 999,
        background: 'var(--deep-bg)',
        border: '0.5px solid var(--deep-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {initial ? (
        <span
          style={{
            fontSize: letterSize,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--deep-value)',
          }}
        >
          {initial}
        </span>
      ) : (
        <Icon name="person" size={diameter * 0.44} color="var(--deep-label)" />
      )}
    </div>
  )
}
