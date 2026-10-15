// 새 알림 배너 — 모닛을 보고 있을 때 화면 위 가운데에서 내려오는 카드(시안: docs/plan/view/알림 도착 표시
// 시안.html §1·§2, 2026-10-16 사용자 결정 "가 — 모바일과 같은 카드"). 웹·모바일이 같은 카드를 쓴다.
//
// - 어디로 알릴지(배너/미룸/맥·PC 알림/패널)는 useNotificationDelivery가 정한다. 이 컴포넌트는 SSE 구독을
//   여는 곳이기도 하다 — 로그인 화면 내내 한 번만 마운트된다(AuthenticatedApp).
// - 배너에는 알림 id만 있고 내용은 알림 목록 캐시에서 찾는다(AppState.notificationBanners 주석). 못 찾으면
//   (목록을 다시 받는 사이 사라진 경우 등) 그 장은 그리지 않는다.
// - 맨 앞 한 장만 보이고 나머지는 뒤로 겹쳐 보인다(최대 2장) + "N개 더 · 알림 모두 보기".
// - 6초 뒤 다 함께 올라가며 사라진다. 버튼이 있는 알림(공유 초대)이 맨 앞이면 10초. 마우스를 올리거나
//   키보드로 머물거나 탭을 떠나 있는 동안은 시간이 멈춘다. 새 알림이 오면 처음부터 다시 센다.
// - 누르면 알림 패널이 열리고 그 알림이 펼쳐진 채 읽음 처리된다(다른 화면으로 이동하지 않는다는 패널 규칙 그대로).
//   공유 초대의 [확인하기]는 초대 확인 창을 연다 — 실수로 누르지 않게 거절은 배너에 두지 않는다.
// - 모바일은 위로 밀어 닫을 수 있고(아래 작은 막대가 그 표시), X도 함께 둔다.
// - z-index 75: 헤더 드롭다운(60)·전역 드롭다운 캐처(70) 위, 모달(80+) 아래. 입력 창이 열려 있으면 애초에
//   띄우지 않고 미룬다(useNotificationDelivery).

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useNotificationDelivery } from './useNotificationDelivery'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useIsMobile } from '../../utils/useMediaQuery'
import { notificationIconOf, notificationKindSummaryOf, notificationToneOf } from '../../data/notificationView'
import type { NotificationBanner as NotificationBannerItem } from '../../state/types'
import type { NotificationResponse } from '@/services/notification'
import { useGetNotifications, useNotificationStream, usePatchNotificationRead } from '@/services/notification'

const DISMISS_MS = 6_000
const DISMISS_WITH_ACTION_MS = 10_000
/** base.css .notif-banner-out 길이와 같다. */
const LEAVE_MS = 180
/** 모바일에서 이만큼 위로 밀면 닫는다. */
const SWIPE_DISMISS_PX = 36
/** 데스크톱 사이드바 폭(SidebarNav) — 배너를 사이드바를 뺀 본문의 가운데에 둔다. */
const SIDEBAR_WIDTH = 96

type ResolvedBanner =
  | { banner: NotificationBannerItem; kind: 'single'; nf: NotificationResponse }
  | { banner: NotificationBannerItem; kind: 'summary'; list: NotificationResponse[]; count: number; reason: 'away' | 'deferred' }

function resolve(banner: NotificationBannerItem, byId: Map<number, NotificationResponse>): ResolvedBanner | null {
  if (banner.kind === 'single') {
    const nf = byId.get(banner.notificationId)
    return nf ? { banner, kind: 'single', nf } : null
  }
  const list = banner.notificationIds.map((id) => byId.get(id)).filter((nf): nf is NotificationResponse => nf !== undefined)
  return { banner, kind: 'summary', list, count: banner.notificationIds.length, reason: banner.reason }
}

/** 공유 초대 알림이면 초대 확인 창에 넘길 shareId. */
function inviteShareIdOf(nf: NotificationResponse): number | null {
  return nf.type === 'SHARE_INVITED' && nf.linkType === 'SHARE' && nf.linkId !== null ? nf.linkId : null
}

const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
}

const CARD_STYLE: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 4,
  padding: '6px 6px 6px 6px',
  background: 'var(--surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-pop)',
  color: 'var(--text-strong)',
}

const GHOST_STYLE: CSSProperties = {
  position: 'absolute',
  height: 40,
  background: 'var(--surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 10,
  boxShadow: 'var(--shadow-pop)',
}

const PRIMARY_BUTTON_STYLE: CSSProperties = {
  border: 'none', background: 'var(--accent)', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px',
  fontSize: 12, fontWeight: 700, minHeight: 34, cursor: 'pointer', fontFamily: 'inherit',
}
const SECONDARY_BUTTON_STYLE: CSSProperties = {
  border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', borderRadius: 8,
  padding: '8px 14px', fontSize: 12, fontWeight: 700, minHeight: 34, cursor: 'pointer', fontFamily: 'inherit',
}
const TEXT_BUTTON_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', color: 'var(--text-weak)', padding: '8px 6px', fontSize: 12,
  fontWeight: 700, minHeight: 34, cursor: 'pointer', fontFamily: 'inherit',
}

export function NotificationBanner() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const { notifications } = useGetNotifications()
  const patchNotificationRead = usePatchNotificationRead()
  const { deliver, openPanelFocused } = useNotificationDelivery()
  useNotificationStream({ onNotification: deliver })

  const byId = new Map(notifications.map((nf) => [nf.id, nf]))
  const resolved = state.notificationBanners
    .map((banner) => resolve(banner, byId))
    .filter((item): item is ResolvedBanner => item !== null)
  const front = resolved[0] ?? null
  const restCount = resolved.length - 1

  // 사라지는 시간 — 마우스/키보드가 머무는 동안, 탭을 떠나 있는 동안은 멈춘다.
  const [hovered, setHovered] = useState(false)
  const [focusedWithin, setFocusedWithin] = useState(false)
  const [tabHidden, setTabHidden] = useState(() => document.visibilityState === 'hidden')
  const [leaving, setLeaving] = useState<'all' | 'front' | null>(null)
  const paused = hovered || focusedWithin || tabHidden || leaving !== null

  useEffect(() => {
    const handle = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])

  const frontBanner = front?.banner ?? null
  const duration = front?.kind === 'single' && inviteShareIdOf(front.nf) !== null ? DISMISS_WITH_ACTION_MS : DISMISS_MS
  const remainingRef = useRef(duration)
  const startedAtRef = useRef(0)

  // 맨 앞이 바뀌면(새 알림 도착·한 장 닫힘) 처음부터 다시 센다.
  // 배너가 모두 사라지면 머무름 표시도 지운다 — 마우스를 올린 채 배너를 눌러 패널을 열면 배너가 통째로 사라져
  // mouseleave가 오지 않는다. 그대로 두면 다음 배너가 "마우스가 올라가 있음"으로 멈춘 채 영영 사라지지 않는다.
  useEffect(() => {
    remainingRef.current = duration
    setLeaving(null)
    if (frontBanner === null) {
      setHovered(false)
      setFocusedWithin(false)
    }
  }, [frontBanner, duration])

  // 닫힐 배너를 잠깐 올려 보낸 뒤(.notif-banner-out) 상태에서 뺀다. 그 사이 새 배너가 와도 지우지 않도록
  // 닫을 대상을 객체 그대로 집어 둔다.
  const dismiss = (target: 'all' | 'front') => {
    const removing = target === 'all' ? state.notificationBanners : state.notificationBanners.slice(0, 1)
    setLeaving(target)
    window.setTimeout(() => {
      setState((prev) => ({ notificationBanners: prev.notificationBanners.filter((b) => !removing.includes(b)) }))
    }, LEAVE_MS)
  }
  const dismissRef = useRef(dismiss)
  useEffect(() => {
    dismissRef.current = dismiss
  })

  useEffect(() => {
    if (!frontBanner || paused) return
    startedAtRef.current = Date.now()
    const timer = window.setTimeout(() => dismissRef.current('all'), remainingRef.current)
    return () => {
      window.clearTimeout(timer)
      // 멈춘 동안 남은 시간을 기억한다. 너무 짧게 남으면 다시 볼 틈이 없어 최소 1.5초는 남긴다.
      remainingRef.current = Math.max(1_500, remainingRef.current - (Date.now() - startedAtRef.current))
    }
  }, [frontBanner, paused])

  // 모바일 위로 밀어 닫기.
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const handlePointerDown = (e: ReactPointerEvent) => {
    draggedRef.current = false
    if (e.pointerType === 'mouse') return
    dragStartRef.current = e.clientY
  }
  const handlePointerMove = (e: ReactPointerEvent) => {
    if (dragStartRef.current === null) return
    const dy = Math.min(0, e.clientY - dragStartRef.current)
    if (dy < -6) draggedRef.current = true
    setDragY(dy)
  }
  const handlePointerEnd = () => {
    if (dragStartRef.current === null) return
    dragStartRef.current = null
    if (dragY <= -SWIPE_DISMISS_PX) dismiss('front')
    setDragY(0)
  }

  const markRead = (nf: NotificationResponse) => {
    if (!nf.read) patchNotificationRead.mutate(nf.id)
  }
  const openPanel = () => setState({ notificationOpen: true, quickAddOpen: false, notificationBanners: [] })

  const handleOpen = () => {
    // 위로 밀다 손을 뗀 것은 누른 것으로 치지 않는다.
    if (draggedRef.current || !front) return
    if (front.kind === 'single') openPanelFocused(front.nf)
    else openPanel()
  }

  const containerStyle: CSSProperties = isMobile
    ? { position: 'fixed', top: 'calc(10px + env(safe-area-inset-top))', left: 12, right: 12, zIndex: 75, pointerEvents: 'none' }
    : { position: 'fixed', top: 16, left: SIDEBAR_WIDTH, right: 0, zIndex: 75, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }

  let content = null
  if (front) {
    const isSingle = front.kind === 'single'
    const tone = isSingle ? notificationToneOf(front.nf) : { bg: 'var(--accent-soft)', fg: 'var(--accent)' }
    const icon = isSingle ? notificationIconOf(front.nf.type) : 'notifications'
    const title = isSingle
      ? front.nf.title
      : front.reason === 'away'
        ? `자리를 비운 사이 알림 ${front.count}개가 왔어요`
        : `새 알림 ${front.count}개가 왔어요`
    const body = isSingle ? front.nf.body : notificationKindSummaryOf(front.list) || null
    const inviteShareId = isSingle ? inviteShareIdOf(front.nf) : null
    const ghosts = Math.min(2, restCount)

    content = (
      <div
        style={{ width: isMobile ? '100%' : 420, maxWidth: '100%', pointerEvents: 'auto' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocusedWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusedWithin(false)
        }}
      >
        {/* 카드와 뒤로 겹친 카드만 한 상자에 — 아래 'N개 더' 줄은 이 상자 밖에 둬야 겹친 카드가 그 뒤로 숨지 않는다. */}
        <div style={{ position: 'relative', paddingBottom: ghosts * 7 }}>
          {ghosts >= 2 && <div aria-hidden style={{ ...GHOST_STYLE, left: 20, right: 20, bottom: 0, zIndex: 1, opacity: 0.7 }} />}
          {ghosts >= 1 && <div aria-hidden style={{ ...GHOST_STYLE, left: 10, right: 10, bottom: ghosts >= 2 ? 7 : 0, zIndex: 2, opacity: 0.9 }} />}
          <div
            key={keyOf(front.banner)}
            className={leaving ? 'notif-banner-out' : 'notif-banner-in'}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            style={{
              ...CARD_STYLE,
              paddingBottom: isMobile ? 14 : 6,
              transform: dragY ? `translateY(${dragY}px)` : undefined,
              touchAction: isMobile ? 'none' : undefined,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={handleOpen}
                aria-label={`${title}${body ? `, ${body}` : ''}. 알림 패널에서 보기`}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: '8px 4px 8px 8px', border: 'none',
                  background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 8, background: tone.bg, color: tone.fg, flex: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name={icon} size={isMobile ? 17 : 19} ariaHidden />
                </span>
                <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                  <span
                    style={{
                      display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
                      fontSize: 13, fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'anywhere',
                    }}
                  >
                    {title}
                  </span>
                  {body && (
                    <span
                      style={{
                        display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: isMobile ? 1 : 2, overflow: 'hidden',
                        fontSize: 12, color: 'var(--text-weak)', marginTop: 3, lineHeight: 1.45, wordBreak: 'keep-all', overflowWrap: 'anywhere',
                      }}
                    >
                      {body}
                    </span>
                  )}
                </span>
              </button>
              {/* 버튼 줄은 위 <button> 안에 넣지 않는다(상호작용 요소 중첩 금지). 왼쪽을 아이콘 폭만큼 들여 제목과 맞춘다. */}
              {inviteShareId !== null && isSingle && (
                <div style={{ display: 'flex', gap: 8, padding: `2px 0 6px ${isMobile ? 52 : 56}px` }}>
                  <button
                    type="button"
                    className="qbtn"
                    onClick={() => {
                      markRead(front.nf)
                      setState({ shareInviteConfirmId: inviteShareId, notificationBanners: [] })
                    }}
                    style={{ ...PRIMARY_BUTTON_STYLE, flex: isMobile ? 1 : undefined, minHeight: isMobile ? 40 : 34 }}
                  >
                    확인하기
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss('front')}
                    style={isMobile ? { ...SECONDARY_BUTTON_STYLE, flex: 1, minHeight: 40 } : TEXT_BUTTON_STYLE}
                  >
                    나중에
                  </button>
                </div>
              )}
              {!isSingle && (
                <div style={{ padding: `2px 0 6px ${isMobile ? 52 : 56}px` }}>
                  <button type="button" onClick={openPanel} style={SECONDARY_BUTTON_STYLE}>
                    알림 보기
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="tap-44"
              onClick={() => dismiss('front')}
              aria-label="알림 닫기"
              style={{
                width: 28, height: 28, flex: 'none', marginTop: 4, border: 'none', background: 'transparent', borderRadius: 8,
                color: 'var(--text-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Icon name="close" size={18} ariaHidden />
            </button>
            {isMobile && (
              <span
                aria-hidden
                style={{
                  position: 'absolute', left: '50%', bottom: 6, width: 32, height: 4, borderRadius: 4,
                  background: 'var(--track)', transform: 'translateX(-50%)',
                }}
              />
            )}
          </div>
        </div>
        {restCount > 0 && (
          <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', marginTop: 8 }}>
            <button
              type="button"
              onClick={openPanel}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, border: '0.5px solid var(--border)', background: 'var(--surface)',
                borderRadius: 999, padding: '6px 10px 6px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-mid)',
                boxShadow: 'var(--shadow-card)', cursor: 'pointer', fontFamily: 'inherit', minHeight: 32,
              }}
            >
              <span
                style={{
                  minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--accent)', color: '#FFFFFF',
                  fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
                }}
              >
                {restCount}
              </span>
              개 더 · 알림 모두 보기
              <Icon name="chevron_right" size={16} color="var(--accent)" ariaHidden />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* 화면 읽기 프로그램용 — 하던 일을 끊지 않게 polite로 새 알림 제목만 읽는다. */}
      <div role="status" aria-live="polite" style={SR_ONLY_STYLE}>
        {front ? `새 알림, ${front.kind === 'single' ? front.nf.title : `${front.count}개`}` : ''}
      </div>
      {content}
    </div>
  )
}

/** 맨 앞 카드의 key — 새 배너가 맨 앞에 오면 카드가 새로 그려져 내려오는 애니메이션이 다시 돈다. */
function keyOf(banner: NotificationBannerItem): string {
  return banner.kind === 'single' ? `n-${banner.notificationId}` : `s-${banner.notificationIds.join('-')}`
}
