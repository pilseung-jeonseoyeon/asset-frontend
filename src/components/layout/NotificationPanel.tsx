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

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../primitives/Icon/Icon'
import { Skeleton } from '../primitives/Skeleton/Skeleton'
import { formatNotificationTimeInGroup } from '../../utils/notificationTime'
import { groupNotificationsByDay, notificationIconOf, notificationToneOf } from '../../data/notificationView'
import type { NotificationResponse } from '@/services/notification'
import { useGetNotifications, usePatchAllNotificationsRead, usePatchNotificationRead } from '@/services/notification'

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

export function NotificationPanel({ isMobile, onClose }: NotificationPanelProps) {
  const notifQuery = useGetNotifications()
  const patchNotificationRead = usePatchNotificationRead()
  const patchAllNotificationsRead = usePatchAllNotificationsRead()
  const groups = groupNotificationsByDay(notifQuery.notifications)
  const hasNotifs = groups.length > 0

  // 여러 개를 동시에 펼쳐 둘 수 있다. 패널을 닫으면(언마운트) 모두 접힌 상태로 돌아간다.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(() => new Set())

  const handleClick = (nf: NotificationResponse) => {
    if (!nf.read && !patchNotificationRead.isPending) patchNotificationRead.mutate(nf.id)
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
        background: 'var(--canvas)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))',
      }
    : {
        position: 'absolute',
        top: 50,
        right: 0,
        width: 'min(392px, calc(100vw - 32px))',
        maxHeight: 'min(520px, calc(100vh - 96px))',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-pop)',
        zIndex: 60,
        overflow: 'hidden',
      }
  const surface = isMobile ? 'var(--canvas)' : 'var(--surface)'

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
          padding: isMobile ? '2px 4px 12px' : '16px 18px 12px',
          borderBottom: isMobile ? undefined : '0.5px solid var(--border)',
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
              style={{
                minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, boxSizing: 'border-box',
                background: 'var(--accent)', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
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
            style={{ ...TEXT_BUTTON_STYLE, opacity: patchAllNotificationsRead.isPending ? 0.6 : 1 }}
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
          padding: isMobile ? '0 0 8px' : '4px 8px 10px',
          // 목록이 없을 때(로딩 제외) 문구를 세로 가운데로 — 전체화면에서 맨 위에 붙어 있으면 허전하다.
          ...(isMobile && !hasNotifs && !notifQuery.isPending ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : null),
        }}
      >
        {notifQuery.isPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 10px' }}>
                <Skeleton width={36} height={36} radius={10} />
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
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div
                  style={{
                    position: 'sticky', top: 0, zIndex: 1, background: surface,
                    fontSize: 11.5, fontWeight: 700, color: 'var(--text-weak)', padding: '12px 10px 6px',
                  }}
                >
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map((nf) => (
                    <NotificationRow
                      key={nf.id}
                      nf={nf}
                      isMobile={isMobile}
                      expanded={expandedIds.has(nf.id)}
                      onClick={() => handleClick(nf)}
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
                만기·결제 예정·목표 달성 소식을 여기서 알려드릴게요
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
  isMobile: boolean
  /** 펼치면 제목·본문을 줄 수 제한 없이 전부 보여준다. */
  expanded: boolean
  onClick: () => void
}

// 접힌 상태의 줄 수. 제목 2줄 + 본문 2줄이면 긴 알림도 행 높이가 일정하게 유지된다.
const TITLE_LINES = 2
const BODY_LINES = 2

function NotificationRow({ nf, isMobile, expanded, onClick }: NotificationRowProps) {
  const tone = notificationToneOf(nf)
  const unread = !nf.read
  return (
    <button
      className="notif-row"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={`${unread ? '안 읽음, ' : ''}${nf.title}${nf.body ? `, ${nf.body}` : ''}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        padding: isMobile ? '14px 12px' : '12px 10px',
        borderRadius: 12,
        border: 'none',
        background: unread ? 'var(--fill-subtle)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <span
        style={{ position: 'relative', width: 36, height: 36, flex: 'none' }}
      >
        <span
          style={{
            width: 36, height: 36, borderRadius: 11, background: tone.bg, color: tone.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // 읽은 알림은 칩을 흐리게 해 안 읽은 것이 먼저 눈에 들어오게 한다.
            opacity: unread ? 1 : 0.55,
          }}
        >
          <Icon name={notificationIconOf(nf.type)} size={19} ariaHidden />
        </span>
        {/* 안 읽음 점 — 모든 행에서 같은 자리(칩 오른쪽 위). 테두리는 행 배경색으로 칩과 떼어 보이게 한다. */}
        {unread && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: -3, right: -3, width: 10, height: 10, boxSizing: 'border-box',
              borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--fill-subtle)',
            }}
          />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div
            style={{
              flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4,
              fontWeight: unread ? 700 : 500,
              color: unread ? 'var(--text-strong)' : 'var(--text-mid)',
              ...(expanded ? null : clampLines(TITLE_LINES)),
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {nf.title}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-weak)', whiteSpace: 'nowrap', flex: 'none', paddingTop: 2 }}>
            {formatNotificationTimeInGroup(nf.createdAt)}
          </span>
        </div>
        {nf.body && (
          <div
            style={{
              fontSize: 12, color: 'var(--text-weak)', marginTop: 3, lineHeight: 1.45,
              ...(expanded ? null : clampLines(BODY_LINES)),
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
              whiteSpace: expanded ? 'pre-line' : undefined,
            }}
          >
            {nf.body}
          </div>
        )}
      </div>
    </button>
  )
}
