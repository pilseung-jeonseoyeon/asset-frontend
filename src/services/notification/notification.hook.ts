import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '../queryKeys'
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
    queryKey: qk.notification.list(unreadOnly),
    queryFn: () => getNotifications(unreadOnly),
    enabled: options?.enabled,
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
      void queryClient.invalidateQueries({ queryKey: qk.notification.all() })
    },
  })
}

export function usePatchAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: patchAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notification.all() })
    },
  })
}
