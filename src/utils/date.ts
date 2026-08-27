// Source: secret/Asset Manager v14.dc.html L3925-3927 — transcribed verbatim.

import type { DateRange } from '@/services/common.type'

export const DP_MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

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
// 정산월 라벨링 규칙(답변서 2장 확정): 정산월은 "시작일이 속한 달"로 이름 붙는다.
// monthStartDay=15면 6/28도 7/1도 7/14도 전부 정산 6월이다(정산 6월 = 6/15~7/14). 이건 새로 정한
// 게 아니라 기존 서버 동작(가계부·대시보드·목표)과 일치하는 확정 규칙이다.
//
// 다만 이 규칙을 실제로 계산에 반영하려면 monthStartDay별 정산월 경계(periodStart/periodEnd)가
// 필요한데, 아직 GET /users/me/settlements 연동 전이라 아래 계산 로직은 손대지 않았다 — 기본
// 커서는 여전히 달력 연·월을 그대로 쓴다. 서버 확인 후 이 엔드포인트로 교체할 것.

export interface YearMonthCursor {
  year: number
  month: number
}

export function todayYearMonth(): YearMonthCursor {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
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
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// --- DatePicker(state/selectors/datePicker.ts) ↔ 서버 LocalDate 변환 -------
// useDatePicker의 cell.pick()은 { y, m, d }를 dpPicked[key]에 직접 쓰므로(선택기 자체를 수정하지
// 않는다는 제약), 폼 제출 시점에 이 형태를 서버가 받는 'YYYY-MM-DD'로 변환하는 헬퍼가 필요하다.

/** DatePicker가 dpPicked[key]에 저장하는 { y, m, d } → 'YYYY-MM-DD'. */
export function pickedToISODate(picked: { y: number; m: number; d: number }): string {
  return toISODate(new Date(picked.y, picked.m - 1, picked.d))
}

/** 'YYYY-MM-DD' → DatePicker 표시 형식 'YYYY.MM.DD'. */
export function isoDateToDisplay(iso: string): string {
  return iso.replaceAll('-', '.')
}

/** 'YYYY-MM-DD' → useDatePicker의 defaultNav({y,m}). 파싱 실패 시 undefined(훅 자체 기본값 사용). */
export function isoDateToNav(iso: string | null): { y: number; m: number } | undefined {
  if (!iso) return undefined
  const [y, m] = iso.split('-').map(Number)
  if (!y || !m) return undefined
  return { y, m }
}

// --- 가계부 주간 뷰 ----------------------------------------------------------
// 서버가 정산월의 시작·종료일(periodStart/periodEnd)을 안 내려주므로(2장, docs/backend-request.md)
// "정산월 안에서 몇째 주"를 정확히 계산할 근거가 없다. 대신 순수 달력 기준 주(월요일 시작)로 계산한다
// — monthStartDay가 1이 아닌 사용자에게는 "몇째 주"·"어느 달"이 실제 정산월과 어긋날 수 있는 한계를
// 그대로 안고 간다(백엔드가 기간 경계를 제공하면 이 절 전체를 정산월 기준으로 교체해야 한다).

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
 * 이 주(월~일)가 "몇 월"에 속하는지 결정한다. ISO 8601이 주-연도를 그 주의 목요일 기준으로 정하는
 * 것과 같은 방식으로, 이 주의 목요일이 속한 달을 그 주의 "소속 달"로 본다(정산월이 아니라 달력월
 * 기준 — 위 절 설명 참고).
 */
export function weekOwnerYearMonth(mondayIso: string): YearMonthCursor {
  return yearMonthOf(addDays(mondayIso, 3))
}

/** 소속 달의 월요일 시작 달력 격자에서 이 주가 몇 번째 행(1-base)인지. */
export function weekIndexInMonth(mondayIso: string): number {
  const { year, month } = weekOwnerYearMonth(mondayIso)
  const startDow = firstWeekday(year, month)
  const firstRowMonday = addDays(`${year}-${String(month).padStart(2, '0')}-01`, -startDow)
  const diffDays = Math.round(
    (new Date(`${mondayIso}T00:00:00`).getTime() - new Date(`${firstRowMonday}T00:00:00`).getTime()) / 86400000,
  )
  return Math.floor(diffDays / 7) + 1
}

/** 소속 달의 달력 격자 1행이 시작하는 월요일('YYYY-MM-DD'). weekIndexInMonth의 "몇 번째 행"
 * 계산 기준이며, 아래 firstOwnedWeekMonday의 내부 후보 계산에도 쓰인다. */
export function firstMondayOfMonthGrid(year: number, month: number): string {
  const startDow = firstWeekday(year, month)
  return addDays(`${year}-${String(month).padStart(2, '0')}-01`, -startDow)
}

/**
 * (year, month)를 "소속 달"(weekOwnerYearMonth, 목요일 기준)로 갖는 가장 이른 주의 월요일.
 *
 * 달력 격자 1행(firstMondayOfMonthGrid)은 그 달이 금·토·일에 시작하면 목요일이 전달에 걸려
 * "소속 달"이 실제로는 전달이 되어버린다(예: 2026-02는 일요일 시작 → 격자 1행 월요일은
 * 2026-01-26이고, 그 주 목요일 2026-01-29는 1월 소속). switchToWeek(월간→주간 전환 시 기본 주
 * 선택)이 이 격자-1행 기준을 쓰면, 라벨/목록 제목/switchToMonth가 공통으로 쓰는 소속 달 기준
 * (weekOwnerYearMonth)과 서로 다른 답을 내 "2월 보다가 주간 전환 → 1월로 표시 → 다시 월간 전환
 * → 1월로 이동"하는 왕복 불일치가 생긴다.
 *
 * 이를 막기 위해 "월간 → 주간 기본 주"도 반드시 weekOwnerYearMonth 기준으로 통일한다: 달의 1일이
 * 속한 주가 이미 이 달 소속이면 그 주를, 아니면(1일이 금/토/일이라 그 주가 전달 소속이면) 다음
 * 주를 반환한다 — 이렇게 고르면 반환값의 weekOwnerYearMonth가 항상 (year, month)와 정확히
 * 일치하므로 월간→주간→월간 왕복이 항상 제자리로 돌아온다.
 */
export function firstOwnedWeekMonday(year: number, month: number): string {
  const day1 = `${year}-${String(month).padStart(2, '0')}-01`
  const candidate = mondayOf(day1)
  const owner = weekOwnerYearMonth(candidate)
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
