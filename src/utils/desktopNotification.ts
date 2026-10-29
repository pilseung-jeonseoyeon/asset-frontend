// 맥·PC 알림(브라우저 Notification API) — 모닛 탭이 열려 있는 동안 다른 탭·앱을 보고 있을 때 쓴다.
//
// - 탭·브라우저를 닫은 뒤에도 받으려면 웹 푸시(서비스 워커 + 서버 발송)가 필요하다 — 아직 없다(2단계,
//   docs/plan/view/알림 도착 표시 시안.html §7·§8).
// - 폰은 제외한다: 아이폰 사파리는 Notification 자체가 없고(홈 화면 웹앱 + 웹 푸시만), 안드로이드 크롬은
//   `new Notification()`을 막아 서비스 워커로만 띄울 수 있다. 폰 알림은 2단계에서 다룬다.
// - 허락 요청(requestPermission)은 버튼을 누른 순간에만 부른다 — 브라우저가 사용자 동작 없는 요청을
//   막거나 조용히 무시하고, 한 번 '차단'되면 사이트가 다시 물을 수 없다.
// - 허락 상태는 사용자가 주소창 사이트 설정에서 언제든 바꿀 수 있어서, 창 포커스·탭 복귀 때 다시 읽는다.
// - 데스크톱 앱(Electron)에서도 같은 Notification API 가 그대로 동작한다(허락은 처음부터 granted). 다른 점은 안 읽은 수를
//   탭 제목 대신 독 아이콘 배지로 보여 주는 것뿐이다(setUnreadBadge — 플랫폼 분기 네 곳 중 하나).

import { useSyncExternalStore } from 'react'
import { desktopApi, isDesktopApp } from './platform'

/** 탭 제목의 기본값. 안 읽은 알림이 있으면 브라우저에선 "(N) Monit" 이 된다(setUnreadBadge). */
export const APP_TITLE = 'Monit'

export type DesktopNotificationPermission = NotificationPermission | 'unsupported'

/** 알림 왼쪽(브라우저에 따라 오른쪽) 그림. 홈 화면 아이콘과 같은 파일이다(public/pwa). */
const DESKTOP_NOTIFICATION_ICON = '/pwa/icon-192.png'
const PHONE_USER_AGENT = /Android|iPhone|iPad|iPod/i

export function isDesktopNotificationSupported(): boolean {
  if (isDesktopApp()) return typeof window !== 'undefined' && 'Notification' in window
  if (typeof window === 'undefined' || !('Notification' in window) || !window.isSecureContext) return false
  const userAgent = window.navigator.userAgent
  if (PHONE_USER_AGENT.test(userAgent)) return false
  // 아이패드 사파리는 맥 UA를 쓴다 — 터치 지점 수로 가린다.
  if (/Macintosh/.test(userAgent) && window.navigator.maxTouchPoints > 1) return false
  return true
}

function readPermission(): DesktopNotificationPermission {
  return isDesktopNotificationSupported() ? Notification.permission : 'unsupported'
}

const permissionListeners = new Set<() => void>()

function notifyPermissionListeners(): void {
  permissionListeners.forEach((listener) => listener())
}

function subscribePermission(callback: () => void): () => void {
  permissionListeners.add(callback)
  window.addEventListener('focus', callback)
  document.addEventListener('visibilitychange', callback)
  // Permissions API가 있으면 사이트 설정에서 바꾼 순간도 잡는다(없거나 'notifications'를 모르는 브라우저는 무시).
  let status: PermissionStatus | null = null
  let disposed = false
  window.navigator.permissions
    ?.query({ name: 'notifications' })
    .then((result) => {
      if (disposed) return
      status = result
      status.addEventListener('change', callback)
    })
    .catch(() => {})
  return () => {
    disposed = true
    permissionListeners.delete(callback)
    window.removeEventListener('focus', callback)
    document.removeEventListener('visibilitychange', callback)
    status?.removeEventListener('change', callback)
  }
}

/** 지금 이 브라우저의 맥·PC 알림 허락 상태. 폰·지원 안 하는 브라우저는 'unsupported'. */
export function useDesktopNotificationPermission(): DesktopNotificationPermission {
  return useSyncExternalStore(subscribePermission, readPermission, () => 'unsupported')
}

/** 반드시 버튼 클릭 처리 안에서 부른다(파일 헤더 참고). */
export async function requestDesktopNotificationPermission(): Promise<DesktopNotificationPermission> {
  if (!isDesktopNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  } finally {
    notifyPermissionListeners()
  }
}

interface DesktopNotificationOptions {
  title: string
  body?: string
  /** 같은 tag의 알림은 하나로 합쳐진다 — 모닛 탭이 여러 개 열려 있어도 한 번만 뜨게 알림 id로 만든다. */
  tag: string
  onClick?: () => void
}

/** 맥·PC 알림을 막 켰을 때 "이렇게 와요"를 보여주는 시험 알림(시안 §4-3). */
export function showDesktopNotificationPreview(): void {
  showDesktopNotification({
    title: '이제 이렇게 알려드릴게요',
    body: '모닛 탭이 열려 있으면 다른 탭·앱을 보고 있어도 새 알림을 보내드려요',
    // 같은 tag면 알림센터의 이전 것을 조용히 바꿔치기만 하고 화면에 다시 뜨지 않는다 — 껐다 켤 때마다 보이게 매번 새 tag.
    tag: `monit-notification-preview-${Date.now()}`,
  })
}

/** 허락이 없거나 브라우저가 막으면 조용히 아무것도 하지 않는다. */
export function showDesktopNotification({ title, body, tag, onClick }: DesktopNotificationOptions): void {
  if (readPermission() !== 'granted') return
  try {
    const notification = new Notification(title, { body, tag, icon: DESKTOP_NOTIFICATION_ICON })
    notification.onclick = () => {
      window.focus()
      onClick?.()
      notification.close()
    }
  } catch {
    // 생성자를 막는 브라우저(안드로이드 크롬 등)는 위 지원 판정에서 걸러지지만, 남은 예외도 삼킨다.
  }
}

/**
 * 안 읽은 알림 수 표시. 브라우저는 탭이 안 보일 때만 탭 제목을 "(N) Monit" 으로(돌아오면 "Monit"), 데스크톱 앱은 독 아이콘
 * 배지(0 이면 지움). 로그아웃 때 0 으로 불러 다음 사용자에게 남지 않게 한다.
 */
export async function setUnreadBadge(count: number): Promise<void> {
  const desktop = desktopApi()
  if (desktop) {
    try {
      await desktop.setBadgeCount(count > 0 ? count : 0)
    } catch {
      // 배지를 못 그려도 앱 동작엔 영향 없음
    }
    return
  }
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
  document.title = hidden && count > 0 ? `(${count > 99 ? '99+' : count}) ${APP_TITLE}` : APP_TITLE
}
