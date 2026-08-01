// Source: secret/Asset Manager v14.dc.html L3828-3832 — transcribed verbatim.

export interface NotificationItem {
  id: string
  icon: string
  bg: string
  color: string
  title: string
  desc: string
  time: string
}

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'nf0', icon: 'savings', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', title: '예적금 만기 임박', desc: '카카오뱅크 적금 만기까지 D−167', time: '오늘 09:00' },
  { id: 'nf1', icon: 'receipt_long', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', title: '이번 달 지출 현황', desc: '이번 달 지출 5,260,000원 · 저축률 40%', time: '오늘 08:30' },
  { id: 'nf2', icon: 'flag', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', title: '연간 목표를 설정해보세요', desc: '아직 연간 자산 목표가 없어요 · 지금 설정하기', time: '어제 21:12' },
]
