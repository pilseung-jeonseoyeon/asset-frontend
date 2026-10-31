// 시스템 관리의 '가계부' 묶음: 월 시작일 · 카테고리 설정(옛 '자산 · 가계부 맞춤 설정'에서 옮김, 2026-10-31).
// - 월 시작일은 AppState가 아니라 서버 사용자 설정(GET/PATCH /users/me/settings)을 읽고 쓴다.
// - 월 시작일 목록은 usePopoverAnchor(position:fixed)로 띄운다 — 창 패널에 overflow:auto가 걸려 있어 absolute 목록은
//   패널 아래쪽에서 잘린다(2026-09-26 사용자 지적, 훅 헤더 주석 참고). 바깥을 누르면 닫히는 막은 SystemSettingsModal이 깐다.
// - 카테고리 설정 창을 닫으면 시스템 관리 창으로 돌아온다(CategorySettingsModal).

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../../components/primitives/Icon/Icon'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../../../../components/primitives/usePopoverAnchor'
import { useAppState } from '../../../../state/AppStateContext'
import { useIsMobile } from '../../../../utils/useMediaQuery'
import { useGetUserSettings, usePatchUserSettings } from '@/services/user'
import { DESCRIPTION_STYLE, ERROR_STYLE, LAST_ROW_STYLE, NAME_STYLE, ROW_STYLE } from './systemStyles'

// 서버가 monthStartDay를 1~28로 검증한다 — 29~31은 달마다 존재하지 않는 날이라 선택지에서 제외한다.
const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)
// 목록 최대 높이(28개라 항상 이 높이로 잘려 안에서 스크롤된다). 아래 공간이 이보다 좁으면 위로 연다.
const MONTH_START_LIST_MAX_HEIGHT = 200
// 데스크톱 목록 폭 — 트리거 알약(약 70px)보다 조금 넓게, 트리거 오른쪽 끝에 맞춘다.
const MONTH_START_LIST_WIDTH = 100

const SMALL_BTN_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 3, padding: '8px 13px', borderRadius: 10, border: 'none', background: 'var(--track)',
  color: 'var(--text-strong)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s', flex: 'none',
}

export function LedgerSection() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const { settings, data: settingsData } = useGetUserSettings()
  const patchSettings = usePatchUserSettings()
  const monthStartOpen = state.openDropdown === 'monthStart'
  const monthStartAnchor = usePopoverAnchor(monthStartOpen, MONTH_START_LIST_MAX_HEIGHT)
  // 목록을 열면 지금 설정된 날이 보이도록 그 위치로 스크롤한다(28개라 10일 이후는 처음에 가려져 있다).
  const monthStartListRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!monthStartOpen) return
    const list = monthStartListRef.current
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (list && selected) list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2
  }, [monthStartOpen])

  // 설정을 아직 못 받았으면(로딩·실패) 기본값 '1일'이 현재 값처럼 보여 잘못 고를 수 있다 — 받을 때까지 막는다.
  const controlsDisabled = !settingsData
  const monthStartValue = settingsData ? `${settings.monthStartDay}일` : '—'
  const toggleMonthStart = () => setState((prev) => ({ openDropdown: prev.openDropdown === 'monthStart' ? null : 'monthStart' }))
  const pickMonthStart = (day: number) => {
    patchSettings.mutate({ monthStartDay: day })
    setState({ openDropdown: null })
  }

  // 모바일은 화면 폭에 꽉 채우는 anchor.style(다른 드롭다운과 같다), 데스크톱은 트리거 오른쪽 끝에
  // 맞춘 고정 폭(왼쪽 넘침 클램프). 측정 전 첫 렌더에는 아래 absolute 배치가 폴백으로 쓰인다.
  const { rect: listRect, style: listAnchorStyle } = monthStartAnchor
  const monthStartListStyle: CSSProperties | undefined = isMobile
    ? listAnchorStyle
    : listRect && listAnchorStyle
      ? {
          position: 'fixed',
          left: Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(listRect.right - MONTH_START_LIST_WIDTH, window.innerWidth - MONTH_START_LIST_WIDTH - POPOVER_VIEWPORT_MARGIN)),
          right: 'auto',
          width: MONTH_START_LIST_WIDTH,
          top: listAnchorStyle.top,
          bottom: listAnchorStyle.bottom,
        }
      : undefined
  const monthStartListMaxHeight =
    monthStartAnchor.maxHeight !== undefined ? Math.min(MONTH_START_LIST_MAX_HEIGHT, monthStartAnchor.maxHeight) : MONTH_START_LIST_MAX_HEIGHT

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>월 시작일</div>
          <div style={DESCRIPTION_STYLE}>급여일 기준 정산</div>
          {patchSettings.error && <div style={ERROR_STYLE}>{patchSettings.error.message}</div>}
          {/* 바꾼 직후 저장됐다는 걸 알려준다 — 예전엔 알약 숫자만 조용히 바뀌어 반영됐는지 알기 어려웠다. */}
          {patchSettings.isSuccess && !patchSettings.error && (
            <div aria-live="polite" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--inc-text)', marginTop: 4 }}>
              매월 {settings.monthStartDay}일부터 한 달로 계산해요
            </div>
          )}
        </div>
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            type="button"
            ref={monthStartAnchor.anchorRef as React.Ref<HTMLButtonElement>}
            onClick={toggleMonthStart}
            disabled={controlsDisabled || patchSettings.isPending}
            aria-haspopup="listbox"
            aria-expanded={monthStartOpen}
            aria-label={`월 시작일 ${monthStartValue}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8, cursor: controlsDisabled ? 'default' : 'pointer', opacity: controlsDisabled ? 0.6 : 1, border: 'none', fontFamily: 'inherit' }}
          >
            {monthStartValue}
            <Icon name="expand_more" size={16} color="var(--text-weak)" />
          </button>
          {monthStartOpen && (
            <div
              ref={monthStartListRef}
              role="listbox"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10,
                boxShadow: 'var(--shadow-pop)', padding: 6, zIndex: 95, overflow: 'auto', minWidth: MONTH_START_LIST_WIDTH, boxSizing: 'border-box',
                ...(monthStartAnchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
                ...monthStartListStyle,
                maxHeight: monthStartListMaxHeight,
              }}
            >
              {MONTH_START_DAYS.map((d) => {
                // 지금 설정된 날은 강조하고 체크 표시를 붙인다 — 예전엔 모든 항목이 같아 현재 값을 찾기 어려웠다.
                const selected = `${d}일` === monthStartValue
                return (
                  <button
                    key={d}
                    className="mini-hov"
                    onClick={() => pickMonthStart(d)}
                    role="option"
                    aria-selected={selected}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '10px 10px',
                      borderRadius: 8, border: 'none', background: selected ? 'var(--accent-soft)' : 'transparent',
                      fontSize: 12.5, fontWeight: 700, color: selected ? 'var(--accent)' : 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit',
                      // 모바일 터치 목표 44px — Dropdown 옵션과 같은 규격.
                      ...(isMobile ? { minHeight: 44 } : undefined),
                    }}
                  >
                    {d}일
                    {selected && <Icon name="check" size={15} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div style={LAST_ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>카테고리 설정</div>
          <div style={DESCRIPTION_STYLE}>수입 · 저축 · 지출 대분류별 소분류 관리</div>
        </div>
        <button className="qbtn" onClick={() => setState({ openModal: 'categorySettings' })} style={SMALL_BTN_STYLE}>
          관리
          <Icon name="chevron_right" size={16} color="var(--text-mid)" />
        </button>
      </div>
    </div>
  )
}
