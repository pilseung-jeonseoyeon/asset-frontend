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
  /** true면 현재 보이는 달이 이미 maxDate가 속한 달이라 다음 달로 넘어갈 필요가 없다(모두 미래). */
  nextDisabled: boolean
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

/**
 * @param maxISO 'YYYY-MM-DD' — 지정하면 이 날짜 이후는 선택할 수 없다(비활성 표시 + pick 없음),
 *   다음 달 이동도 그 달까지만 허용한다. 매매·환전처럼 미래 일자가 성립하지 않는 폼에서만 쓴다 —
 *   가계부 거래 날짜에는 적용하지 않는다(예정 지출을 미리 기록할 수 있어야 하는 제품 결정, 별도 확인 전까지 보류).
 */
export function useDatePicker(
  key: string,
  defaultDisplay: string,
  defaultNav: DateNav = { y: 2026, m: 7 },
  maxISO?: string,
): DatePickerState {
  const { state, setState } = useAppState()
  const dpNav = state.dpNav as Record<string, DateNav>
  const dpPicked = state.dpPicked as Record<string, DateNav & { d: number }>

  const nav = dpNav[key] || defaultNav
  const picked = dpPicked[key]
  const value = picked ? `${picked.y}.${String(picked.m).padStart(2, '0')}.${String(picked.d).padStart(2, '0')}` : defaultDisplay

  const [maxY, maxM, maxD] = maxISO ? maxISO.split('-').map(Number) : [null, null, null]
  const isMonthPastMax = maxY !== null && maxM !== null && (nav.y > maxY || (nav.y === maxY && nav.m > maxM))

  const dim = daysInMonth(nav.y, nav.m)
  const startDow = firstWeekday(nav.y, nav.m)
  const cells: DateCell[] = []
  for (let i = 0; i < startDow; i++) {
    cells.push({ d: '', cellStyle: HIDDEN_CELL_STYLE })
  }
  for (let d = 1; d <= dim; d++) {
    const isSel = !!(picked && picked.y === nav.y && picked.m === nav.m && picked.d === d)
    const isFuture =
      isMonthPastMax || (maxY !== null && maxM !== null && maxD !== null && nav.y === maxY && nav.m === maxM && d > maxD)
    cells.push({
      d,
      cellStyle: {
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        cursor: isFuture ? 'default' : 'pointer',
        fontFamily: 'inherit',
        fontSize: 11.5,
        fontWeight: 600,
        justifySelf: 'center',
        background: isSel ? 'var(--accent)' : 'transparent',
        color: isFuture ? 'var(--text-weak)' : isSel ? '#fff' : 'var(--text-strong)',
        opacity: isFuture ? 0.45 : 1,
      },
      pick: isFuture
        ? undefined
        : () =>
            setState((st) => ({
              dpPicked: { ...st.dpPicked, [key]: { y: nav.y, m: nav.m, d } },
              openDropdown: null,
            })),
    })
  }

  // 이미 maxISO가 속한 달을 보고 있으면 그 다음 달은 전부 미래라 이동할 이유가 없다.
  const nextDisabled = maxY !== null && maxM !== null && nav.y === maxY && nav.m === maxM

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
    nextMonth: nextDisabled
      ? () => {}
      : () =>
          setState((st) => {
            const cur = (st.dpNav as Record<string, DateNav>)[key] || defaultNav
            const m = cur.m === 12 ? 1 : cur.m + 1
            const y = cur.m === 12 ? cur.y + 1 : cur.y
            return { dpNav: { ...st.dpNav, [key]: { y, m } } }
          }),
    nextDisabled,
    cells,
  }
}
