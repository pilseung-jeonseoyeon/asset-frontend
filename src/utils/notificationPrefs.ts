// 알림 받는 방식 설정 — 이 기기에만 저장되는 편의 설정(docs/state-management.md "localStorage는 캐시·힌트 전용").
//
// 서버 설정(UserSettingsRes)에 대응 필드가 없고, 맥·PC 알림 허락 자체가 브라우저마다 따로라 기기별 설정이
// 맞다. 대시보드 레이아웃과 같은 구조로 localStorage가 정본이고 AppState.notificationPrefs가 렌더용 미러다.
// 키는 `monit.` 접두어, 접근 실패는 전부 삼키고 기본값으로 동작한다(theme.ts·dashboardLayout.ts와 동일).

export interface NotificationPrefs {
  /** 모닛을 보고 있을 때 화면 위 가운데 배너를 띄운다. */
  banner: boolean
  /** 다른 탭·앱을 볼 때 맥·PC 알림(브라우저 Notification)을 띄운다. 브라우저 허락이 따로 있어야 실제로 뜬다. */
  desktop: boolean
  /** 맥·PC 알림에 제목·본문을 그대로 보인다. 끄면 '새 알림이 있어요'만 — 잠금 화면·화면 공유 대비. */
  preview: boolean
}

const PREFS_STORAGE_KEY = 'monit.notification.prefs'
const ASK_DISMISSED_STORAGE_KEY = 'monit.notification.askDismissedAt'

/** 맥·PC 알림은 브라우저 허락이 필요해서 사용자가 직접 켜기 전까지 꺼 둔다. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { banner: true, desktop: false, preview: true }

/** 알림 패널 안내 카드에서 '다음에'를 누르면 이 기간 동안 다시 묻지 않는다. */
export const NOTIFICATION_ASK_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

export function readStoredNotificationPrefs(): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return DEFAULT_NOTIFICATION_PREFS
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_NOTIFICATION_PREFS
    const stored = parsed as Partial<Record<keyof NotificationPrefs, unknown>>
    // 항목별로 불리언일 때만 받는다 — 과거 버전·수동 조작 값은 그 항목만 기본값으로 돌린다.
    return {
      banner: typeof stored.banner === 'boolean' ? stored.banner : DEFAULT_NOTIFICATION_PREFS.banner,
      desktop: typeof stored.desktop === 'boolean' ? stored.desktop : DEFAULT_NOTIFICATION_PREFS.desktop,
      preview: typeof stored.preview === 'boolean' ? stored.preview : DEFAULT_NOTIFICATION_PREFS.preview,
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFS
  }
}

export function storeNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // 저장 실패면 이번 세션 동안만 AppState로 반영된다 — 치명적이지 않다.
  }
}

/** 안내 카드의 '다음에'를 누른 시각(ms). 누른 적 없으면 null. */
export function readNotificationAskDismissedAt(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(ASK_DISMISSED_STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0 ? stored : null
  } catch {
    return null
  }
}

export function storeNotificationAskDismissedAt(at: number): void {
  try {
    window.localStorage.setItem(ASK_DISMISSED_STORAGE_KEY, String(at))
  } catch {
    // 저장 실패면 다음 부팅 때 안내 카드가 다시 보일 뿐이다.
  }
}
