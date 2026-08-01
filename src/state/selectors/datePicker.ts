// Source: secret/Asset Manager v14.dc.html L3928-3969 (makeDatePicker factory) — transcribed verbatim,
// ported to a hook over AppStateContext. Reuses existing `dpNav`/`dpPicked`/`openDropdown` AppState
// fields. The `open` flag is namespaced with a `dp_` prefix (distinct from the plain dropdown-key
// namespace `useDropdown` uses) — that prefix is the source's own scheme, not invented here.

import type { CSSProperties } from 'react'
import { useAppState } from '../AppStateContext'
import { DP_MONTH_NAMES, daysInMonth, firstWeekday } from '../../utils/date'

interface DateNav {
  y: number
  m: number
}

interface DateCell {
  d: number | ''
  cellStyle: CSSProperties
  pick?: () => void
}

export interface DatePickerState {
  value: string
  open: boolean
  toggle: () => void
  monthLabel: string
  prevMonth: () => void
  nextMonth: () => void
  cells: DateCell[]
}

const HIDDEN_CELL_STYLE: CSSProperties = {
  visibility: 'hidden',
  pointerEvents: 'none',
  width: 28,
  height: 28,
  border: 'none',
  background: 'transparent',
}

export function useDatePicker(key: string, defaultDisplay: string, defaultNav: DateNav = { y: 2026, m: 7 }): DatePickerState {
  const { state, setState } = useAppState()
  const dpNav = state.dpNav as Record<string, DateNav>
  const dpPicked = state.dpPicked as Record<string, DateNav & { d: number }>

  const nav = dpNav[key] || defaultNav
  const picked = dpPicked[key]
  const value = picked ? `${picked.y}.${String(picked.m).padStart(2, '0')}.${String(picked.d).padStart(2, '0')}` : defaultDisplay

  const dim = daysInMonth(nav.y, nav.m)
  const startDow = firstWeekday(nav.y, nav.m)
  const cells: DateCell[] = []
  for (let i = 0; i < startDow; i++) {
    cells.push({ d: '', cellStyle: HIDDEN_CELL_STYLE })
  }
  for (let d = 1; d <= dim; d++) {
    const isSel = !!(picked && picked.y === nav.y && picked.m === nav.m && picked.d === d)
    cells.push({
      d,
      cellStyle: {
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11.5,
        fontWeight: 600,
        justifySelf: 'center',
        background: isSel ? 'var(--accent)' : 'transparent',
        color: isSel ? '#fff' : 'var(--text-strong)',
      },
      pick: () =>
        setState((st) => ({
          dpPicked: { ...st.dpPicked, [key]: { y: nav.y, m: nav.m, d } },
          openDropdown: null,
        })),
    })
  }

  return {
    value,
    open: state.openDropdown === 'dp_' + key,
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'dp_' + key ? null : 'dp_' + key })),
    monthLabel: `${nav.y}년 ${DP_MONTH_NAMES[nav.m - 1]}`,
    prevMonth: () =>
      setState((st) => {
        const cur = (st.dpNav as Record<string, DateNav>)[key] || defaultNav
        const m = cur.m === 1 ? 12 : cur.m - 1
        const y = cur.m === 1 ? cur.y - 1 : cur.y
        return { dpNav: { ...st.dpNav, [key]: { y, m } } }
      }),
    nextMonth: () =>
      setState((st) => {
        const cur = (st.dpNav as Record<string, DateNav>)[key] || defaultNav
        const m = cur.m === 12 ? 1 : cur.m + 1
        const y = cur.m === 12 ? cur.y + 1 : cur.y
        return { dpNav: { ...st.dpNav, [key]: { y, m } } }
      }),
    cells,
  }
}
