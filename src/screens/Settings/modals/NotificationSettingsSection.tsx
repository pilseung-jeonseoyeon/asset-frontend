// 설정 → 시스템 관리의 '알림' 묶음 — 알림 받는 방식 세 줄(시안 §5, 2026-10-31 '일반 및 디스플레이'에서 옮김). 세 줄 모두
// 이 기기에만 저장된다(src/utils/notificationPrefs.ts) — 맥·PC 알림 허락이 브라우저마다 따로라 서버 설정이 아니라 기기 설정이다.
// 그래서 줄마다 '이 기기에만'을 붙인다. 같은 묶음 위쪽의 D-Day 알림(무엇을 알려줄지)은 서버 설정이라 모든 기기에 같다.
//
// '맥 · PC 알림' 줄은 브라우저 허락 상태에 따라 모양이 달라진다.
// - 지원 안 함: 폰이면 '폰 알림 · 준비 중'(웹 푸시 2단계), 그 밖의 브라우저는 '이 브라우저에서는 쓸 수 없어요'.
// - 허락 전('default'): 스위치를 켜는 순간 브라우저 허락 창을 띄운다(버튼을 누른 순간에만 물을 수 있다).
// - 차단('denied'): 사이트가 다시 물을 수 없으니 스위치를 막고 푸는 방법을 적는다.
// - 허락('granted'): 스위치가 곧 설정이다.
// 맥 시스템 설정·집중 모드에서 브라우저 알림이 꺼져 있으면 허락돼 있어도 안 뜨는데, 웹에서는 알 방법이 없어 안내만 둔다.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Switch } from '../../../components/primitives/Switch/Switch'
import { useAppState } from '../../../state/AppStateContext'
import { useUpdateNotificationPrefs } from '../../../state/selectors/notificationPrefs'
import {
  requestDesktopNotificationPermission,
  showDesktopNotificationPreview,
  useDesktopNotificationPermission,
} from '../../../utils/desktopNotification'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { DEVICE_ONLY_BADGE_STYLE, DEVICE_ONLY_LABEL } from './system/systemStyles'

const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}
// 묶음의 마지막 줄 — 아래 선은 다음 묶음 제목이 대신한다(시스템 관리 창의 다른 묶음과 같은 규칙)
const LAST_ROW_STYLE: CSSProperties = { ...ROW_STYLE, borderBottom: 'none' }
const NAME_STYLE: CSSProperties = { fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
const DESCRIPTION_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, lineHeight: 1.5, wordBreak: 'keep-all' }
const PILL_STYLE: CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 8 }

export function NotificationSettingsSection() {
  const { state } = useAppState()
  const isMobile = useIsMobile()
  const permission = useDesktopNotificationPermission()
  const updateNotificationPrefs = useUpdateNotificationPrefs()
  const prefs = state.notificationPrefs

  const toggleDesktop = async (next: boolean) => {
    if (!next) {
      updateNotificationPrefs({ desktop: false })
      return
    }
    const result = permission === 'granted' ? 'granted' : await requestDesktopNotificationPermission()
    if (result !== 'granted') return // 차단되면 아래 '막힘' 안내로 바뀐다.
    updateNotificationPrefs({ desktop: true })
    showDesktopNotificationPreview()
  }

  return (
    <div>
      <div style={ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>
            화면 안 알림 팝업
            <span style={DEVICE_ONLY_BADGE_STYLE}>{DEVICE_ONLY_LABEL}</span>
          </div>
          <div style={DESCRIPTION_STYLE}>모닛을 보고 있을 때 화면 위 가운데에 잠깐 띄워요</div>
        </div>
        <Switch checked={prefs.banner} onChange={(next) => updateNotificationPrefs({ banner: next })} label="화면 안 알림 팝업" />
      </div>

      {permission === 'unsupported' ? (
        <div style={LAST_ROW_STYLE}>
          <div style={{ minWidth: 0 }}>
            <div style={NAME_STYLE}>
              {isMobile ? '폰 알림' : '맥 · PC 알림'}
              <span style={{ ...PILL_STYLE, background: 'var(--track)', color: 'var(--text-mid)' }}>{isMobile ? '준비 중' : '지원 안 함'}</span>
            </div>
            <div style={DESCRIPTION_STYLE}>
              {isMobile
                ? '폰으로 받는 알림은 준비하고 있어요. 지금은 모닛을 보고 있을 때 화면 안 알림으로 알려드려요'
                : '이 브라우저에서는 쓸 수 없어요. 크롬·사파리·엣지에서 켤 수 있어요'}
            </div>
          </div>
          <Switch checked={false} onChange={() => {}} disabled label={isMobile ? '폰 알림' : '맥 · PC 알림'} />
        </div>
      ) : (
        <>
          <div style={{ ...ROW_STYLE, alignItems: permission === 'denied' ? 'flex-start' : 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={NAME_STYLE}>
                맥 · PC 알림
                <span style={DEVICE_ONLY_BADGE_STYLE}>{DEVICE_ONLY_LABEL}</span>
                {permission === 'denied' && <span style={{ ...PILL_STYLE, background: 'var(--down-chip)', color: 'var(--down)' }}>막힘</span>}
              </div>
              {permission === 'denied' ? (
                <>
                  <div style={{ ...DESCRIPTION_STYLE, color: 'var(--down)', display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 4 }}>
                    <Icon name="block" size={15} ariaHidden style={{ marginTop: 1 }} />
                    브라우저에서 알림이 막혀 있어요
                  </div>
                  <div
                    style={{
                      background: 'var(--fill-subtle)', borderRadius: 8, padding: '10px 12px', marginTop: 8,
                      fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.65, wordBreak: 'keep-all',
                    }}
                  >
                    <b style={{ color: 'var(--text-strong)' }}>푸는 방법</b>
                    <br />① 주소창 왼쪽 아이콘 → 알림 → 허용
                    <br />② 그래도 안 뜨면 맥 시스템 설정 → 알림에서 쓰는 브라우저의 ‘알림 허용’을 켜요
                  </div>
                </>
              ) : (
                <div style={DESCRIPTION_STYLE}>
                  모닛 탭이 열려 있으면 다른 탭·앱을 볼 때도 알려요
                  {prefs.desktop && permission === 'granted' && '. 안 뜨면 맥 시스템 설정 → 알림에서 브라우저 알림을 켜 주세요'}
                </div>
              )}
            </div>
            <Switch
              checked={prefs.desktop && permission === 'granted'}
              onChange={(next) => void toggleDesktop(next)}
              disabled={permission === 'denied'}
              label="맥 · PC 알림"
            />
          </div>

          <div style={LAST_ROW_STYLE}>
            <div style={{ minWidth: 0 }}>
              <div style={NAME_STYLE}>
                알림에 내용 보이기
                <span style={DEVICE_ONLY_BADGE_STYLE}>{DEVICE_ONLY_LABEL}</span>
              </div>
              <div style={DESCRIPTION_STYLE}>
                끄면 맥 · PC 알림에 ‘새 알림이 있어요’만 떠요. 잠금 화면·화면 공유 중에도 보일 수 있어요
              </div>
            </div>
            <Switch checked={prefs.preview} onChange={(next) => updateNotificationPrefs({ preview: next })} label="알림에 내용 보이기" />
          </div>
        </>
      )}
    </div>
  )
}
