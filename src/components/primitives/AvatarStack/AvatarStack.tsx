// 겹쳐 놓은 아바타 줄 — "누가 함께 보는지"를 한눈에. 순서는 계좌 주인 → 멤버 → 대기 중('?' 점선)
// (시안 3번). Avatar 규격(§13)은 그대로 쓰고 겹침만 더한다. 아바타가 많아지면 폭이 끝없이 늘어나므로
// MAX_VISIBLE 뒤는 '+N'으로 접는다.

import { Avatar } from '../Avatar/Avatar'

const MAX_VISIBLE = 4
const DIAMETER = 24
const OVERLAP = -6

interface AvatarStackProps {
  /** 보여줄 이름 순서대로(주인이 첫 번째). */
  names: string[]
  /** 수락을 기다리는 초대 수 — 점선 '?' 아바타로 그린다. */
  pendingCount?: number
}

export function AvatarStack({ names, pendingCount = 0 }: AvatarStackProps) {
  const visible = names.slice(0, MAX_VISIBLE)
  const hidden = names.length - visible.length
  // 대기 아바타는 한 개만 그린다 — 몇 명인지는 옆 문구('대기 N')가 말한다.
  const showPending = pendingCount > 0 && hidden === 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flex: 'none' }} aria-hidden>
      {visible.map((name, i) => (
        <span key={`${name}-${i}`} style={{ marginLeft: i === 0 ? 0 : OVERLAP, borderRadius: 999, boxShadow: '0 0 0 2px var(--surface)', display: 'inline-flex' }}>
          <Avatar name={name} size="xs" />
        </span>
      ))}
      {hidden > 0 && (
        <span
          style={{
            marginLeft: OVERLAP, width: DIAMETER, height: DIAMETER, borderRadius: 999, boxShadow: '0 0 0 2px var(--surface)',
            background: 'var(--track)', color: 'var(--text-mid)', fontSize: 10, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          +{hidden}
        </span>
      )}
      {showPending && (
        <span
          style={{
            marginLeft: OVERLAP, width: DIAMETER, height: DIAMETER, borderRadius: 999, boxSizing: 'border-box',
            border: '1px dashed var(--text-weak)', background: 'var(--surface)', color: 'var(--text-weak)',
            fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ?
        </span>
      )}
    </span>
  )
}
