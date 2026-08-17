// Source: secret/Asset Manager v14.dc.html L1730-1756 (ddEntryDate trigger + panel) — transcribed
// verbatim. Trigger uses `calendar_month` icon (not `expand_more`, unlike Dropdown). Parent element
// must have `position:relative`.
//
// Mobile (<=767px, docs/mobile.md §4 warning + §5 touch targets): the fixed `width:240` panel is
// replaced with a `position:fixed` viewport anchor (see useMobilePopoverAnchor) so it can't overflow off
// the side of the screen when its trigger sits in a narrow column (e.g. two DatePickers in a flex row),
// and can't be clipped by the bottom sheet's `overflow-y:auto`. Day cells also grow from 28px to 40px —
// as close to the 44px touch-target minimum as a 7-column grid allows within a 360px-wide screen.
//
// Desktop: the panel used to always open below the trigger (`top: calc(100% + 6px)`), which can run
// past the viewport bottom when the trigger sits low in a tall modal (Modal.tsx's desktop panel is
// `overflow:visible`, so nothing clips it — the page just has to be scrolled to see the rest of the
// grid, the reported bug). Reuses useMobilePopoverAnchor's `openAbove` flip decision (that hook already
// computes it for the mobile fixed-position case) to flip `top`↔`bottom` while staying `position:absolute`
// under the trigger — desktop width/panel styling is otherwise unchanged.

import { Icon } from '../Icon/Icon'
import type { DatePickerState } from '../../../state/selectors/datePicker'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useMobilePopoverAnchor } from '../useMobilePopoverAnchor'

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']
const MOBILE_CELL_SIZE = { width: 40, height: 40 }
const MOBILE_NAV_BUTTON_SIZE = { width: 40, height: 40 }

interface DatePickerProps {
  dp: DatePickerState
}

export function DatePicker({ dp }: DatePickerProps) {
  const isMobile = useIsMobile()
  // 모바일뿐 아니라 데스크톱도 openAbove가 필요해 dp.open만으로 활성화한다(위 헤더 주석 참고) —
  // 모바일의 position:fixed 앵커링(anchor.style)만 isMobile로 계속 게이트한다.
  const anchor = useMobilePopoverAnchor(dp.open)

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
          onClick={stopPropagation}
          style={{
            position: 'absolute', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 12,
            zIndex: 95, width: 240,
            ...(anchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            ...(isMobile
              ? { ...anchor.style, width: 'auto', maxHeight: anchor.maxHeight, overflowY: 'auto' }
              : undefined),
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
