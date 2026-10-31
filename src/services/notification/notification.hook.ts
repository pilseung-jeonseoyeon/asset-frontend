import { useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '../supabase'
import { queryKeys } from '../queryKeys'
import { getNotifications, patchAllNotificationsRead, patchNotificationRead } from './notification.service'
import type { NotificationListResponse, NotificationResponse, NotificationType } from './notification.type'

interface QueryOptions {
  enabled?: boolean
}

/**
 * 알림 목록(커서 페이지네이션). 첫 페이지만 받아 두고 `fetchNextPage`로 이어 붙인다.
 * 배지 숫자(unreadCount)는 페이지와 무관한 전체 값이라 첫 페이지 응답의 것을 쓴다.
 */
export function useGetNotifications(unreadOnly?: boolean, options?: QueryOptions) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.notification.list(unreadOnly),
    queryFn: ({ pageParam }) => getNotifications({ unreadOnly, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore && last.nextCursor !== null ? last.nextCursor : undefined),
    enabled: options?.enabled,
    // 새 알림은 useNotificationStream이 받아 이 쿼리를 무효화하므로 주기 폴링은 두지 않는다.
    // 포커스 복귀 시 갱신은 스트림이 끊겨 재연결을 기다리는 사이의 빈틈을 메운다.
    refetchOnWindowFocus: true,
  })
  return {
    ...query,
    notifications: query.data?.pages.flatMap((p) => p.notifications) ?? [],
    unreadCount: query.data?.pages[0]?.unreadCount ?? 0,
  }
}

export function usePatchNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) => patchNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
    },
  })
}

export function usePatchAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: patchAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
    },
  })
}

/** Realtime 이 전달한 notifications 행(snake_case)을 NotificationRes 로. 모양이 다르면 null — 그때는 목록만 다시 받는다. */
function toNotificationResponse(row: Record<string, unknown>): NotificationResponse | null {
  if (typeof row.id !== 'number' || typeof row.title !== 'string' || typeof row.type !== 'string') return null
  return {
    id: row.id,
    type: row.type as NotificationType,
    severity: (row.severity as NotificationResponse['severity']) ?? 'INFO',
    title: row.title,
    body: typeof row.body === 'string' ? row.body : null,
    linkType: (row.link_type as NotificationResponse['linkType']) ?? null,
    linkId: typeof row.link_id === 'number' ? row.link_id : null,
    read: row.read_at !== null && row.read_at !== undefined,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  }
}

/**
 * 방금 받은 알림을 알림 목록 캐시(전체·안 읽음만) 첫 페이지 맨 앞에 끼워 넣는다. 곧이어 무효화로 서버 목록을
 * 다시 받지만, 그 사이에도 배너(NotificationBanner)와 패널이 이 알림을 id로 바로 찾을 수 있게 하기 위함이다.
 * 이미 있으면(재연결 직후 목록과 겹침) 건드리지 않는다.
 */
function insertIntoNotificationLists(queryClient: QueryClient, nf: NotificationResponse) {
  queryClient.setQueriesData<InfiniteData<NotificationListResponse>>({ queryKey: queryKeys.notification.lists() }, (data) => {
    const first = data?.pages[0]
    if (!data || !first || data.pages.some((page) => page.notifications.some((n) => n.id === nf.id))) return data
    return {
      ...data,
      pages: [
        { ...first, notifications: [nf, ...first.notifications], unreadCount: first.unreadCount + (nf.read ? 0 : 1) },
        ...data.pages.slice(1),
      ],
    }
  })
}

interface NotificationStreamOptions {
  /** 새 알림 1건이 올 때마다(연결·재연결로 목록을 다시 받을 때는 부르지 않는다). */
  onNotification?: (nf: NotificationResponse) => void
}

/**
 * 알림 실시간 구독(Supabase Realtime, notifications INSERT). 로그인 중에만 구독하고, 새 행이 오면 그 알림을 목록 캐시에
 * 끼워 넣고 `onNotification`으로 넘긴 뒤 알림 쿼리를 무효화한다. RLS 가 내 행만 흘려 주지만 filter 로 한 번 더 좁힌다.
 * 끊겼다 다시 붙으면(두 번째 SUBSCRIBED 부터) 그 사이 알림을 놓쳤을 수 있으므로 목록을 다시 불러온다 —
 * 이때 채워지는 알림은 `onNotification`을 거치지 않는다(한꺼번에 배너로 뜨면 시끄럽다).
 * 로그인 화면 내내 한 번만 마운트되는 곳(NotificationBanner)에서 부른다.
 */
export function useNotificationStream({ onNotification }: NotificationStreamOptions = {}) {
  const queryClient = useQueryClient()
  const signedIn = useAuthStore((s) => s.status === 'authenticated')
  const userId = useAuthStore((s) => s.userId)
  // 콜백이 바뀔 때마다 다시 연결하지 않도록 최신 콜백은 ref로 들고 있는다.
  const onNotificationRef = useRef(onNotification)
  useEffect(() => {
    onNotificationRef.current = onNotification
  })

  useEffect(() => {
    if (!signedIn || !userId) return
    let subscribedOnce = false

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
      // 공유 상태는 알림과 함께 바뀌는 일이 많다(상대가 연결함·해제함) — 작은 조회 하나라 알림마다 다시 받는다.
      void queryClient.invalidateQueries({ queryKey: queryKeys.share.all() })
    }
    // 가족·커플 공유 알림(SHARE_*)은 '개인'(공유 중 계좌가 빠짐)·'우리집' 숫자가 바뀌었다는 뜻이다 — 범위 쿼리도 다시 받는다
    const refreshScopedData = () => {
      for (const key of [queryKeys.account.all(), queryKeys.asset.all(), queryKeys.dashboard.all(), queryKeys.transaction.all(),
        queryKeys.goal.all(), queryKeys.subscription.all()]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const nf = toNotificationResponse(payload.new as Record<string, unknown>)
          if (nf) {
            insertIntoNotificationLists(queryClient, nf)
            onNotificationRef.current?.(nf)
            if (nf.type.startsWith('SHARE_') && nf.type !== 'SHARE_DECLINED' && nf.type !== 'SHARE_INVITED') refreshScopedData()
          }
          refreshNotifications()
        },
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        if (subscribedOnce) refreshNotifications()
        subscribedOnce = true
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [signedIn, userId, queryClient])
}