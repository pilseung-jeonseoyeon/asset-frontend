// 알림 뷰모델 — 헤더 알림 패널(NotificationPanel)과 새 알림 배너(NotificationBanner)가 쓴다.
// 서버는 알림 종류(type)와 심각도(severity)만 주고 아이콘·색은 주지 않는다("표현은 클라이언트 자유").
// 아이콘은 종류로 정한다. 색은 2026-10-31 알림 목록 A안(캔버스 "Monit 알림 목록 시안")부터 답이 필요한 알림(이메일 초대)에만
// 액센트를 쓰고 나머지는 무채색이다 — "색은 의미 있을 때만 작게", 등락색(초록 · 빨강)은 시세 전용(secret/ds_rules_v3.md 0장 · 1-4)이라
// 목표 달성 · 만기 경고에도 쓰지 않는다. 급한 정도는 문구(내일 · D-3 · 오늘)가 말한다.

import type { NotificationResponse, NotificationType } from '@/services/notification'

const TYPE_ICON: Record<NotificationType, string> = {
  MATURITY: 'savings',
  RECURRING_EXPENSE: 'repeat',
  PAYMENT_DUE: 'event_upcoming',
  GOAL_ACHIEVED: 'emoji_events',
  SYSTEM: 'campaign',
  // 가족·커플 공유 — 연결은 고리가 이어지고 끊기는 아이콘, 계좌·목표·거래는 그 대상의 아이콘.
  SHARE_INVITED: 'mail',
  SHARE_ACCEPTED: 'link',
  SHARE_DECLINED: 'person_remove',
  SHARE_ENDED: 'link_off',
  SHARE_ACCOUNT_ADDED: 'account_balance_wallet',
  SHARE_ACCOUNT_REMOVED: 'visibility_off',
  SHARE_GOAL_CHANGED: 'flag',
  SHARE_ENTRIES: 'receipt_long',
}

export interface NotificationTone {
  bg: string
  fg: string
}

const NEUTRAL_TONE: NotificationTone = { bg: 'var(--fill-subtle)', fg: 'var(--text-mid)' }
const ANSWER_TONE: NotificationTone = { bg: 'var(--accent-soft)', fg: 'var(--accent)' }

export function notificationIconOf(type: NotificationType): string {
  return TYPE_ICON[type] ?? 'notifications'
}

export function notificationToneOf(nf: Pick<NotificationResponse, 'type'>): NotificationTone {
  return nf.type === 'SHARE_INVITED' ? ANSWER_TONE : NEUTRAL_TONE
}

/** 짧은 종류 이름 — 알림 줄 아래의 "결제 예정 · 6시간 전", 묶음 배너 본문("결제 예정 1 · 자동 기록 2")에 쓴다. */
const TYPE_KIND_LABEL: Record<NotificationType, string> = {
  MATURITY: '만기',
  RECURRING_EXPENSE: '자동 기록',
  PAYMENT_DUE: '결제 예정',
  GOAL_ACHIEVED: '목표 달성',
  SYSTEM: '공지',
  SHARE_INVITED: '가족 · 커플 공유',
  SHARE_ACCEPTED: '가족 · 커플 공유',
  SHARE_DECLINED: '가족 · 커플 공유',
  SHARE_ENDED: '가족 · 커플 공유',
  SHARE_ACCOUNT_ADDED: '가족 · 커플 공유',
  SHARE_ACCOUNT_REMOVED: '가족 · 커플 공유',
  SHARE_GOAL_CHANGED: '가족 · 커플 공유',
  SHARE_ENTRIES: '가족 · 커플 공유',
}

export function notificationKindLabelOf(type: NotificationType): string {
  return TYPE_KIND_LABEL[type] ?? '알림'
}

/** 종류별 개수를 처음 나온 순서대로 이어 붙인다. 예: "결제 예정 1 · 자동 기록 2". */
export function notificationKindSummaryOf(list: Pick<NotificationResponse, 'type'>[]): string {
  const counts = new Map<string, number>()
  for (const nf of list) {
    const label = notificationKindLabelOf(nf.type)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts].map(([label, count]) => `${label} ${count}`).join(' · ')
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
