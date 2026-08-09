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
// 주의: monthStartDay가 1이 아닐 때 오늘이 어느 정산월에 속하는지(예: 6/28이 6월인지 7월인지)는
// API 스펙에 정의되어 있지 않다. 서버와 어긋난 라벨을 만들지 않도록, 기본 커서는 달력 연·월을
// 그대로 쓰고 실제 기간 경계 표기는 서버가 periodStart/periodEnd를 내려줄 때까지 보류한다.

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

/**
 * 오늘로부터 최근 monthsBack개월의 DateRange('YYYY-MM-DD', 양끝 포함). 계좌 잔액 추이처럼
 * "최근 N개월" 스냅샷을 조회하는 곳에서 쓴다. from/to 둘 다 필수인 GET .../snapshots 파라미터에 맞춘다.
 */
export function recentMonthsRange(monthsBack: number, today: Date = new Date()): DateRange {
  const from = new Date(today)
  from.setMonth(from.getMonth() - monthsBack)
  return { from: toISODate(from), to: toISODate(today) }
}
