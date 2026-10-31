// 알림 패널 맨 위의 "다른 걸 보고 있을 때도 알려드릴까요?" 안내 카드(시안 §4-1).
//
// 브라우저는 버튼을 누른 순간에만 알림 허락을 물을 수 있고, 한 번 '차단'되면 사이트가 다시 물을 수 없다.
// 그래서 들어오자마자 묻지 않고, 알림을 받아 본 사람(패널에 알림이 있을 때만 그린다)에게 먼저 이 카드로
// 확인한 뒤 [켜기]를 누를 때 브라우저 허락 창을 띄운다.
// - 보이는 조건: 맥·PC 알림을 지원하는 브라우저 + 아직 허락 전('default') + 설정이 꺼져 있음 + '다음에'를 누른 지
//   30일이 지났음. 폰은 지원하지 않아 보이지 않는다(src/utils/desktopNotification.ts).
// - 허용 → 설정을 켜고 시험 알림 1건. 차단 → 푸는 곳을 안내하고 카드는 닫을 수 있다.
// 같은 설정은 설정 → 시스템 관리 → 알림 탭에도 있다(NotificationSettingsSection).

import { useState } from 'react'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useUpdateNotificationPrefs } from '../../state/selectors/notificationPrefs'
import {
  requestDesktopNotificationPermission,
  showDesktopNotificationPreview,
  useDesktopNotificationPermission,
} from '../../utils/desktopNotification'
import {
  NOTIFICATION_ASK_SNOOZE_MS,
  readNotificationAskDismissedAt,
  storeNotificationAskDismissedAt,
} from '../../utils/notificationPrefs'

export function NotificationPermissionAsk() {
  const { state } = useAppState()
  const permission = useDesktopNotificationPermission()
  const updateNotificationPrefs = useUpdateNotificationPrefs()
  const [dismissedAt, setDismissedAt] = useState(readNotificationAskDismissedAt)
  const [blocked, setBlocked] = useState(false)
  const [asking, setAsking] = useState(false)

  const snoozed = dismissedAt !== null && Date.now() - dismissedAt < NOTIFICATION_ASK_SNOOZE_MS
  if (snoozed || state.notificationPrefs.desktop) return null
  if (permission !== 'default' && !blocked) return null

  const snooze = () => {
    const now = Date.now()
    storeNotificationAskDismissedAt(now)
    setDismissedAt(now)
  }

  const turnOn = async () => {
    setAsking(true)
    const result = await requestDesktopNotificationPermission()
    setAsking(false)
    if (result === 'granted') {
      updateNotificationPrefs({ desktop: true })
      showDesktopNotificationPreview()
    } else if (result === 'denied') {
      setBlocked(true)
    }
    // 'default'(허락 창을 그냥 닫음)면 카드를 그대로 둔다.
  }

  return (
    <div
      style={{
        margin: '8px 4px 6px',
        border: '0.5px dashed var(--accent)',
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          width: 36, height: 36, borderRadius: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: blocked ? 'var(--down-chip)' : 'var(--accent-soft)', color: blocked ? 'var(--down)' : 'var(--accent)',
        }}
      >
        <Icon name={blocked ? 'notifications_off' : 'notifications_active'} size={19} ariaHidden />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.4 }}>
          {blocked ? '브라우저에서 알림이 막혔어요' : '다른 걸 보고 있을 때도 알려드릴까요?'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.5, wordBreak: 'keep-all' }}>
          {blocked
            ? '주소창 왼쪽 아이콘 → 알림 → 허용으로 바꾸면 켜져요. 설정 → 시스템 관리 → 알림에서도 볼 수 있어요.'
            : '다른 탭이나 앱을 보고 있어도 맥·PC 알림으로 알려드려요. 모닛 탭은 열어 두셔야 해요.'}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
          {!blocked && (
            <button
              type="button"
              className="qbtn tap-44"
              onClick={() => void turnOn()}
              disabled={asking}
              aria-busy={asking}
              style={{
                border: 'none', background: 'var(--accent)', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', minHeight: 34,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: asking ? 0.6 : 1,
              }}
            >
              켜기
            </button>
          )}
          <button
            type="button"
            className="tap-44"
            onClick={snooze}
            style={{
              border: 'none', background: 'transparent', color: 'var(--text-weak)', padding: '8px 6px', minHeight: 34,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {blocked ? '닫기' : '다음에'}
          </button>
        </div>
      </div>
    </div>
  )
}
