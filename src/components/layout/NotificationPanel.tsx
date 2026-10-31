// 헤더 알림 패널. 데스크톱은 벨 아래 앵커드 팝오버, 모바일은 화면 전체 알림센터(2026-09-04 사용자 결정,
// docs/mobile.md §4-2)다.
//
// 2026-09-26 개편(사용자 "UI/UX가 구리다" → UI/UX 검토안 반영):
// - 안 읽은 알림을 행 전체 보라 배경으로 칠하던 것을 없앴다 — 여러 개면 목록이 온통 보라색이 됐다.
//   대신 제목을 진하게 + 시간 옆 점 + 아주 옅은 배경(fill-subtle)으로 구분한다.
// - 아이콘은 알림 종류로, 칩 색은 심각도(severity)로 정한다(src/data/notificationView.ts).
// - '오늘 / 어제 / 최근 7일 / 최근 30일 / 30일 이전'으로 묶고, 오늘·어제 묶음 안에서는 시각만 적는다.
// - 안 읽음 점은 아이콘 칩 오른쪽 위에 고정한다 — 시간 글자 뒤에 붙이면 시간 길이에 따라 점이 흔들렸다.
// - **누르면 다른 화면으로 이동하지 않는다**(2026-09-26 사용자: "이동하는 건 아직 없어") — linkType/linkId는
//   서버가 주지만 쓰지 않는다. 누르면 읽음 처리 + 잘린 제목·본문을 그 자리에서 펼치고 접는다.
// - 별도 알림함(전체 알림 화면)은 없다 — 이 패널 안에서 20건씩 받아 맨 아래 '더 보기'로 이어 붙인다.
// - **예외: 공유 연결됨 카드(SHARE_ACCEPTED, 가족·커플 공유 v17)에는 버튼이 하나 있다.** 아직 연결 중이면
//   설정 › 가족 · 커플 공유를 연다 — 공유할 계좌를 아직 안 골랐으면 '연결 완료(이름 · 계좌 고르기)' 단계, 골랐으면 홈.
//   이메일 초대 카드(SHARE_INVITED)도 그 초대가 아직 받은 목록에 있으면 [초대 확인] — '초대 확인' 단계를 연다.
//
// 2026-10-16 새 알림 도착 표시(NotificationBanner · useNotificationDelivery):
// - 배너·맥 알림을 눌러 열면 그 알림(AppState.notificationFocusId)을 펼치고 보이게 스크롤한다.
// - 패널이 열려 있는 동안 새로 온 줄은 잠깐 연보라로 반짝였다가 원래 색으로 돌아간다(.notif-fresh). 기준은 패널을
//   처음 그렸을 때의 가장 최신 id — '더 보기'로 불러온 예전 알림은 반짝이지 않는다.
// - 목록 맨 위에 맥·PC 알림 안내 카드(NotificationPermissionAsk)가 조건이 맞을 때만 보인다.
//
// 2026-10-31 A안(사용자 결정 — 캔버스 "Monit 알림 목록 시안"의 'A · 한 줄 목록'):
// - 안 읽은 줄에만 깔던 회색 칸을 없애고 줄 사이를 얇은 구분선으로 나눈다. 안 읽음은 왼쪽 작은 점 + 굵은 제목.
// - 아이콘은 무채색 32px 타일 하나로 통일하고, 답이 필요한 이메일 초대만 액센트(notificationToneOf).
// - 본문은 한 줄(누르면 전부 펼침), 아래 줄에 '종류 · 시간'("결제 예정 · 6시간 전"). 본문은 text-mid로 한 단계 진하게.
// - 버튼은 그 알림 칸 안(제목과 같은 시작선)에 둔다 — 칸 밖으로 떨어져 보이던 문제. 줄 전체(버튼 포함)가 한 hover 영역이다.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../primitives/Icon/Icon'
import { Skeleton } from '../primitives/Skeleton/Skeleton'
import { NotificationPermissionAsk } from './NotificationPermissionAsk'
import { useAppState } from '../../state/AppStateContext'
import { formatNotificationAgo } from '../../utils/notificationTime'
import { groupNotificationsByDay, notificationIconOf, notificationKindLabelOf, notificationToneOf } from '../../data/notificationView'
import type { NotificationResponse } from '@/services/notification'
import { useGetNotifications, usePatchAllNotificationsRead, usePatchNotificationRead } from '@/services/notification'
import { useGetShareInvitations, useGetShareStatus } from '@/services/share'

/** 제목·본문이 길어도 목록 리듬이 무너지지 않게 지정한 줄 수에서 …로 자른다. */
const clampLines = (lines: number): CSSProperties => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: lines,
  overflow: 'hidden',
})

const TEXT_BUTTON_STYLE: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--accent)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

interface NotificationPanelProps {
  isMobile: boolean
  onClose: () => void
}

/** 공유 연결됨 카드 아래 버튼. 연결이 아직 살아 있을 때만 만든다. */
interface ShareAction {
  label: string
  onOpen: () => void
}

export function NotificationPanel({ isMobile, onClose }: NotificationPanelProps) {
  const { state, setState } = useAppState()
  const notifQuery = useGetNotifications()
  const patchNotificationRead = usePatchNotificationRead()
  const patchAllNotificationsRead = usePatchAllNotificationsRead()
  const groups = groupNotificationsByDay(notifQuery.notifications)
  const hasNotifs = groups.length > 0
  const { shareStatus } = useGetShareStatus()
  const { invitations } = useGetShareInvitations()

  // 여러 개를 동시에 펼쳐 둘 수 있다. 패널을 닫으면(언마운트) 모두 접힌 상태로 돌아간다.
  // 배너·맥 알림을 눌러 열었으면 그 알림은 펼친 채로 시작한다.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(
    () => new Set(state.notificationFocusId !== null ? [state.notificationFocusId] : []),
  )

  // 패널이 이미 열린 채로 맥 알림을 눌렀을 때도 펼치고, 그 줄이 보이게 스크롤한 뒤 요청을 지운다.
  const focusId = state.notificationFocusId
  useEffect(() => {
    if (focusId === null || notifQuery.isPending) return
    setExpandedIds((prev) => (prev.has(focusId) ? prev : new Set(prev).add(focusId)))
    document.querySelector(`[data-notification-id="${focusId}"]`)?.scrollIntoView({ block: 'nearest' })
    setState({ notificationFocusId: null })
  }, [focusId, notifQuery.isPending, setState])

  // 패널을 처음 그렸을 때의 가장 최신 알림 id. 이보다 큰 id는 패널이 열린 사이 새로 온 것이다.
  const [newestIdAtOpen, setNewestIdAtOpen] = useState<number | null>(null)
  useEffect(() => {
    if (newestIdAtOpen !== null || notifQuery.isPending) return
    setNewestIdAtOpen(notifQuery.notifications.reduce((max, nf) => Math.max(max, nf.id), 0))
  }, [newestIdAtOpen, notifQuery.isPending, notifQuery.notifications])

  const markRead = (nf: NotificationResponse) => {
    if (!nf.read && !patchNotificationRead.isPending) patchNotificationRead.mutate(nf.id)
  }

  const shareActionOf = (nf: NotificationResponse): ShareAction | undefined => {
    if (nf.type === 'SHARE_INVITED') {
      const invitationId = nf.linkId
      if (invitationId === null || !invitations?.received.some((i) => i.id === invitationId)) return undefined
      return {
        label: '초대 확인',
        onOpen: () => {
          markRead(nf)
          onClose()
          setState({ openModal: 'familyShare', shareFlowStep: 'accept', shareInvitationId: invitationId })
        },
      }
    }
    if (nf.type !== 'SHARE_ACCEPTED' || shareStatus?.status !== 'LINKED') return undefined
    const picked = shareStatus.myAccounts.length > 0
    return {
      label: picked ? '공유 설정 보기' : '공유할 계좌 고르기',
      onOpen: () => {
        markRead(nf)
        onClose()
        setState({ openModal: 'familyShare', shareFlowStep: picked ? 'home' : 'linked' })
      },
    }
  }


  const handleClick = (nf: NotificationResponse) => {
    markRead(nf)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nf.id)) next.delete(nf.id)
      else next.add(nf.id)
      return next
    })
  }

  const handleMarkAllRead = () => {
    if (!patchAllNotificationsRead.isPending) patchAllNotificationsRead.mutate()
  }

  const containerStyle: CSSProperties = isMobile
    ? {
        // 화면 전체 알림센터. z-index 60은 기존 드롭다운 층 그대로라 하단탭(50) 위, 모달(80+) 아래다.
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))',
      }
    : {
        position: 'absolute',
        top: 50,
        right: 0,
        // A안(2026-10-31) 뒤 본문이 한 줄이라 392px에서는 금방 잘렸다 — 사용자 요청으로 넓힌다.
        width: 'min(500px, calc(100vw - 32px))',
        maxHeight: 'min(520px, calc(100vh - 96px))',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-pop)',
        zIndex: 60,
        overflow: 'hidden',
      }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      aria-busy={notifQuery.isPending}
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
      aria-label="알림"
      style={containerStyle}
    >
      {/* 제목 줄 — 목록만 스크롤하고 이 줄은 고정한다. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: isMobile ? '2px 4px 6px' : '10px 10px 2px 18px',
          flex: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {/* 화면 전체를 덮으므로 바깥을 눌러 닫을 수 없다 — 눈에 보이는 닫기 수단을 반드시 둔다. */}
          {isMobile && (
            <button
              onClick={onClose}
              aria-label="알림 닫기"
              style={{
                width: 34, height: 34, flex: 'none', borderRadius: 10, border: 'none', background: 'var(--track)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="arrow_back" size={19} color="var(--text-mid)" />
            </button>
          )}
          <span style={{ fontSize: isMobile ? 17 : 15, fontWeight: 700, color: 'var(--text-strong)' }}>알림</span>
          {notifQuery.unreadCount > 0 && (
            <span
              style={{ fontSize: isMobile ? 14 : 13, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}
              aria-label={`안 읽은 알림 ${notifQuery.unreadCount}개`}
            >
              {notifQuery.unreadCount > 99 ? '99+' : notifQuery.unreadCount}
            </span>
          )}
        </div>
        {notifQuery.unreadCount > 0 && (
          <button
            className="tap-44"
            onClick={handleMarkAllRead}
            disabled={patchAllNotificationsRead.isPending}
            aria-busy={patchAllNotificationsRead.isPending}
            style={{
              ...TEXT_BUTTON_STYLE, fontSize: 12.5, color: 'var(--text-mid)', minHeight: 36, padding: '0 8px',
              opacity: patchAllNotificationsRead.isPending ? 0.6 : 1,
            }}
          >
            {patchAllNotificationsRead.isPending ? '처리 중…' : '모두 읽음'}
          </button>
        )}
      </div>
      {patchAllNotificationsRead.error && (
        <div style={{ fontSize: 11.5, color: 'var(--down)', padding: '8px 18px 0' }}>{patchAllNotificationsRead.error.message}</div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: isMobile ? '0 0 8px' : '0 8px 10px',
          // 목록이 없을 때(로딩 제외) 문구를 세로 가운데로 — 전체화면에서 맨 위에 붙어 있으면 허전하다.
          ...(isMobile && !hasNotifs && !notifQuery.isPending ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : null),
        }}
      >
        {notifQuery.isPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 10px 14px 14px' }}>
                <Skeleton width={32} height={32} radius={8} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
                  <Skeleton width="72%" height={13} />
                  <Skeleton width="92%" height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : notifQuery.error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.5 }}>알림을 불러오지 못했어요</div>
            <button className="tap-44" onClick={() => void notifQuery.refetch()} style={TEXT_BUTTON_STYLE}>
              다시 시도
            </button>
          </div>
        ) : hasNotifs ? (
          <>
            <NotificationPermissionAsk />
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div
                  style={{
                    position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)',
                    fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', padding: '14px 14px 4px',
                  }}
                >
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.items.map((nf, index) => (
                    <NotificationRow
                      key={nf.id}
                      nf={nf}
                      divider={index > 0}
                      expanded={expandedIds.has(nf.id)}
                      fresh={newestIdAtOpen !== null && nf.id > newestIdAtOpen}
                      onClick={() => handleClick(nf)}
                      shareAction={shareActionOf(nf)}
                    />
                  ))}
                </div>
              </section>
            ))}
            {notifQuery.hasNextPage && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
                <button
                  className="tap-44"
                  onClick={() => void notifQuery.fetchNextPage()}
                  disabled={notifQuery.isFetchingNextPage}
                  style={{ ...TEXT_BUTTON_STYLE, color: 'var(--text-mid)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  {notifQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                  {!notifQuery.isFetchingNextPage && <Icon name="expand_more" size={18} ariaHidden />}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '44px 16px', textAlign: 'center' }}>
            <span
              style={{
                width: 52, height: 52, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="notifications" size={26} ariaHidden />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>새로운 알림이 없어요</div>
              <div style={{ fontSize: 12, color: 'var(--text-weak)', marginTop: 4, lineHeight: 1.5 }}>
                만기·결제 예정·공유 소식을 여기서 알려드릴게요
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface NotificationRowProps {
  nf: NotificationResponse
  /** 같은 날짜 묶음의 두 번째 줄부터 위에 얇은 구분선 */
  divider: boolean
  /** 펼치면 제목·본문을 줄 수 제한 없이 전부 보여준다. */
  expanded: boolean
  /** 패널이 열린 사이 새로 온 줄 — 잠깐 연보라로 반짝인다. */
  fresh: boolean
  onClick: () => void
  /** 공유 연결됨 · 이메일 초대 카드에만 있는 버튼. */
  shareAction?: ShareAction
}

// 접힌 상태의 줄 수. 제목 2줄 + 본문 1줄 — 본문 전체는 누르면 펼쳐 본다.
const TITLE_LINES = 2
const BODY_LINES = 1
// 줄 왼쪽 여백(안 읽음 점 자리 포함) + 아이콘 32 + 간격 12 — 본문 · 구분선 · 버튼의 시작선
const ROW_PAD_LEFT = 14
const TEXT_INSET = ROW_PAD_LEFT + 32 + 12

function NotificationRow({ nf, divider, expanded, fresh, onClick, shareAction }: NotificationRowProps) {
  const tone = notificationToneOf(nf)
  const unread = !nf.read
  const meta = `${notificationKindLabelOf(nf.type)} · ${formatNotificationAgo(nf.createdAt)}`
  return (
    <div className={fresh ? 'notif-row notif-fresh' : 'notif-row'} style={{ position: 'relative', borderRadius: 10 }}>
      {divider && (
        <span aria-hidden style={{ position: 'absolute', top: 0, left: TEXT_INSET, right: 10, height: 0.5, background: 'var(--border)' }} />
      )}
      <button
        data-notification-id={nf.id}
        onClick={onClick}
        aria-expanded={expanded}
        aria-label={`${unread ? '안 읽음, ' : ''}${nf.title}${nf.body ? `, ${nf.body}` : ''}, ${meta}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          width: '100%',
          padding: `14px 10px ${shareAction ? 10 : 14}px ${ROW_PAD_LEFT}px`,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          color: 'inherit',
        }}
      >
        {/* 안 읽음 점 — 아이콘 왼쪽 여백에, 제목 첫 줄 높이에 맞춘다. */}
        {unread && (
          <span aria-hidden style={{ position: 'absolute', left: 4, top: 27, width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
        )}
        <span
          style={{
            width: 32, height: 32, flex: 'none', marginTop: 1, borderRadius: 8, background: tone.bg, color: tone.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={notificationIconOf(nf.type)} size={18} ariaHidden />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5, lineHeight: 1.45,
              fontWeight: unread ? 700 : 500,
              color: unread ? 'var(--text-strong)' : 'var(--text-mid)',
              ...(expanded ? null : clampLines(TITLE_LINES)),
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {nf.title}
          </div>
          {nf.body && (
            <div
              style={{
                fontSize: 12.5, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.5,
                ...(expanded ? null : clampLines(BODY_LINES)),
                wordBreak: 'keep-all',
                overflowWrap: 'anywhere',
                whiteSpace: expanded ? 'pre-line' : undefined,
              }}
            >
              {nf.body}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>{meta}</div>
        </div>
      </button>
      {/* 버튼은 위 <button> 안에 넣지 않는다(상호작용 요소 중첩 금지). 같은 칸 안, 제목과 같은 시작선에 둔다. */}
      {shareAction && (
        <div style={{ padding: `0 10px 14px ${TEXT_INSET}px` }}>
          <button
            type="button"
            className="tap-44 qbtn"
            onClick={shareAction.onOpen}
            style={{
              height: 34, padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff',
              fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {shareAction.label}
          </button>
        </div>
      )}
    </div>
  )
}
