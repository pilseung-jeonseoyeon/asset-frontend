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

/** 알림 줄 아래 시간 — 오늘이면 '방금' · 'N분 전' · 'N시간 전', 그 전은 formatNotificationTimeInGroup(어제 묶음은 시각, 더 오래되면 날짜). */
export function formatNotificationAgo(createdAtUtc: string, now: Date = new Date()): string {
  const date = new Date(createdAtUtc)
  if (!isSameDay(date, now)) return formatNotificationTimeInGroup(createdAtUtc, now)
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  return `${Math.floor(minutes / 60)}시간 전`
}

/** 날짜 묶음(오늘/어제) 안에서는 날짜를 다시 적지 않고 시각만 쓴다. 그보다 오래되면 위와 같은 날짜 표기. */
export function formatNotificationTimeInGroup(createdAtUtc: string, now: Date = new Date()): string {
  const full = formatNotificationTime(createdAtUtc, now)
  return full.startsWith('오늘 ') || full.startsWith('어제 ') ? full.slice(3) : full
}
