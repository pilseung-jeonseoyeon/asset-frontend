import type { DateRange } from '@/services/common.type'

export const DATE_PICKER_MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

// Monday-first weekday index (0=Mon..6=Sun), matching the source's `(getDay()+6)%7` remap.
export function firstWeekday(y: number, m: number): number {
  return (new Date(y, m - 1, 1).getDay() + 6) % 7
}

// --- 정산월 커서 -----------------------------------------------------------
// 대부분의 서버 API가 year/month를 파라미터로 받고, 실제 기간 경계는 서버가 사용자 설정
// monthStartDay로 계산한다. 프론트는 "어느 정산월을 보고 있는지"만 들고 있으면 된다.
//
// 정산월 라벨링 규칙(백엔드 확정): 정산월은 "시작일이 속한 달"로 이름 붙는다.
// monthStartDay=15면 6/28도 7/1도 7/14도 전부 정산 6월이다(정산 6월 = 6/15~7/14). 이건 새로 정한
// 게 아니라 기존 서버 동작(가계부·대시보드·목표)과 일치하는 확정 규칙이다.
//
// "지금이 어느 정산월인가"의 정본은 서버(GET /users/me/settlements/current)다 — 화면은
// useCurrentSettlementMonth()(src/utils/useCurrentSettlementMonth.ts)로 읽는다. 아래 todayYearMonth는
// 달력 연·월 그대로라 monthStartDay가 1이 아니면 틀린다(예: 28일 시작, 9/26 → 정산 8월인데 9를 돌려줌).
// 앱 부팅 직후 AppState 초기값처럼 서버 응답 전에만 쓰는 임시값으로 남겨 둔다.
//
// 가계부 달력·주간 뷰처럼 "임의의 날짜가 어느 정산월인가"는 서버에 날짜 단위 API가 없어 아래
// settlementMonthOf/settlementPeriodOf가 같은 규칙으로 계산한다. 서버가 라벨링 규칙을 바꾸면(예: 끝나는
// 달 기준) 이 두 함수만 고치면 된다 — useCurrentSettlementMonth가 서버 값과 어긋나면 콘솔에 경고한다.

export interface YearMonthCursor {
  year: number
  month: number
}

export function todayYearMonth(): YearMonthCursor {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * 이 날짜('YYYY-MM-DD')가 속한 정산월. 시작일이 속한 달로 라벨링한다 — monthStartDay가 28이면
 * 9/26은 정산 8월(8/28~9/27), 9/28은 정산 9월이다. monthStartDay가 1이면 달력 연·월과 같다.
 */
export function settlementMonthOf(iso: string, monthStartDay: number): YearMonthCursor {
  const cursor = yearMonthOf(iso)
  return Number(iso.slice(8, 10)) >= monthStartDay ? cursor : shiftYearMonth(cursor, -1)
}

/** 정산월의 첫날·마지막 날('YYYY-MM-DD', 양끝 포함). monthStartDay는 1~28이라 모든 달에 그 날이 있다. */
export function settlementPeriodOf({ year, month }: YearMonthCursor, monthStartDay: number): DateRange {
  const dayOf = (c: YearMonthCursor) =>
    `${c.year}-${String(c.month).padStart(2, '0')}-${String(monthStartDay).padStart(2, '0')}`
  return { from: dayOf({ year, month }), to: addDays(dayOf(shiftYearMonth({ year, month }, 1)), -1) }
}

/** 정산월 커서를 delta개월 이동한다(음수면 과거). */
export function shiftYearMonth({ year, month }: YearMonthCursor, delta: number): YearMonthCursor {
  const zeroBased = year * 12 + (month - 1) + delta
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 }
}

/** '2026년 6월' */
export function yearMonthLabel({ year, month }: YearMonthCursor): string {
  return `${year}년 ${month}월`
}

/** Date → 'YYYY-MM-DD' (서버 LocalDate 포맷). 로컬 타임존 기준이라 toISOString을 쓰지 않는다. */
export function toISODate(d: Date): string {
  const monthText = String(d.getMonth() + 1).padStart(2, '0')
  const dayText = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${monthText}-${dayText}`
}

// --- DatePicker(state/selectors/datePicker.ts) ↔ 서버 LocalDate 변환 -------
// useDatePicker의 cell.pick()은 { y, m, d }를 datePickerPicked[key]에 직접 쓰므로(선택기 자체를 수정하지
// 않는다는 제약), 폼 제출 시점에 이 형태를 서버가 받는 'YYYY-MM-DD'로 변환하는 헬퍼가 필요하다.

/** DatePicker가 datePickerPicked[key]에 저장하는 { y, m, d } → 'YYYY-MM-DD'. */
export function pickedToISODate(picked: { y: number; m: number; d: number }): string {
  return toISODate(new Date(picked.y, picked.m - 1, picked.d))
}

/** 'YYYY-MM-DD' → DatePicker 표시 형식 'YYYY.MM.DD'. */
export function isoDateToDisplay(iso: string): string {
  return iso.replaceAll('-', '.')
}

/** 'YYYY-MM-DD' → useDatePicker의 defaultViewingMonth({y,m}). 파싱 실패 시 undefined(훅 자체 기본값 사용). */
export function isoDateToViewingMonth(iso: string | null): { y: number; m: number } | undefined {
  if (!iso) return undefined
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return undefined
  return { y, m }
}

// --- 가계부 주간 뷰 ----------------------------------------------------------
// 주는 월요일 시작 달력 주다. 그 주가 "어느 정산월 소속인가"는 목요일이 속한 정산월로 정한다(ISO 8601이
// 주-연도를 목요일로 정하는 방식). monthStartDay를 생략하면 1(=달력월)로 계산해 예전 동작과 같다.

/** 주어진 날짜가 속한 주의 월요일('YYYY-MM-DD'). */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const dow = (d.getDay() + 6) % 7 // 0=월..6=일
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

/** iso 날짜에서 delta일 이동(음수면 과거). */
export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

/** 월요일부터 시작하는 7일치 날짜 배열. */
export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i))
}

/** 'YYYY-MM-DD' → { year, month }. */
export function yearMonthOf(iso: string): YearMonthCursor {
  const [year, month] = iso.split('-').map(Number)
  return { year, month }
}

/**
 * 이 주(월~일)가 어느 정산월에 속하는지 결정한다. ISO 8601이 주-연도를 그 주의 목요일 기준으로 정하는
 * 것과 같은 방식으로, 이 주의 목요일이 속한 정산월을 그 주의 "소속 달"로 본다.
 */
export function monthOfWeek(mondayIso: string, monthStartDay = 1): YearMonthCursor {
  return settlementMonthOf(addDays(mondayIso, 3), monthStartDay)
}

/** 소속 정산월의 달력 격자(정산월 첫날이 든 주가 1행)에서 이 주가 몇 번째 행(1-base)인지. */
export function weekIndexInMonth(mondayIso: string, monthStartDay = 1): number {
  const periodStart = settlementPeriodOf(monthOfWeek(mondayIso, monthStartDay), monthStartDay).from
  const startDow = (new Date(`${periodStart}T00:00:00`).getDay() + 6) % 7 // 0=월..6=일(firstWeekday와 같은 기준)
  const firstRowMonday = addDays(periodStart, -startDow)
  const diffDays = Math.round(
    (new Date(`${mondayIso}T00:00:00`).getTime() - new Date(`${firstRowMonday}T00:00:00`).getTime()) / 86400000,
  )
  return Math.floor(diffDays / 7) + 1
}

/** 소속 달의 달력 격자 1행이 시작하는 월요일('YYYY-MM-DD'). weekIndexInMonth의 "몇 번째 행"
 * 계산 기준이며, 아래 firstMondayBelongingToMonth의 내부 후보 계산에도 쓰인다. */
export function firstMondayOfMonthGrid(year: number, month: number): string {
  const startDow = firstWeekday(year, month)
  return addDays(`${year}-${String(month).padStart(2, '0')}-01`, -startDow)
}

/**
 * (year, month)를 "소속 달"(monthOfWeek, 목요일 기준)로 갖는 가장 이른 주의 월요일.
 *
 * 달력 격자 1행(firstMondayOfMonthGrid)은 그 달이 금·토·일에 시작하면 목요일이 전달에 걸려
 * "소속 달"이 실제로는 전달이 되어버린다(예: 2026년 2월은 일요일 시작 → 격자 1행 월요일은
 * 1월 26일이고, 그 주 목요일인 1월 29일은 1월 소속). switchToWeek(월간→주간 전환 시 기본 주
 * 선택)이 이 격자-1행 기준을 쓰면, 라벨/목록 제목/switchToMonth가 공통으로 쓰는 소속 달 기준
 * (monthOfWeek)과 서로 다른 답을 내 "2월 보다가 주간 전환 → 1월로 표시 → 다시 월간 전환
 * → 1월로 이동"하는 왕복 불일치가 생긴다.
 *
 * 이를 막기 위해 "월간 → 주간 기본 주"도 반드시 monthOfWeek 기준으로 통일한다: 정산월 첫날이
 * 속한 주가 이미 이 달 소속이면 그 주를, 아니면(1일이 금/토/일이라 그 주가 전달 소속이면) 다음
 * 주를 반환한다 — 이렇게 고르면 반환값의 monthOfWeek가 항상 (year, month)와 정확히
 * 일치하므로 월간→주간→월간 왕복이 항상 제자리로 돌아온다.
 */
export function firstMondayBelongingToMonth(year: number, month: number, monthStartDay = 1): string {
  const day1 = settlementPeriodOf({ year, month }, monthStartDay).from
  const candidate = mondayOf(day1)
  const owner = monthOfWeek(candidate, monthStartDay)
  return owner.year === year && owner.month === month ? candidate : addDays(candidate, 7)
}

/** 주어진 날짜가 속한 해의 12월 31일('YYYY-MM-DD'). 자산 목표 시점처럼 "올해 말"이 기본값인 폼에서 쓴다. */
export function yearEndISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-12-31`
}

/**
 * 오늘로부터 최근 monthsBack개월의 DateRange('YYYY-MM-DD', 양끝 포함). "최근 N개월"을 기간으로
 * 받는 조회에서 쓴다(현재는 가계부 입력의 최근 내역 추천). 양끝이 모두 필수인 파라미터에 맞춘 형태다.
 */
export function recentMonthsRange(monthsBack: number, today: Date = new Date()): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  // setMonth()는 대상 월의 일수를 넘기면 다음 달로 넘어간다(8/31에서 6개월 전 → 2/31 → 3/2).
  // 그러면 "최근 6개월"이 실제로는 5개월 남짓이 되어 2월 초 스냅샷이 통째로 빠진다.
  // 목표 월의 말일로 clamp해서 막는다.
  const lastDayOfTargetMonth = new Date(y, m - monthsBack + 1, 0).getDate()
  const from = new Date(y, m - monthsBack, Math.min(d, lastDayOfTargetMonth))
  return { from: toISODate(from), to: toISODate(today) }
}
