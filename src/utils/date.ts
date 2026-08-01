// Source: secret/Asset Manager v14.dc.html L3925-3927 — transcribed verbatim.

export const DP_MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

// Monday-first weekday index (0=Mon..6=Sun), matching the source's `(getDay()+6)%7` remap.
export function firstWeekday(y: number, m: number): number {
  return (new Date(y, m - 1, 1).getDay() + 6) % 7
}
