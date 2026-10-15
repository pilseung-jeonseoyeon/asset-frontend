// 새 알림이 왔을 때 "어디로 알릴지" 정하는 규칙의 정본(시안: docs/plan/view/알림 도착 표시 시안.html §6).
// 원칙: 같은 알림을 두 군데서 동시에 알리지 않는다 — 보고 있으면 화면 안 배너, 안 보고 있으면 맥·PC 알림.
//
// | 지금 상황                                   | 화면 안 배너                       | 맥·PC 알림 |
// |--------------------------------------------|-----------------------------------|-----------|
// | 모닛을 보고 있음                              | 띄움                               | -         |
// | 보고 있음 · 알림 패널 열림                     | 안 띄움(패널 목록 맨 위에 새 줄이 반짝임) | -         |
// | 보고 있음 · 입력 창 열림                       | 창을 닫을 때 띄움(여러 개면 한 장)      | -         |
// | 다른 탭·앱을 보는 중 · 맥·PC 알림 켬            | 안 띄움(돌아와도)                    | 띄움       |
// | 다른 탭·앱을 보는 중 · 맥·PC 알림 꺼짐/허락 없음  | 돌아오면 "자리를 비운 사이 N개" 한 장   | -         |
// | 재연결로 못 받은 알림을 채울 때                  | 안 띄움(useNotificationStream이 안 넘김) | 안 띄움 |
//
// "보고 있음" = 탭이 보이고(visibilityState) 창에 포커스가 있음. 다른 앱을 쓰는 동안 옆 모니터에 모닛이 떠
// 있어도 보고 있지 않은 것으로 친다.
//
// 모닛 탭이 여러 개면 모든 탭이 같은 알림을 받는다. 보고 있는 탭이 배너를 띄우면 BroadcastChannel로
// 알리고, 안 보는 탭은 잠깐 기다렸다가 그 신호가 없을 때만 맥·PC 알림을 띄운다(보이는 탭 배너 + 숨은 탭
// 맥 알림이 겹치지 않게). 숨은 탭끼리는 같은 tag라 맥 알림이 하나로 합쳐진다.
//
// 탭 제목: 탭이 안 보일 때 안 읽은 알림이 있으면 "(N) Monit", 돌아오면 "Monit".

import { useEffect, useRef } from 'react'
import { useAppState } from '../../state/AppStateContext'
import { isAnyModalOpen } from '../../state/selectors/modal'
import { isDesktopNotificationSupported, showDesktopNotification } from '../../utils/desktopNotification'
import type { NotificationBanner } from '../../state/types'
import type { NotificationResponse } from '@/services/notification'
import { useGetNotifications, usePatchNotificationRead } from '@/services/notification'

const BASE_TITLE = 'Monit'
const BROADCAST_CHANNEL = 'monit.notification'
/** 숨은 탭이 "보고 있는 탭이 배너를 띄웠다"는 신호를 기다리는 시간. 같은 SSE 이벤트라 거의 동시에 도착한다. */
const DESKTOP_HANDOFF_WAIT_MS = 500

function isLooking(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

/** 여러 건을 배너로 꺼낼 때: 한 건이면 그 알림 한 장, 여러 건이면 묶음 한 장. */
function bannerFor(ids: number[], reason: 'away' | 'deferred'): NotificationBanner {
  return ids.length === 1 ? { kind: 'single', notificationId: ids[0] } : { kind: 'summary', notificationIds: ids, reason }
}

export function useNotificationDelivery() {
  const { state, setState } = useAppState()
  const { unreadCount } = useGetNotifications()
  const patchNotificationRead = usePatchNotificationRead()
  const modalOpen = isAnyModalOpen(state)

  // 안 보는 사이 온 알림(맥·PC 알림을 안 띄운 것만). 돌아오면 한 장으로 알린다.
  const awayIdsRef = useRef<number[]>([])
  // 다른 탭이 배너로 띄웠다고 알려온 알림 id — 숨은 탭이 맥 알림을 건너뛸지 판단한다.
  const shownElsewhereRef = useRef<Set<number>>(new Set())
  const channelRef = useRef<BroadcastChannel | null>(null)
  // 이벤트 처리기(SSE 콜백·창 이벤트)가 항상 최신 상태를 보도록.
  const latest = useRef({ state, patchNotificationRead })
  useEffect(() => {
    latest.current = { state, patchNotificationRead }
  })

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(BROADCAST_CHANNEL)
    channel.onmessage = (event: MessageEvent<{ shownId?: unknown }>) => {
      if (typeof event.data?.shownId === 'number') shownElsewhereRef.current.add(event.data.shownId)
    }
    channelRef.current = channel
    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [])

  const openPanelFocused = (nf: NotificationResponse) => {
    if (!nf.read) latest.current.patchNotificationRead.mutate(nf.id)
    setState({ notificationOpen: true, quickAddOpen: false, notificationFocusId: nf.id, notificationBanners: [] })
  }

  const showDesktop = (nf: NotificationResponse) => {
    const { preview } = latest.current.state.notificationPrefs
    showDesktopNotification({
      title: preview ? nf.title : BASE_TITLE,
      body: preview ? (nf.body ?? undefined) : '새 알림이 있어요',
      tag: `monit-notification-${nf.id}`,
      onClick: () => openPanelFocused(nf),
    })
  }

  // 보고 있는 상태에서 배너로 보낼지·미룰지·패널에 맡길지.
  const deliverWhileLooking = (ids: number[], reason: 'away' | 'deferred' | null) => {
    setState((prev) => {
      if (prev.notificationOpen || !prev.notificationPrefs.banner) return {}
      if (isAnyModalOpen(prev)) return { notificationPendingIds: [...prev.notificationPendingIds, ...ids] }
      const banner: NotificationBanner = reason ? bannerFor(ids, reason) : { kind: 'single', notificationId: ids[0] }
      return { notificationBanners: [banner, ...prev.notificationBanners] }
    })
  }

  const deliver = (nf: NotificationResponse) => {
    setState((prev) => ({ notificationBellRing: prev.notificationBellRing + 1 }))

    if (isLooking()) {
      channelRef.current?.postMessage({ shownId: nf.id })
      deliverWhileLooking([nf.id], null)
      return
    }

    const { notificationPrefs } = latest.current.state
    const desktopOn = notificationPrefs.desktop && isDesktopNotificationSupported() && Notification.permission === 'granted'
    if (!desktopOn) {
      awayIdsRef.current.push(nf.id)
      return
    }
    window.setTimeout(() => {
      if (shownElsewhereRef.current.has(nf.id)) return
      // 기다리는 사이 사용자가 돌아왔으면 배너로 보낸다.
      if (isLooking()) deliverWhileLooking([nf.id], null)
      else showDesktop(nf)
    }, DESKTOP_HANDOFF_WAIT_MS)
  }

  // 돌아오면 안 보는 사이 온 알림을 한 장으로.
  useEffect(() => {
    const handleReturn = () => {
      if (!isLooking() || awayIdsRef.current.length === 0) return
      const ids = awayIdsRef.current
      awayIdsRef.current = []
      deliverWhileLooking(ids, 'away')
    }
    window.addEventListener('focus', handleReturn)
    document.addEventListener('visibilitychange', handleReturn)
    return () => {
      window.removeEventListener('focus', handleReturn)
      document.removeEventListener('visibilitychange', handleReturn)
    }
    // deliverWhileLooking은 setState(안정)만 쓰므로 한 번만 붙인다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 입력 창이 닫히면 미뤘던 알림을 꺼낸다.
  useEffect(() => {
    if (modalOpen || state.notificationPendingIds.length === 0) return
    const ids = state.notificationPendingIds
    setState((prev) => {
      if (prev.notificationOpen || !prev.notificationPrefs.banner) return { notificationPendingIds: [] }
      return { notificationPendingIds: [], notificationBanners: [bannerFor(ids, 'deferred'), ...prev.notificationBanners] }
    })
  }, [modalOpen, state.notificationPendingIds, setState])

  // 패널을 열면 떠 있던 배너는 거둔다 — 같은 내용이 패널 목록에 있다.
  useEffect(() => {
    if (state.notificationOpen && (state.notificationBanners.length > 0 || state.notificationPendingIds.length > 0)) {
      setState({ notificationBanners: [], notificationPendingIds: [] })
    }
  }, [state.notificationOpen, state.notificationBanners.length, state.notificationPendingIds.length, setState])

  // 탭 제목에 안 읽은 수.
  useEffect(() => {
    const apply = () => {
      document.title = document.visibilityState === 'hidden' && unreadCount > 0 ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${BASE_TITLE}` : BASE_TITLE
    }
    apply()
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [unreadCount])

  // 로그아웃(이 훅을 쓰는 화면이 내려감) 때 다음 사용자에게 이전 배너·제목이 남지 않게.
  useEffect(
    () => () => {
      document.title = BASE_TITLE
      setState({ notificationBanners: [], notificationPendingIds: [], notificationFocusId: null })
    },
    [setState],
  )

  return { deliver, openPanelFocused }
}
