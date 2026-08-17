// Shared by Dropdown/DatePicker (mobile only, docs/mobile.md §4's own warning): both popovers are
// `position:absolute` under a `position:relative` field wrapper on desktop, which only works because
// desktop modal panels use `overflow:visible` (Modal.tsx). The mobile bottom sheet needs
// `overflow-y:auto` so it can scroll, and a caller's field can be much narrower than the popover's own
// content (e.g. two DatePickers side by side in a flex row) — an absolutely positioned popover can then
// get clipped by the sheet's scroll box or pushed off the right edge of the screen.
//
// On mobile we anchor the popover with `position:fixed` off the trigger's on-screen rect instead: fixed
// positioning is resolved against the viewport, so it escapes the sheet's overflow clipping entirely
// (as long as no transformed ancestor exists — the sheet's own mount transition is a CSS `animation`,
// not a persistent `transform`, so this holds once `.sheet-up` finishes). `left`/`right` are pinned to a
// fixed viewport margin so width and horizontal position never depend on the trigger's own column width,
// and vertical placement flips above the trigger when there isn't enough room below.

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

const VIEWPORT_MARGIN = 12
const GAP = 6
// Below this much space, prefer flipping the popover above the trigger instead of below it.
const MIN_COMFORTABLE_SPACE = 160

interface TriggerRect {
  top: number
  bottom: number
}

export interface MobilePopoverAnchor {
  /** Attach to the trigger element (must wrap the same node the desktop version treats as `position:relative` anchor). */
  anchorRef: RefObject<HTMLDivElement | null>
  /** `undefined` when inactive or not yet measured — callers fall back to their desktop absolute style. */
  style: CSSProperties | undefined
  /** Available px in the chosen direction, for callers that need to cap their own `maxHeight`/`overflow`. */
  maxHeight: number | undefined
  /**
   * Same flip decision `style` bakes into `top`/`bottom` for the mobile fixed-position case — exposed
   * separately so a desktop `position:absolute` caller (DatePicker.tsx) can flip its own `top`↔`bottom`
   * without switching to fixed positioning. `false` when inactive or not yet measured (matches the
   * original "always opens below" default).
   */
  openAbove: boolean
}

export function useMobilePopoverAnchor(active: boolean): MobilePopoverAnchor {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<TriggerRect | null>(null)

  useLayoutEffect(() => {
    if (!active) {
      setRect(null)
      return
    }
    const update = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, bottom: r.bottom })
    }
    update()
    window.addEventListener('resize', update)
    // Scroll events don't bubble, but the capture phase still travels through every ancestor on the way
    // to the target — listening on `document` with `capture:true` catches scrolling inside the sheet.
    document.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
    }
  }, [active])

  if (!rect) {
    return { anchorRef, style: undefined, maxHeight: undefined, openAbove: false }
  }

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN - GAP
  const spaceAbove = rect.top - VIEWPORT_MARGIN - GAP
  const openAbove = spaceBelow < MIN_COMFORTABLE_SPACE && spaceAbove > spaceBelow

  return {
    anchorRef,
    openAbove,
    style: {
      position: 'fixed',
      left: VIEWPORT_MARGIN,
      right: VIEWPORT_MARGIN,
      // Both `top` and `bottom` must always be set explicitly (one to a px value, the other to `auto`):
      // callers merge this on top of a desktop style object that already sets `top` (e.g. `calc(100% +
      // 6px)`), and leaving the unused edge unset here would let that stale desktop value survive the
      // merge — with both `top` and `bottom` present, `position:fixed` stretches the box to fill the gap
      // between them instead of sizing from content, which can collapse it to zero height.
      top: openAbove ? 'auto' : rect.bottom + GAP,
      bottom: openAbove ? window.innerHeight - rect.top + GAP : 'auto',
    },
    maxHeight: Math.max(0, openAbove ? spaceAbove : spaceBelow),
  }
}
