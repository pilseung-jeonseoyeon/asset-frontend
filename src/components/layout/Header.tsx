// 헤더 + 퀵 추가 드롭다운 + 알림 드롭다운.
// 퀵 추가 메뉴는 어떤 항목을 고르든 드롭다운을 닫는다 — '주식 매도'만 열린 채로 남으면 고장난
// 것처럼 읽힌다(실사용 확인, docs/backend-request.md 9번).
//
// 모바일(<=767px, docs/mobile.md §3): 데스크톱에서 SidebarNav 맨 아래에 있는 프로필 아바타를
// 여기서 대신 렌더한다 — 브레이크포인트 아래에서는 SidebarNav가 아예 마운트되지 않기 때문이다.
// 스타일·클릭 동작은 SidebarNav의 아바타와 똑같다(Avatar 's' = 36px, modalAccount를 연다).
// 알림은 모바일에서 드롭다운이 아니라 **화면 전체 알림센터**로 연다(2026-09-04 사용자 결정,
// docs/mobile.md §4-2) — 데스크톱 팝오버를 그대로 쓰면 벨 아래 작은 카드에 갇혀 목록이 길수록
// 읽기 어렵다. 데스크톱은 앵커드 팝오버다. 패널 본문은 NotificationPanel.tsx.

import type { MouseEvent } from 'react'
import { Avatar } from '../primitives/Avatar/Avatar'
import { MonitLogo } from './MonitLogo'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { openNewEntryUpdater } from '../../state/selectors/entryDraft'
import { useIsMobile } from '../../utils/useMediaQuery'
import { NotificationPanel } from './NotificationPanel'
import { useGetNotifications, useNotificationStream } from '@/services/notification'
import { useProfileName } from '@/services/user'

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

// 화면에서는 감추되 스크린리더에는 남기는 관례 스타일(AccountHoldingsField의 aria-live 블록과 같은 값).
const SR_ONLY_STYLE = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
}

export function Header() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const profileName = useProfileName()
  const notifQuery = useGetNotifications()
  useNotificationStream()
  const anyDropdownOpen = state.quickAddOpen || state.notificationOpen

  const closeDropdowns = () => setState({ quickAddOpen: false, notificationOpen: false })
  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26, gap: 24 }}>
      <div>
        {/* 모바일(<=767px)에서는 글자 대신 로고 마크를 쓴다. 데스크톱은 사이드바가
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
            onClick={() => setState((prev) => ({ quickAddOpen: !prev.quickAddOpen, notificationOpen: false }))}
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
                onClick={() => setState({ quickAddOpen: false, openModal: 'addAccount' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="add_card" size={19} color="var(--accent)" />
                계좌 추가
              </button>
              <button
                className="mini-hov"
                onClick={() => setState({ quickAddOpen: false, openModal: 'quickStock', stockTradeMode: 'buy' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="show_chart" size={19} color="var(--accent)" />
                주식 매수
              </button>
              <button
                className="mini-hov"
                onClick={() => setState({ quickAddOpen: false, openModal: 'quickStock', stockTradeMode: 'sell' })}
                style={MINI_HOV_ITEM_STYLE}
              >
                <Icon name="trending_down" size={19} color="var(--accent)" />
                주식 매도
              </button>
              <button
                className="mini-hov"
                onClick={() =>
                  // 가계부 화면의 입력 버튼과 같은 규칙으로 연다 — 저장하지 않고 닫아 보관해 둔
                  // 같은 거래유형의 초안이 있으면 되살린다(state/selectors/entryDraft.ts).
                  setState((prev) => ({ ...openNewEntryUpdater('expense', true, null)(prev), quickAddOpen: false }))
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
            onClick={() => setState((prev) => ({ notificationOpen: !prev.notificationOpen, quickAddOpen: false }))}
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
          {state.notificationOpen && <NotificationPanel isMobile={isMobile} onClose={closeDropdowns} />}
        </div>

        {isMobile && (
          <div
            onClick={() => setState({ openModal: 'account', accountModalView: 'main', withdrawConfirmOpen: false })}
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
