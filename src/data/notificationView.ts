// 알림 목록 뷰모델 — 헤더 알림 패널(NotificationPanel)이 쓴다.
// 서버는 알림 종류(type)와 심각도(severity)만 주고 아이콘·색은 주지 않는다("표현은 클라이언트 자유").
// 아이콘은 종류로, 색은 심각도로 정한다. 목표 달성만 좋은 소식이라 심각도와 무관하게 초록(up)으로 둔다.

import type { NotificationResponse, NotificationSeverity, NotificationType } from '@/services/notification'

const TYPE_ICON: Record<NotificationType, string> = {
  MATURITY: 'savings',
  RECURRING_EXPENSE: 'repeat',
  PAYMENT_DUE: 'event_upcoming',
  GOAL_ACHIEVED: 'emoji_events',
  SYSTEM: 'campaign',
}

export interface NotificationTone {
  bg: string
  fg: string
}

const SEVERITY_TONE: Record<NotificationSeverity, NotificationTone> = {
  INFO: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  WARN: { bg: 'var(--down-chip)', fg: 'var(--down)' },
  CRITICAL: { bg: 'var(--down)', fg: '#FFFFFF' },
}
const GOAL_TONE: NotificationTone = { bg: 'var(--up-chip)', fg: 'var(--up)' }

export function notificationIconOf(type: NotificationType): string {
  return TYPE_ICON[type] ?? 'notifications'
}

export function notificationToneOf(nf: Pick<NotificationResponse, 'type' | 'severity'>): NotificationTone {
  if (nf.type === 'GOAL_ACHIEVED') return GOAL_TONE
  return SEVERITY_TONE[nf.severity] ?? SEVERITY_TONE.INFO
}

export interface NotificationGroup {
  label: string
  items: NotificationResponse[]
}

function localDayKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * 서버 순서(최신순)를 유지한 채 로컬 달력 날짜 기준으로 묶는다. 빈 묶음은 뺀다.
 * 오늘 · 어제 · 최근 7일(2~7일 전) · 최근 30일(8~30일 전) · 30일 이전(31일 이상 전).
 */
export function groupNotificationsByDay(list: NotificationResponse[], now: Date = new Date()): NotificationGroup[] {
  const today = localDayKey(now)
  const groups: NotificationGroup[] = [
    { label: '오늘', items: [] },
    { label: '어제', items: [] },
    { label: '최근 7일', items: [] },
    { label: '최근 30일', items: [] },
    { label: '30일 이전', items: [] },
  ]
  for (const nf of list) {
    // 서머타임이 없는 KST에서도 자정 기준 키끼리의 차이라 반올림하면 정확히 일 수가 된다.
    const daysAgo = Math.round((today - localDayKey(new Date(nf.createdAt))) / 86_400_000)
    const bucket = daysAgo <= 0 ? 0 : daysAgo === 1 ? 1 : daysAgo <= 7 ? 2 : daysAgo <= 30 ? 3 : 4
    groups[bucket].items.push(nf)
  }
  return groups.filter((g) => g.items.length > 0)
}
