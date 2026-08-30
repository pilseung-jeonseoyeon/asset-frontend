// Shared by Dropdown/DatePicker. Both popovers are `position:absolute` under a `position:relative` field
// wrapper by default, which relies on every ancestor up to the modal panel leaving them unclipped. That
// assumption doesn't hold in either direction:
// - Mobile: the bottom sheet needs `overflow-y:auto` so it can scroll, and a caller's field can be much
// narrower than the popover's own content (e.g. two DatePickers side by side in a flex row) — an
// absolutely positioned popover can get clipped by the sheet's scroll box or pushed off the right edge
// of the screen.
// - Desktop: Modal.tsx's own default panel style is `overflow:visible`, but most callers override it via
// `panelStyle={{ maxHeight: '86vh'~'90vh', overflow: 'auto' }}` (see `grep -rn "panelStyle=" src/`) so
// the panel can scroll its own content — which clips an absolutely positioned popover the same way the
// mobile sheet does whenever the trigger sits low enough in the panel that the popover would spill past
// the panel's bottom edge.
//
// Both cases get the same fix: anchor the popover with `position:fixed` off the trigger's on-screen rect
// instead of `position:absolute` under it. Fixed positioning is resolved against the viewport, so it
// escapes the ancestor's overflow clipping entirely (as long as no transformed ancestor exists — Modal's
// mobile-only mount transition is a CSS `animation`, not a persistent `transform`, so this holds once
// `.sheet-up` finishes; the desktop panel never has one). `openAbove` flips the popover above the trigger
// when there isn't enough room below, and `maxHeight` caps the popover's own height (with internal
// scrolling) when neither direction has enough room — the modal itself never scrolls to reveal it.
//
// Mobile and desktop consumers use this differently: Dropdown/DatePicker's mobile layout pins `left`/
// `right` to a fixed viewport margin (`style` below) so the popover spans the screen regardless of the
// trigger's own column width. DatePicker's desktop layout keeps its fixed 240px width and anchors `left`
// to the trigger's own `rect.left` instead — `rect` is exposed raw for that case.

import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'

export const POPOVER_VIEWPORT_MARGIN = 12
export const POPOVER_GAP = 6
// Fallback flip threshold for a caller that doesn't know its own content height up front (Dropdown: the
// option list's height varies with its data, so there's no single "did it fit" answer to measure against
// — a comfortable constant is the best available heuristic). A caller that DOES know its content height
// (DatePicker: the calendar's height is a deterministic function of cell size × row count) should pass it
// via `preferredHeight` instead — see that param's own doc below for why the constant alone caused a
// clipping regression once popovers became `position:fixed`.
const DEFAULT_MIN_COMFORTABLE_SPACE = 160

interface TriggerRect {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * 소프트 키보드가 가리고 남은 "실제로 보이는" 높이. `window.innerHeight`(레이아웃 뷰포트)는 iOS·
 * Android 모두 키보드가 올라와도 줄지 않으므로, 그 값으로 아래 여백을 계산하면 키보드가 차지한
 * 영역까지 "비어 있다"고 판정한다. 그러면 팝오버가 아래로 열리고 그 아래는 통째로 키보드다 —
 * 사용자 눈에는 검색을 해도 아무 일이 안 일어나는 것처럼 보인다(AccountHoldingsField의 종목 검색은
 * 키보드가 떠 있는 상태에서만 쓰는 유일한 팝오버라 이 문제가 여기서만 드러났다, 수정).
 *
 * `visualViewport.height`는 키보드가 가린 만큼 줄어든다. 트리거 rect는 레이아웃 뷰포트 좌표계라,
 * 키보드가 뜨면서 페이지가 밀려 올라간 만큼(`offsetTop`)을 더해 같은 좌표계로 맞춘다.
 * 미지원 브라우저에서는 예전과 똑같이 `innerHeight`로 떨어진다.
 */
function visibleViewportBounds(): { top: number; bottom: number } {
  const vv = typeof window !== 'undefined' ? window.visualViewport : undefined
  if (!vv) return { top: 0, bottom: window.innerHeight }
  return { top: vv.offsetTop, bottom: vv.height + vv.offsetTop }
}

export interface PopoverAnchor {
  /** Attach to the trigger element (must wrap the same node the desktop-absolute fallback treats as `position:relative` anchor). */
  anchorRef: RefObject<HTMLDivElement | null>
  /** Full-bleed fixed style (viewport-margin `left`/`right`, ignores the trigger's own width) — the mobile bottom-sheet layout. `undefined` when inactive or not yet measured — callers fall back to their desktop absolute style. */
  style: CSSProperties | undefined
  /** Raw viewport rect of the trigger, for a caller that anchors a fixed-width popover under the trigger's own left edge instead of the full-bleed `style` above (DatePicker's desktop layout). `undefined` when inactive or not yet measured. */
  rect: TriggerRect | undefined
  /** Available px in the chosen direction, for callers that need to cap their own `maxHeight`/`overflow`. */
  maxHeight: number | undefined
  /**
   * Same flip decision `style`/`rect` bake into `top`/`bottom` — exposed separately so a caller building
   * its own fixed (or, pre-measurement, absolute) style can flip `top`↔`bottom` on its own. `false` when
   * inactive or not yet measured (matches the original "always opens below" default).
   */
  openAbove: boolean
}

/**
 * @param preferredHeight The popover's own content height in px, when the caller can compute or measure
 * it (DatePicker does — see its own comment). Below this much room, `openAbove` flips instead of
 * opening below-but-clipped-to-`maxHeight`. Defaults to a fixed "comfortable" heuristic for a caller
 * whose content height varies with data and isn't known up front (Dropdown). Passing a value smaller
 * than the popover's *actual* rendered height reproduces the clipping bug this hook exists to fix —
 * `position:fixed` only escapes the *ancestor's* overflow, it doesn't stop the popover's own
 * `maxHeight`+`overflow-y:auto` from clipping its last row if it opens on the side that quietly doesn't
 * have room after all (confirmed by rendering DatePicker in a real browser with a trigger positioned
 * just past this threshold — a wrong `preferredHeight` here reproduces exactly that).
 */
export function usePopoverAnchor(active: boolean, preferredHeight: number = DEFAULT_MIN_COMFORTABLE_SPACE): PopoverAnchor {
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
      setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })
    }
    update()
    window.addEventListener('resize', update)
    // Scroll events don't bubble, but the capture phase still travels through every ancestor on the way
    // to the target — listening on `document` with `capture:true` catches scrolling inside the modal
    // panel/sheet (and the window itself), so a fixed popover never drifts away from its trigger.
    document.addEventListener('scroll', update, true)
    // 소프트 키보드가 열리고 닫히는 것은 `window` resize로 잡히지 않는다(레이아웃 뷰포트가 그대로라
    // 이벤트 자체가 안 나거나, 나더라도 innerHeight가 안 변한다). visualViewport의 resize/scroll이
    // 그 변화를 알려주는 유일한 신호다 — 이걸 듣지 않으면 키보드가 올라온 뒤에도 팝오버가 열릴
    // 방향을 다시 계산하지 않는다(visibleViewportBottom 주석 참고).
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [active])

  if (!rect) {
    return { anchorRef, style: undefined, rect: undefined, maxHeight: undefined, openAbove: false }
  }

  // 여닫을 방향은 "키보드가 가리고 남은 실제 가시 영역" 기준으로 정한다 — innerHeight로 재면 키보드
  // 뒤로 열린다(visibleViewportBounds 주석 참고). 아래의 top/bottom px 값 자체는 그대로 레이아웃
  // 뷰포트 좌표계를 쓴다: position:fixed의 기준 상자는 시각 뷰포트가 아니라 레이아웃 뷰포트다.
  const visible = visibleViewportBounds()
  const spaceBelow = visible.bottom - rect.bottom - POPOVER_VIEWPORT_MARGIN - POPOVER_GAP
  const spaceAbove = rect.top - visible.top - POPOVER_VIEWPORT_MARGIN - POPOVER_GAP
  const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow

  return {
    anchorRef,
    rect,
    openAbove,
    style: {
      position: 'fixed',
      left: POPOVER_VIEWPORT_MARGIN,
      right: POPOVER_VIEWPORT_MARGIN,
      // Both `top` and `bottom` must always be set explicitly (one to a px value, the other to `auto`):
      // callers merge this on top of a desktop style object that already sets `top` (e.g. `calc(100% +
      // 6px)`), and leaving the unused edge unset here would let that stale desktop value survive the
      // merge — with both `top` and `bottom` present, `position:fixed` stretches the box to fill the gap
      // between them instead of sizing from content, which can collapse it to zero height.
      top: openAbove ? 'auto' : rect.bottom + POPOVER_GAP,
      bottom: openAbove ? window.innerHeight - rect.top + POPOVER_GAP : 'auto',
    },
    maxHeight: Math.max(0, openAbove ? spaceAbove : spaceBelow),
  }
}
