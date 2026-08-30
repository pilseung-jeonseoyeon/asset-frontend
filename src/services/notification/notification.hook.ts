import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import {
  getNotifications,
  patchAllNotificationsRead,
  patchNotificationRead,
} from './notification.service'

interface QueryOptions {
  enabled?: boolean
}

export function useGetNotifications(unreadOnly?: boolean, options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.notification.list(unreadOnly),
    queryFn: () => getNotifications(unreadOnly),
    enabled: options?.enabled,
    // 답변서 4-10: SSE 붙이기 전까지의 대안으로 백엔드가 권고한 값. 전역 queryClient 기본값
    // (staleTime: 30_000)만으로는 드롭다운을 닫았다 열어도 30초간 캐시를 그대로 보여줘 배지
    // 숫자가 늦게 갱신된다. 이 쿼리는 Header에 항상 마운트돼 있어(드롭다운이 닫혀 있어도) 배지
    // 숫자를 최신으로 유지하는 게 목적이므로, 닫혀 있을 때도 폴링이 도는 것이 의도된 동작이다.
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })
  return {
    ...query,
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
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
