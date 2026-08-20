// Source: secret/Asset Manager v14.dc.html L763-837 (header, quick-add dropdown, notification dropdown)
// — transcribed verbatim, incl. the close-dropdown behavior per handler, WITH ONE DELIBERATE DEVIATION:
// the source's openStockSell (L4465) does NOT close quickAddOpen unlike its siblings, leaving the
// quick-add dropdown open after picking "주식 매도" — real-use testing confirmed this reads as broken
// (docs/backend-request.md item 9), so this handler closes it like every other quick-add action.
//
// Mobile (<=767px, docs/mobile.md §3): the profile avatar that lives at the bottom of SidebarNav on
// desktop is rendered here instead, since SidebarNav isn't mounted at all below the breakpoint. Style/
// click behavior mirrors SidebarNav's avatar exactly (Avatar 's' = 36px, opens modalAccount). The
// notification dropdown width also clamps to the viewport so it doesn't overflow narrow screens.

import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../primitives/Avatar/Avatar'
import { MonitLogo } from './MonitLogo'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useIsMobile } from '../../utils/useMediaQuery'
import { formatNotificationTime } from '../../utils/notificationTime'
import type { NotificationResponse, NotificationType } from '@/services/notification'
import { useGetNotifications, usePatchAllNotificationsRead, usePatchNotificationRead } from '@/services/notification'
import { useProfileName } from '@/services/user'

// 서버는 알림 종류만 내려주고 아이콘은 내려주지 않는다 — 배경/글자색은 두 타입 모두 동일했던
// mockNotifications의 값을 그대로 유지하고(secret/API-SPEC.md §9는 색상을 규정하지 않음),
// 타입별로 다른 건 아이콘 하나뿐이다.
const NOTIF_TYPE_ICON: Record<NotificationType, string> = {
  MATURITY: 'savings',
  SYSTEM: 'notifications',
}
const NOTIF_ICON_BG = 'var(--fill-subtle)'
const NOTIF_ICON_COLOR = 'var(--text-mid)'

const MINI_HOV_ITEM_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '11px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left' as const,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-strong)',
  fontFamily: 'inherit',
}

const NOTIF_ITEM_STYLE = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 11,
  width: '100%',
  padding: '11px 8px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left' as const,
  fontFamily: 'inherit',
}

// 화면에서는 감추되 스크린리더에는 남기는 관례 스타일(AccountHoldingsField의 aria-live 블록과 같은 값).
const SR_ONLY_STYLE = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
}

const MARK_ALL_READ_BTN_STYLE = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--accent)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export function Header() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const profileName = useProfileName()
  const notifQuery = useGetNotifications()
  const patchNotificationRead = usePatchNotificationRead()
  const patchAllNotificationsRead = usePatchAllNotificationsRead()
  const anyDropdownOpen = state.quickAddOpen || state.notifOpen
  const hasNotifs = notifQuery.notifications.length > 0

  // 알림 linkType → 이동 동작 매핑. linkType은 자유 문자열이고 값 집합이 아직 서버에 의해 확정되지
  // 않았다(docs/backend-request.md D-5-2) — 지금 실제로 관측되는 값만 다루고, 매핑에 없는 값(또는
  // linkId가 없는 경우)은 읽음 처리만 하고 이동하지 않는다. **확장 지점**: 새 linkType이 추가되면
  // 여기에 케이스를 더한다. 'ACCOUNT'는 계좌 상세(EditAccountModal, AppShell에 항상 마운트되어
  // 있어 라우트 없이 열 수 있다)로 연결한다 — 자산 화면 컨텍스트가 자연스러우므로 함께 이동한다.
  const notificationLinkHandlers: Record<string, (linkId: number) => void> = {
    ACCOUNT: (linkId) => {
      navigate('/assets')
      setState({ modalOpen: 'editAccount', editAccount: linkId })
    },
  }

  const handleNotificationClick = (nf: NotificationResponse) => {
    if (!nf.read && !patchNotificationRead.isPending) {
      patchNotificationRead.mutate(nf.id)
    }
    const handler = nf.linkType ? notificationLinkHandlers[nf.linkType] : undefined
    if (handler && nf.linkId !== null) {
      handler(nf.linkId)
      setState({ notifOpen: false, quickAddOpen: false })
    }
  }

  const handleMarkAllRead = () => {
    if (patchAllNotificationsRead.isPending) return
    patchAllNotificationsRead.mutate()
  }

  const closeDropdowns = () => setState({ quickAddOpen: false, notifOpen: false })
  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26, gap: 24 }}>
      <div>
        {/* 모바일(<=767px)에서는 글자 대신 로고 마크를 쓴다(2026-08-20 요청). 데스크톱은 사이드바가
            이미 같은 마크를 달고 있어 상단바까지 로고를 두면 같은 마크가 두 번 나오므로 글자로 둔다.
            h1은 두 경우 모두 유지하고, 로고일 때는 화면에서만 감춘 텍스트로 제목을 남긴다 — 스크린리더가
            읽을 페이지 제목이 사라지면 안 된다. */}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)', display: 'flex', alignItems: 'center' }}>
          {isMobile ? (
            <>
              <MonitLogo />
              <span style={SR_ONLY_STYLE}>Monit</span>
            </>
          ) : (
            'Monit'
          )}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {anyDropdownOpen && (
          <div onClick={closeDropdowns} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setState((st) => ({ quickAddOpen: !st.quickAddOpen, notifOpen: false }))}
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'var(--accent)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="add" size={23} color="#fff" />
          </button>
          {state.quickAddOpen && (
            <div
              onClick={stop}
              style={{
                position: 'absolute',
                top: 50,
                right: 0,
                width: 206,
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-pop)',
                padding: 8,
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <button
                className="mini-hov"
                onClick={() => setState({ quickAddOpen: false, modalOpen: 'addAccount' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="add_card" size={19} color="var(--accent)" />
                계좌 추가
              </button>
              <button
                className="mini-hov"
                onClick={() => setState({ quickAddOpen: false, modalOpen: 'quickStock', stockTradeMode: 'buy' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="show_chart" size={19} color="var(--accent)" />
                주식 매수
              </button>
              <button
                className="mini-hov"
                onClick={() => setState({ quickAddOpen: false, modalOpen: 'quickStock', stockTradeMode: 'sell' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="trending_down" size={19} color="var(--accent)" />
                주식 매도
              </button>
              <button
                className="mini-hov"
                onClick={() =>
                  setState({
                    quickAddOpen: false,
                    modalOpen: 'ledgerEntry',
                    entryType: 'expense',
                    entryTabsVisible: true,
                    editingTxId: null,
                    entrySubcategoryId: null,
                    entryAccountId: null,
                    entryWithdrawAccountId: null,
                    entryAmount: 0,
                    entryDescription: '',
                    entryMemo: '',
                    entryPreserved: null,
                    entryDateOverride: null,
                  })
                }
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="edit_note" size={19} color="var(--accent)" />
                가계부 입력
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setState((st) => ({ notifOpen: !st.notifOpen, quickAddOpen: false }))}
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Icon name="notifications" size={20} color="var(--text-mid)" />
            {notifQuery.unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 11,
                  width: 7,
                  height: 7,
                  background: 'var(--accent)',
                  borderRadius: 999,
                  border: '2px solid var(--surface)',
                }}
              />
            )}
          </button>
          {state.notifOpen && (
            <div
              onClick={stop}
              aria-busy={notifQuery.isPending}
              style={{
                position: 'absolute',
                top: 50,
                right: 0,
                width: 'min(344px, calc(100vw - 32px))',
                maxHeight: 440,
                overflow: 'auto',
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-pop)',
                padding: 10,
                zIndex: 60,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>알림</span>
                {notifQuery.unreadCount > 0 && (
                  <button
                    className="tap-44"
                    onClick={handleMarkAllRead}
                    disabled={patchAllNotificationsRead.isPending}
                    aria-busy={patchAllNotificationsRead.isPending}
                    style={{ ...MARK_ALL_READ_BTN_STYLE, opacity: patchAllNotificationsRead.isPending ? 0.6 : 1 }}
                  >
                    {patchAllNotificationsRead.isPending ? '처리 중…' : '모두 읽음'}
                  </button>
                )}
              </div>
              {patchAllNotificationsRead.error && (
                <div style={{ fontSize: 11.5, color: 'var(--down)', padding: '0 8px 10px' }}>
                  {patchAllNotificationsRead.error.message}
                </div>
              )}
              {notifQuery.isPending ? (
                <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '34px 10px', textAlign: 'center' }}>
                  불러오는 중…
                </div>
              ) : notifQuery.error ? (
                <div style={{ fontSize: 12.5, color: 'var(--down)', padding: '20px 8px', lineHeight: 1.5 }}>
                  {notifQuery.error.message}
                </div>
              ) : hasNotifs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {notifQuery.notifications.map((nf) => (
                    <button
                      key={nf.id}
                      className="mini-hov"
                      onClick={() => handleNotificationClick(nf)}
                      style={NOTIF_ITEM_STYLE}
                    >
                      <span
                        style={{
                          position: 'relative',
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: NOTIF_ICON_BG,
                          color: NOTIF_ICON_COLOR,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 'none',
                        }}
                      >
                        <Icon name={NOTIF_TYPE_ICON[nf.type]} size={18} />
                        {!nf.read && (
                          <span
                            style={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              background: 'var(--accent)',
                              borderRadius: 999,
                              border: '2px solid var(--surface)',
                            }}
                          />
                        )}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: nf.read ? 'var(--text-mid)' : 'var(--text-strong)' }}>
                          {nf.title}
                        </div>
                        {nf.body && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, lineHeight: 1.4 }}>
                            {nf.body}
                          </div>
                        )}
                        <div style={{ fontSize: 10.5, color: 'var(--text-weak)', marginTop: 5 }}>
                          {formatNotificationTime(nf.createdAt)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '34px 10px', textAlign: 'center' }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'var(--track)',
                      color: 'var(--text-weak)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="notifications_off" size={22} />
                  </span>
                  <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>새로운 알림이 없어요</div>
                </div>
              )}
            </div>
          )}
        </div>

        {isMobile && (
          <div
            onClick={() => setState({ modalOpen: 'account', accountModalView: 'main', withdrawConfirmOpen: false })}
            title={profileName}
            style={{ cursor: 'pointer' }}
          >
            <Avatar name={profileName} size="s" />
          </div>
        )}
      </div>
    </header>
  )
}
