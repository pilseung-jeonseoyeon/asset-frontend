import { useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '../api'
import { queryKeys } from '../queryKeys'
import {
  getNotifications,
  issueStreamTicket,
  patchAllNotificationsRead,
  patchNotificationRead,
} from './notification.service'

// 재연결 대기: 3초에서 시작해 두 배씩, 최대 1분.
const STREAM_RETRY_BASE_MS = 3_000
const STREAM_RETRY_MAX_MS = 60_000

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

/**
 * 알림 실시간 구독(SSE). 로그인 중에만 연결하고, `notification` 이벤트가 오면 알림 쿼리를 무효화한다.
 * 서버가 30초마다 보내는 `heartbeat`는 연결 유지용이라 무시한다.
 * 티켓은 1회용이라 브라우저 자동 재연결은 401로 실패한다 — onerror에서 직접 닫고 티켓을 다시 받아 연다.
 * 서버가 끊긴 동안의 알림을 다시 보내주지 않으므로 재연결(두 번째 connect 이벤트부터)마다 목록을 다시 불러온다.
 * Header처럼 로그인 화면 내내 한 번만 마운트되는 곳에서 부른다.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient()
  const signedIn = useAuthStore((s) => s.accessToken !== null)

  useEffect(() => {
    if (!signedIn) return

    let source: EventSource | null = null
    let retryTimer: number | undefined
    let retryCount = 0
    let connectedOnce = false
    let disposed = false

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notification.all() })
    }

    const scheduleReconnect = () => {
      if (disposed) return
      const delay = Math.min(STREAM_RETRY_BASE_MS * 2 ** retryCount, STREAM_RETRY_MAX_MS)
      retryCount += 1
      retryTimer = window.setTimeout(() => void connect(), delay)
    }

    const connect = async () => {
      try {
        const { ticket } = await issueStreamTicket()
        if (disposed) return
        source = new EventSource(`${API_BASE_URL}/notifications/stream?ticket=${encodeURIComponent(ticket)}`)
        source.addEventListener('connect', () => {
          retryCount = 0
          if (connectedOnce) refreshNotifications()
          connectedOnce = true
        })
        source.addEventListener('notification', refreshNotifications)
        source.onerror = () => {
          source?.close()
          source = null
          scheduleReconnect()
        }
      } catch {
        scheduleReconnect()
      }
    }

    void connect()

    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
      source?.close()
    }
  }, [signedIn, queryClient])
}
