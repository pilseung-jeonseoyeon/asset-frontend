// 아바타 스펙: ds_rules_v2_5.md §13-2~13-5.
// 원 999px, --deep-bg 배경, --deep-value 글자(weight 700, letter-spacing -0.01em), 테두리
// 0.5px solid var(--deep-border) — 라이트에서 투명, 다크에서 보이는 것까지 토큰이 이미 담고
// 있어 테마 분기가 필요 없다. 그림자도, 브랜드 모티프도 넣지 않는다(아바타는 로고가 아니다, §13-1).

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
