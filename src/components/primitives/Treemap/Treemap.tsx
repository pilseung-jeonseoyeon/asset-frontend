// Source: secret/Asset Manager v14.dc.html L1079-1124 (자산 지도 treemap blocks) — transcribed verbatim.
// .tmap-block hover scale/brightness lives in base.css. The tooltip's hover-reveal (`style-hover`,
// mapTipHover: {opacity:1}, L4559) is a dc-runtime-specific mechanism — reimplemented here with local
// hover state, same pattern as SidebarNav's NavButton.
// `perf`/`perfAmt` are optional (not `string`) because the real asset distribution API
// (GET /assets/distribution) has no performance/return figures — only mock data had them. The tooltip
// simply omits that line when absent instead of inventing a placeholder value.
//
// Mobile (<=767px, docs/mobile.md §5): `:hover` never fires on touch, so a hover-only tooltip would never
// be reachable. Each block already has its own tap action (`b.open`, opens the category detail modal),
// so gating the tooltip behind a second tap would shadow that primary action instead of complementing
// it — showing the tooltip unconditionally (per docs/mobile.md §5's own fallback) avoids a second hidden
// gesture. Render tiers (full/medium/icon) and the <5% "기타" merge are untouched.

import { useState } from 'react'
import { Icon } from '../Icon/Icon'
import { useIsMobile } from '../../../utils/useMediaQuery'

export interface TreemapBlock {
  id: string
  label: string
  icon: string
  amtFmt: string
  pct: number
  widthPct: number
  tint: string
  fg: string
  accent: string
  showHeader: boolean
  showIconOnly: boolean
  cursor: 'pointer' | 'default'
  isEtc?: boolean
  subs?: string[]
  perf?: string
  perfAmt?: string
  open?: () => void
}

function TreemapTile({ b }: { b: TreemapBlock }) {
  const isMobile = useIsMobile()
  const [hovered, setHovered] = useState(false)
  const tooltipVisible = isMobile || hovered

  return (
    <div
      className="tmap-block"
      onClick={b.open}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', flexGrow: b.widthPct, flexBasis: 0, minWidth: 56, borderRadius: 10,
        background: b.tint, padding: '12px 10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: b.cursor,
      }}
    >
      {b.showHeader && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: b.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {b.label}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: b.fg, opacity: 0.6 }}>{b.pct}%</div>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: b.fg, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.amtFmt}원
          </div>
        </>
      )}

      {b.showIconOnly && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={b.icon} size={16} color={b.accent} />
          </span>
        </div>
      )}

      <div
        className="tmap-tip"
        style={{
          opacity: tooltipVisible ? 1 : 0, pointerEvents: 'none', position: 'absolute', left: 8, right: 8, bottom: 8,
          background: 'var(--deep-bg)', borderRadius: 10, padding: '10px 12px', boxShadow: 'var(--shadow-pop)', transition: 'opacity .15s ease',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
          {b.label} · {b.pct}%
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--deep-label)', marginTop: 4 }}>{b.amtFmt}원</div>
        {b.isEtc ? (
          <div style={{ fontSize: 10, color: 'var(--deep-label)', marginTop: 6, lineHeight: 1.6 }}>
            {(b.subs || []).map((es) => (
              <div key={es}>{es}</div>
            ))}
          </div>
        ) : (
          b.perf && (
            <div style={{ fontSize: 10.5, color: 'var(--deep-label)', marginTop: 4 }}>
              이번 달 {b.perf} · {b.perfAmt}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function Treemap({ blocks }: { blocks: TreemapBlock[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 236 }}>
      {blocks.map((b) => (
        <TreemapTile key={b.id} b={b} />
      ))}
    </div>
  )
}
