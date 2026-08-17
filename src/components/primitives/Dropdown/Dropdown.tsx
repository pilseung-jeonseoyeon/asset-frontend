// Source: secret/Asset Manager v14.dc.html L1650-1664 (ddEntryCatMajor/ddEntryCatSub instances) —
// trigger + option-list panel structure transcribed verbatim. maxHeight varies per instance (200px for
// category dropdowns, 180px for account dropdowns, L1657 vs L1692/1716) — passed as a prop, not
// hardcoded. Parent element must have `position:relative` (matches source's per-instance wrapper divs).
//
// Mobile (<=767px, docs/mobile.md §4 warning): the panel switches to a `position:fixed` viewport anchor
// (see usePopoverAnchor) instead of `position:absolute` under the trigger, so it can't be clipped
// by the bottom sheet's `overflow-y:auto` or overflow off-screen when the trigger sits in a narrow
// column (e.g. two fields in a flex row). Desktop layout/positioning is untouched — desktop modal panels
// that override `panelStyle` with their own `overflow:auto` can still clip this panel the same way (see
// DatePicker.tsx for the fix applied there); out of scope here, tracked as a known gap.

import type { ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import type { DropdownState } from '../../../state/selectors/dropdown'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { usePopoverAnchor } from '../usePopoverAnchor'

interface DropdownProps {
  dd: DropdownState
  maxHeight?: number
  icon?: string
  footer?: ReactNode
}

export function Dropdown({ dd, maxHeight = 200, icon = 'expand_more', footer }: DropdownProps) {
  const isMobile = useIsMobile()
  const anchor = usePopoverAnchor(isMobile && dd.open)
  const panelMaxHeight = isMobile && anchor.maxHeight !== undefined ? Math.min(maxHeight, anchor.maxHeight) : maxHeight

  return (
    <>
      <div
        ref={anchor.anchorRef}
        onClick={dd.toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dd.value}</span>
        <Icon name={icon} size={20} color="var(--text-weak)" />
      </div>
      {dd.open && (
        <div
          onClick={stopPropagation}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 6,
            zIndex: 95, maxHeight: panelMaxHeight, overflow: 'auto',
            ...(isMobile ? anchor.style : undefined),
          }}
        >
          {dd.options.map((o) => (
            <button
              key={o.name}
              className="mini-hov"
              onClick={o.pick}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none',
                background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit',
                ...(isMobile ? { minHeight: 44, display: 'flex', alignItems: 'center' } : undefined),
              }}
            >
              {o.name}
            </button>
          ))}
          {footer}
        </div>
      )}
    </>
  )
}
