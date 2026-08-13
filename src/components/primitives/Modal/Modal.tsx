// Source: secret/Asset Manager v14.dc.html L1379-1396 (modalAddAccount — the confirmed instance this
// shell is built from). Scrim (position:fixed;inset:0;background:var(--overlay-scrim)) + centered panel
// (surface/radius10/shadow-modal) is consistent structure across the 14 modals, but width/padding/
// maxHeight/overflow AND z-index are NOT uniform — modalAddAccount itself uses z-index:90, not the
// §7-1 "1st-level modal = 80" default, so every caller must pass its own literal zIndex/width/panelStyle
// read from that modal's own dc.html block. Nothing here is a safe-to-reuse default.
//
// Mobile (<=767px, docs/mobile.md §4): the panel becomes a bottom sheet. `panelStyle` is still merged in
// (so callers keep their padding/overflow tweaks), but width/borderRadius/maxHeight are re-applied AFTER
// panelStyle so a caller's desktop-only values for those three (e.g. an explicit width or 90vh maxHeight)
// can never win on mobile. zIndex is untouched — callers' §7-1 nesting order still applies.

import type { CSSProperties, ReactNode } from 'react'
import { useIsMobile } from '../../../utils/useMediaQuery'

interface ModalProps {
  onClose: () => void
  zIndex: number
  width: number | string
  panelStyle?: CSSProperties
  children: ReactNode
}

export function Modal({ onClose, zIndex, width, panelStyle, children }: ModalProps) {
  const isMobile = useIsMobile()

  const basePanelStyle: CSSProperties = isMobile
    ? {
        background: 'var(--surface)',
        borderRadius: '10px 10px 0 0',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
        width: '100%',
        maxWidth: '100%',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
      }
    : {
        background: 'var(--surface)',
        borderRadius: 10,
        padding: 30,
        width,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'visible',
        boxShadow: 'var(--shadow-modal)',
      }

  // `padding` is forced too: EditAccountModal passes a desktop padding ('42px 30px') that would drop the
  // safe-area bottom inset, leaving the sheet's last row under the iPhone home indicator.
  const mobileForcedStyle: CSSProperties | undefined = isMobile
    ? {
        width: '100%',
        borderRadius: '10px 10px 0 0',
        maxHeight: '88vh',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
      }
    : undefined

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex,
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isMobile ? 'sheet-up' : undefined}
        style={{
          ...basePanelStyle,
          ...panelStyle,
          ...mobileForcedStyle,
        }}
      >
        {isMobile && (
          // flexShrink:0 matters for callers whose panelStyle makes the panel itself a flex container
          // (currently only TermsDetailOverlay, via `display:'flex', flexDirection:'column'`) — without it,
          // this 4px bar is a shrinkable flex item like any other, and once panel content forces the
          // maxHeight clamp to kick in, shrinkage gets distributed by flex-basis share and this shrinks
          // right along with everything else (down to ~2px, not 0, but visibly squashed). The other 15
          // Modal callers leave panelStyle's `display` at the block default, so the grabber isn't a flex
          // item there and this has no effect on them.
          <div
            aria-hidden="true"
            style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px', flexShrink: 0 }}
          />
        )}
        {children}
      </div>
    </div>
  )
}

// Source: dc.html L1387-1396 (modalAddAccount header) — icon-square + title + close button.
// Confirmed against one instance; diff against each modal's own header before reuse (extraction discipline).
interface ModalHeaderProps {
  icon: string
  title: string
  onClose: () => void
}

export function ModalHeader({ icon, title, onClose }: ModalHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="ms" style={{ fontSize: 20 }}>
            {icon}
          </span>
        </span>
        <div style={{ fontSize: 16.5, fontWeight: 700 }}>{title}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: 'none',
          background: 'var(--track)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <span className="ms" style={{ fontSize: 19, color: 'var(--text-mid)' }}>
          close
        </span>
      </button>
    </div>
  )
}
