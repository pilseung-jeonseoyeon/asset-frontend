// 알림 받는 방식 설정 변경 — 설정 화면(NotificationSettingsSection)과 알림 패널 안내 카드
// (NotificationPermissionAsk)가 함께 쓴다. localStorage(정본)와 AppState(렌더용 미러)를 한 번에 맞춘다.

import { useAppState } from '../AppStateContext'
import { storeNotificationPrefs } from '../../utils/notificationPrefs'
import type { NotificationPrefs } from '../../utils/notificationPrefs'

export function useUpdateNotificationPrefs() {
  const { state, setState } = useAppState()
  return (patch: Partial<NotificationPrefs>) => {
    const next = { ...state.notificationPrefs, ...patch }
    storeNotificationPrefs(next)
    setState({ notificationPrefs: next })
  }
}
