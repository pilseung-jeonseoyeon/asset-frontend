// Source: secret/Asset Manager v14.dc.html L1379-1396 (modalAddAccount — the confirmed instance this
// shell is built from). Scrim (position:fixed;inset:0;background:var(--overlay-scrim)) + centered panel
// (surface/radius10/shadow-modal) is consistent structure across the 14 modals, but width/padding/
// maxHeight/overflow AND z-index are NOT uniform — modalAddAccount itself uses z-index:90, not the
// §7-1 "1st-level modal = 80" default, so every caller must pass its own literal zIndex/width/panelStyle
// read from that modal's own dc.html block. Nothing here is a safe-to-reuse default.

import type { CSSProperties, ReactNode } from 'react'

interface ModalProps {
  onClose: () => void
  zIndex: number
  width: number | string
  panelStyle?: CSSProperties
  children: ReactNode
}

export function Modal({ onClose, zIndex, width, panelStyle, children }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 10,
          padding: 30,
          width,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflow: 'visible',
          boxShadow: 'var(--shadow-modal)',
          ...panelStyle,
        }}
      >
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
