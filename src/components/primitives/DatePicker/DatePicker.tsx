// Source: secret/Asset Manager v14.dc.html L1730-1756 (ddEntryDate trigger + panel) — transcribed
// verbatim. Trigger uses `calendar_month` icon (not `expand_more`, unlike Dropdown). Parent element
// must have `position:relative`.

import { Icon } from '../Icon/Icon'
import type { DatePickerState } from '../../../state/selectors/datePicker'
import { stopPropagation } from '../../../state/selectors/modal'

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']

interface DatePickerProps {
  dp: DatePickerState
}

export function DatePicker({ dp }: DatePickerProps) {
  return (
    <>
      <div
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
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 12,
            zIndex: 95, width: 240,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              onClick={dp.prevMonth}
              style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="chevron_left" size={16} color="var(--text-mid)" />
            </button>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dp.monthLabel}</span>
            <button
              onClick={dp.nextMonth}
              style={{ width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              <button key={i} className="mini-hov" onClick={c.pick} style={c.cellStyle}>
                {c.d}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
