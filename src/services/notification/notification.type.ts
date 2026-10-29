// 알림. 라이브 OpenAPI(2026-09-26) 기준.
//
// 알림. 목록은 DB 함수 list_notifications(커서 페이지네이션), 새 알림은 Supabase Realtime(notifications INSERT, RLS +
// user_id 필터)으로 받는다(useNotificationStream). 스프링 때의 SSE 티켓은 없다.
// 목록 조회는 커서 기반 페이지네이션이다(최신순, 한 페이지 기본 20건).

/** MATURITY 예적금 만기 임박 · RECURRING_EXPENSE 고정지출 자동 기록 · PAYMENT_DUE 고정지출 결제 예정 ·
 *  GOAL_ACHIEVED 자산 목표 달성 · SYSTEM 공지 ·
 *  SHARE_ACCEPTED 상대가 내 초대 코드로 연결함(초대한 사람) · SHARE_ENDED 상대가 공유 연결을 해제함 (가족·커플 공유 v17) */
export type NotificationType =
  | 'MATURITY'
  | 'RECURRING_EXPENSE'
  | 'PAYMENT_DUE'
  | 'GOAL_ACHIEVED'
  | 'SYSTEM'
  | 'SHARE_ACCEPTED'
  | 'SHARE_ENDED'

/** 서버는 색·아이콘을 주지 않고 이 값으로 매핑하라고 한다(표현은 클라이언트 자유). */
export type NotificationSeverity = 'INFO' | 'WARN' | 'CRITICAL'

/** 클릭 시 이동 대상. linkId와 세트다 — ACCOUNT 계좌 ID, TRANSACTION 가계부 거래 ID,
 *  RECURRING_EXPENSE 고정지출 ID, GOAL 자산 목표 ID, SHARE 공유 연결 ID(알림 카드는 설정 › 가족 · 커플 공유를
 *  연다). null이면 이동 대상이 없는 알림. */
export type NotificationLinkType = 'ACCOUNT' | 'TRANSACTION' | 'RECURRING_EXPENSE' | 'GOAL' | 'SHARE'

export interface NotificationResponse {
  id: number
  type: NotificationType
  severity: NotificationSeverity
  title: string
  body: string | null
  linkType: NotificationLinkType | null
  /** linkType이 null이면 함께 null이다. */
  linkId: number | null
  /** 필드명이 isRead가 아니라 read다. */
  read: boolean
  /** Instant(UTC, 'Z' suffix) — 표시 전 로컬 타임존으로 변환할 것. */
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationResponse[]
  /** 페이지와 무관한 전체 미읽음 수(배지 숫자). */
  unreadCount: number
  hasMore: boolean
  /** 다음 페이지 요청에 그대로 넣을 커서 — hasMore가 false면 null. */
  nextCursor: number | null
}

export interface NotificationListParams {
  unreadOnly?: boolean
  cursor?: number
  limit?: number
}

