// Source: secret/Asset Manager v14.dc.html L1730-1756 (ddEntryDate trigger + panel) — transcribed
// verbatim. Trigger uses `calendar_month` icon (not `expand_more`, unlike Dropdown). Parent element
// must have `position:relative` (used as the desktop pre-measurement fallback anchor — see below).
//
// Mobile (<=767px, docs/mobile.md §4 warning + §5 touch targets): the fixed `width:240` panel is
// replaced with a `position:fixed` viewport anchor (see usePopoverAnchor) so it can't overflow off
// the side of the screen when its trigger sits in a narrow column (e.g. two DatePickers in a flex row),
// and can't be clipped by the bottom sheet's `overflow-y:auto`. Day cells also grow from 28px to 40px —
// as close to the 44px touch-target minimum as a 7-column grid allows within a 360px-wide screen.
//
// Desktop: the panel used to always open below the trigger via `position:absolute; top: calc(100% + 6px)`
// under the `position:relative` field. That's clipped whenever the trigger sits low enough in a modal
// panel that the popover would spill past the panel's own bottom edge — Modal.tsx's default desktop
// panel style is `overflow:visible`, but most callers override it with their own `overflow:auto` (see
// `grep -rn "panelStyle=" src/`) so the *panel* can scroll, which clips the popover the same way the
// mobile sheet does. Fixed instead of scrolled: like mobile, the panel switches to `usePopoverAnchor`'s
// `position:fixed` viewport anchor, positioned at the trigger's own `rect.left` with the fixed 240px
// width kept as-is (only the mobile layout goes full-bleed) and clamped so it can't run past the right
// edge of the viewport either. Before the trigger is measured (`anchor.rect` is `undefined`, i.e. the
// render right after `dp.open` flips true but before the `useLayoutEffect` measurement lands) the panel
// falls back to the original `position:absolute` placement so it never renders unstyled.
//
// `openAbove`/`maxHeight` alone aren't enough once the panel is `position:fixed`: `usePopoverAnchor`'s
// default flip threshold is a "comfortable" constant (160px), not the calendar's actual height, and a
// 5-or-6-row month is taller than that (~230-260px desktop, more on mobile's 40px cells). Between 160px
// and the real height, the panel used to open below "because there's enough room" and then get its own
// last row clipped by its `maxHeight`+`overflow-y:auto` — reproduced by rendering this component in a
// real browser with the trigger positioned in that dead zone (a static read of the code alone wouldn't
// have caught it, since `maxHeight`+`overflow-y:auto` reads as "safe" clipping until you check what's
// actually visible above the fold). Fixed by measuring the panel's own `scrollHeight` (unaffected by its
// `overflow` value, so it stays accurate even while clipped) via `panelRef`/`naturalHeight` below and
// passing that real height to `usePopoverAnchor` as `preferredHeight` instead of relying on its default —
// `openAbove` then only flips when doing so actually avoids clipping (or, if neither direction has room
// for the whole grid, still picks whichever side has more of it, same as before).

import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../Icon/Icon'
import type { DatePickerState } from '../../../state/selectors/datePicker'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../usePopoverAnchor'

const DESKTOP_PANEL_WIDTH = 240

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']
const MOBILE_CELL_SIZE = { width: 40, height: 40 }
const MOBILE_NAV_BUTTON_SIZE = { width: 40, height: 40 }

interface DatePickerProps {
  dp: DatePickerState
}

export function DatePicker({ dp }: DatePickerProps) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)
  // 패널 자체의 실측 높이(scrollHeight) — overflow로 잘려 있어도 항상 잘리기 전 전체 높이를 돌려주므로,
  // 아직 잘못된 방향으로 열려 있는 렌더에서 재도 정확하다(위 헤더 주석 참고). dp.open이 꺼지면 다음에
  // 열릴 때(달이 바뀌어 있을 수 있음) 새로 재기 위해 리셋한다.
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (!dp.open) {
      setNaturalHeight(undefined)
      return
    }
    const el = panelRef.current
    if (el) setNaturalHeight(el.scrollHeight)
  }, [dp.open, dp.cells.length, isMobile])

  // 모바일·데스크톱 둘 다 position:fixed 앵커링이 필요해 dp.open만으로 활성화한다(위 헤더 주석 참고).
  const anchor = usePopoverAnchor(dp.open, naturalHeight)

  // 데스크톱: rect.left에 고정폭(240px) 팝오버를 앵커링하되 뷰포트 오른쪽 밖으로 넘치지 않게 클램프한다.
  // top/bottom은 anchor.style(모바일 풀블리드용)이 이미 같은 GAP 공식으로 계산해둔 값을 그대로 쓴다.
  const desktopFixedStyle = !isMobile && anchor.rect && anchor.style
    ? {
        position: 'fixed' as const,
        left: Math.min(anchor.rect.left, window.innerWidth - DESKTOP_PANEL_WIDTH - POPOVER_VIEWPORT_MARGIN),
        right: 'auto' as const,
        top: anchor.style.top,
        bottom: anchor.style.bottom,
        maxHeight: anchor.maxHeight,
        overflowY: 'auto' as const,
      }
    : undefined

  return (
    <>
      <div
        ref={anchor.anchorRef}
        onClick={dp.toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dp.value}</span>
        <Icon name="calendar_month" size={20} color="var(--text-weak)" />
      </div>
      {dp.open && (
        <div
          ref={panelRef}
          onClick={stopPropagation}
          style={{
            // position:absolute + calc(100%+6px) 아래는 데스크톱에서 앵커 측정 전(anchor.rect === undefined)
            // 첫 렌더에만 쓰이는 폴백이다 — 측정이 끝나면 desktopFixedStyle이 아래에서 덮어쓴다.
            position: 'absolute', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 12,
            zIndex: 95, width: DESKTOP_PANEL_WIDTH,
            ...(anchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            ...(isMobile
              ? { ...anchor.style, width: 'auto', maxHeight: anchor.maxHeight, overflowY: 'auto' }
              : desktopFixedStyle),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              onClick={dp.prevMonth}
              style={{
                width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined),
              }}
            >
              <Icon name="chevron_left" size={16} color="var(--text-mid)" />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dp.monthLabel}</span>
            <button
              onClick={dp.nextMonth}
              disabled={dp.nextDisabled}
              style={{
                width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)',
                cursor: dp.nextDisabled ? 'default' : 'pointer', opacity: dp.nextDisabled ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined),
              }}
            >
              <Icon name="chevron_right" size={16} color="var(--text-mid)" />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 3, fontSize: 10, color: 'var(--text-weak)', textAlign: 'center', marginBottom: 4 }}>
            {WEEKDAY_HEADERS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 3 }}>
            {dp.cells.map((c, i) => (
              <button
                key={i}
                className="mini-hov"
                onClick={c.pick}
                style={isMobile && c.d !== '' ? { ...c.cellStyle, ...MOBILE_CELL_SIZE } : c.cellStyle}
              >
                {c.d}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
