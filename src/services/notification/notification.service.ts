import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { NotificationListParams, NotificationListResponse, StreamTicketResponse } from './notification.type'

export async function getNotifications(params: NotificationListParams = {}) {
  return unwrap(await api.get<ApiResponse<NotificationListResponse>>('/notifications', { params }))
}

/**
 * 읽음 처리. 서버는 read: true만 받는다 — false로 "읽음 취소"를 시도하면 400이다.
 * 응답에 data가 없어(Void) unwrap을 쓰지 않는다.
 */
export async function patchNotificationRead(notificationId: number) {
  await api.patch(`/notifications/${notificationId}`, { read: true })
}

/** 전체 읽음 처리. 본문 규칙은 위와 같다. */
export async function patchAllNotificationsRead() {
  await api.patch('/notifications', { read: true })
}

/** SSE 접속용 1회용 티켓 발급. */
export async function issueStreamTicket() {
  return unwrap(await api.post<ApiResponse<StreamTicketResponse>>('/notifications/stream/tickets'))
}
