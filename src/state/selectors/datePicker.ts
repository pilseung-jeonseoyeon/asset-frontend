// Source: secret/Asset Manager v14.dc.html L3928-3969 (makeDatePicker factory) — transcribed verbatim,
// ported to a hook over AppStateContext. Reuses existing `dpNav`/`dpPicked`/`openDropdown` AppState
// fields. The `open` flag is namespaced with a `dp_` prefix (distinct from the plain dropdown-key
// namespace `useDropdown` uses) — that prefix is the source's own scheme, not invented here.
//
// 연도 그리드(yearCells, 2026-08-18 추가): 개설일·만기일처럼 오늘에서 수십 년 떨어진 날짜를 고를 때
// chevron 한 달씩 이동으로는 사실상 못 쓴다는 지적으로 추가했다. 연도 목록·연도 셀 강조·연도 선택 시
// nav 갱신은 전부 계산이라 이 파일(셀렉터)에 두고, "지금 연도 그리드를 보여줄지"라는 순수 UI 전환
// 상태만 DatePicker.tsx가 로컬 useState로 갖는다(기존 "계산은 셀렉터, 렌더는 컴포넌트" 경계 유지).
// 범위는 오늘 기준 -50년~+50년이고, maxISO가 있으면 그 연도를 상한으로 자른다(매매·환전일처럼 미래가
// 성립하지 않는 폼). 강조는 실제로 고른 날짜(dpPicked)가 아니라 지금 보고 있는 달(dpNav.y) 기준이다
// — 아직 날짜를 고르지 않았어도 지금 탐색 중인 연도가 어디인지는 알려줘야 한다.

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

interface YearCell {
  y: number
  /** 지금 탐색 중인 연도(dpNav.y)와 같은가 — 실제로 고른 날짜(dpPicked)가 아니라 nav 기준이다(파일
   *  상단 주석 참고). 강조 스타일뿐 아니라 연도 그리드를 열 때 스크롤 위치를 맞추는 기준으로도 쓴다. */
  isNavYear: boolean
  cellStyle: CSSProperties
  pick: () => void
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
  /** 오늘 기준 -50년~+50년(maxISO가 있으면 그 연도가 상한) 연도 선택 그리드. 팝오버가 닫혀 있으면
   *  계산 자체를 건너뛰고 빈 배열이다(아래 훅 본문 주석 참고). */
  yearCells: YearCell[]
  /** 오늘이 속한 연/월로 nav를 되돌린다(maxISO가 있으면 그 상한을 넘지 않게 clamp). 연도 그리드에서
   *  수십 년 전/후로 이동한 뒤 다시 오늘로 돌아오려고 100여 개 목록을 스크롤하지 않아도 되게 한다. */
  goToday: () => void
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
 * 아직 고른 날짜가 없을 때 달력이 처음 펼쳐지는 달. 원본은 목업이라 `{ y: 2026, m: 7 }`이 상수로
 * 박혀 있었는데, 그대로 두면 시간이 지날수록 모든 달력이 2026년 7월에서 열린다(2026-08-20 확인 —
 * 계좌 등록의 개설일·만기일이 지난달에서 열렸다). 오늘이 속한 달에서 열도록 계산으로 바꿨다.
 */
function currentNav(): DateNav {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1 }
}

/**
 * @param maxISO 'YYYY-MM-DD' — 지정하면 이 날짜 이후는 선택할 수 없다(비활성 표시 + pick 없음),
 *   다음 달 이동도 그 달까지만 허용한다. 매매·환전처럼 미래 일자가 성립하지 않는 폼에서만 쓴다 —
 *   가계부 거래 날짜에는 적용하지 않는다(예정 지출을 미리 기록할 수 있어야 하는 제품 결정, 별도 확인 전까지 보류).
 */
export function useDatePicker(
  key: string,
  defaultDisplay: string,
  defaultNav: DateNav = currentNav(),
  maxISO?: string,
): DatePickerState {
  const { state, setState } = useAppState()
  const dpNav = state.dpNav as Record<string, DateNav>
  const dpPicked = state.dpPicked as Record<string, DateNav & { d: number }>
  const open = state.openDropdown === 'dp_' + key

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

  // 연도 그리드: 오늘 기준 -50/+50년, maxISO가 있으면 그 연도를 상한으로 자른다(nextDisabled와 같은
  // 근거 — 매매·환전일처럼 미래가 성립하지 않는 폼에서 그 이후 연도를 애초에 고를 수 없게 한다).
  //
  // minYear도 maxY로 같이 눌러준다(리뷰 지적) — maxISO가 "오늘-50년"보다도 과거인 극단적인 경우(현재
  // 호출부에는 없지만), upperYear만 clamp하면 minYear(오늘-50년)가 오히려 maxY보다 미래라 그 해의
  // 날짜가 전부 비활성인 막다른 연도 하나만 남는다. minYear를 maxY와 함께 낮춰주면 두 값이 정확히
  // maxY로 수렴해 최소 하나는 고를 수 있는 연도(=maxISO가 속한 연도)가 남는다.
  const todayY = new Date().getFullYear()
  const todayM = new Date().getMonth() + 1
  const minYear = maxY !== null ? Math.min(todayY - 50, maxY) : todayY - 50
  const upperYear = maxY !== null ? Math.min(todayY + 50, maxY) : todayY + 50
  // 100여 개 연도 객체(+ 각각 style 객체)를 매 렌더 새로 만드는 비용을 막는다 — AppState는 단일
  // reducer라 이 달력과 무관한 입력 한 글자만 바뀌어도 useDatePicker를 쓰는 모든 컴포넌트가 리렌더된다
  // (리뷰 지적). 팝오버가 닫혀 있을 때는 화면에 쓰이지 않으니 계산 자체를 건너뛰고, 열리는 순간의
  // 렌더에서는 이미 open이 true이므로 그 즉시 채워져 필요한 시점엔 항상 값이 있다.
  const yearCells: YearCell[] = []
  if (open) {
    for (let y = minYear; y <= upperYear; y++) {
      const isNavYear = y === nav.y
      yearCells.push({
        y,
        isNavYear,
        cellStyle: {
          padding: '8px 0',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 700,
          textAlign: 'center',
          background: isNavYear ? 'var(--accent)' : 'transparent',
          color: isNavYear ? '#fff' : 'var(--text-strong)',
        },
        pick: () =>
          setState((st) => {
            const cur = (st.dpNav as Record<string, DateNav>)[key] || defaultNav
            // 고른 연도가 maxISO가 속한 연도인데 지금 보던 달이 그 이후 달이면, 전부 미래라 고를 수 있는
            // 날이 하나도 없는 달로 떨어뜨리지 않도록 maxISO가 속한 달로 같이 당겨온다.
            const m = maxY !== null && maxM !== null && y === maxY && cur.m > maxM ? maxM : cur.m
            return { dpNav: { ...st.dpNav, [key]: { y, m } } }
          }),
      })
    }
  }

  return {
    value,
    open,
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
    yearCells,
    goToday: () =>
      setState((st) => {
        // maxISO 상한과 같은 규칙으로 오늘을 clamp한다 — 매매·환전일 달력에서 오늘이 상한을 넘을 일은
        // 없지만(오늘 자체가 상한 근거), 방어적으로 동일한 규칙을 적용해둔다.
        const y = maxY !== null && todayY > maxY ? maxY : todayY
        const m = maxY !== null && maxM !== null && y === maxY && todayM > maxM ? maxM : todayM
        return { dpNav: { ...st.dpNav, [key]: { y, m } } }
      }),
  }
}
