import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { NotificationListParams, NotificationListResponse } from './notification.type'

/** 커서(id) 페이지네이션. 최신순, limit 기본 20·최대 100. unreadCount 는 페이지와 무관한 전체 값. */
export async function getNotifications(params: NotificationListParams = {}) {
  return rpc<NotificationListResponse>('list_notifications', {
    p_cursor: params.cursor ?? null,
    p_limit: params.limit ?? 20,
    p_unread_only: params.unreadOnly ?? false,
  })
}

/** 읽음 처리(read_at). 읽음 취소는 없다. 다른 열은 트리거가 막는다(NOTIFICATION_READ_ONLY). */
export async function patchNotificationRead(notificationId: number) {
  const uid = await currentUserId()
  unwrapResult(
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', uid).is('read_at', null).select('id'),
  )
}

/** 내 안 읽은 알림 전체 읽음 처리. */
export async function patchAllNotificationsRead() {
  const uid = await currentUserId()
  unwrapResult(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null).select('id'))
}
