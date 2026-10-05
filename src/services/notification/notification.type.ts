// 알림. 라이브 OpenAPI(2026-09-26) 기준.
//
// 새 알림은 SSE(GET /notifications/stream, useNotificationStream)로 받는다. 브라우저 EventSource는
// Authorization 헤더를 실을 수 없어 POST /notifications/stream/tickets로 1회용 티켓을 받아 쿼리로 붙인다.
// 목록 조회는 커서 기반 페이지네이션이다(최신순, 한 페이지 기본 20건).

/** MATURITY 예적금 만기 임박 · RECURRING_EXPENSE 고정지출 자동 기록 · PAYMENT_DUE 고정지출 결제 예정 ·
 *  GOAL_ACHIEVED 자산 목표 달성 · SYSTEM 공지 */
export type NotificationType = 'MATURITY' | 'RECURRING_EXPENSE' | 'PAYMENT_DUE' | 'GOAL_ACHIEVED' | 'SYSTEM'

/** 서버는 색·아이콘을 주지 않고 이 값으로 매핑하라고 한다(표현은 클라이언트 자유). */
export type NotificationSeverity = 'INFO' | 'WARN' | 'CRITICAL'

/** 클릭 시 이동 대상. linkId와 세트다 — ACCOUNT 계좌 ID, TRANSACTION 가계부 거래 ID,
 *  RECURRING_EXPENSE 고정지출 ID, GOAL 자산 목표 ID. null이면 이동 대상이 없는 알림. */
export type NotificationLinkType = 'ACCOUNT' | 'TRANSACTION' | 'RECURRING_EXPENSE' | 'GOAL'

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

/** 1회용 — 연결할 때 소모되므로 재연결마다 다시 발급받는다. */
export interface StreamTicketResponse {
  ticket: string
  expiresInSeconds: number
}
