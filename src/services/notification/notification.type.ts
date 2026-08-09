// API-SPEC §9.
//
// 실시간 스트림(GET /notifications/stream, SSE)은 아직 붙이지 않았다 — 브라우저 기본
// EventSource는 Authorization 헤더를 실을 수 없어 fetch 기반 클라이언트가 따로 필요하다.
// 지금은 목록 조회(+화면 진입/포커스 시 갱신)만 쓴다.
//
// 참고: 현재 배치가 실제로 만드는 알림은 MATURITY(계좌 만기 임박) 하나뿐이다.
// SYSTEM은 enum에 정의만 되어 있고 생성 로직이 없어 목록이 계속 비어 있을 수 있다(정상).

export type NotificationType = 'MATURITY' | 'SYSTEM'

export interface NotificationResponse {
  id: number
  type: NotificationType
  title: string
  body: string | null
  /** 현재는 'ACCOUNT'만 내려온다 — linkId를 계좌 상세로 연결하면 된다. */
  linkType: string | null
  linkId: number | null
  /** 필드명이 isRead가 아니라 read다. */
  read: boolean
  /** Instant(UTC, 'Z' suffix) — 표시 전 로컬 타임존으로 변환할 것. */
  createdAt: string
}

export interface NotificationListResponse {
  notifications: NotificationResponse[]
  unreadCount: number
}
