// 알림 API의 createdAt은 UTC Instant('...Z')로 내려온다. `new Date()`는
// 이를 파싱해 로컬 타임존으로 자동 변환하므로 별도 오프셋 계산은 필요 없다.
//
// 표기는 오늘·어제면 '오늘 HH:mm' / '어제 HH:mm', 그보다 오래되면
// 'M월 D일'(같은 해) / 'YYYY.M.D'(다른 해)다.

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatNotificationTime(createdAtUtc: string, now: Date = new Date()): string {
  const date = new Date(createdAtUtc)
  const hm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`

  if (isSameDay(date, now)) return `오늘 ${hm}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return `어제 ${hm}`

  return date.getFullYear() === now.getFullYear()
    ? `${date.getMonth() + 1}월 ${date.getDate()}일`
    : `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}
