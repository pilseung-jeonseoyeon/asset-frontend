// 고정 지출·구독 모달의 아이콘 선택. 아이콘 수십 개를 폼에 늘어놓지 않고(2026-09-26 사용자 요청 —
// "나열하지 말고 클릭하면 뭔가 나오게"), 지금 고른 아이콘 하나만 보여주는 트리거를 누르면 분류 탭 +
// 아이콘 격자가 담긴 팝오버가 열린다.
//
// 팝오버 위치는 Dropdown/DatePicker와 같은 usePopoverAnchor(position:fixed)로 잡는다 — 이 모달은
// panelStyle에 overflow:auto가 걸려 있어 absolute 팝오버는 패널 아래쪽에서 잘린다(훅 헤더 주석).
// 여닫힘은 AppState.openDropdown('recurringIcon')으로 관리해 FixedExpenseModal의 기존 바깥 클릭 덮개
// (openDropdown이 있으면 깔리는 zIndex 94 레이어)가 그대로 닫기를 맡는다. 팝오버는 그 위 95.

import { useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../../../components/primitives/usePopoverAnchor'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { DEFAULT_SUBSCRIPTION_ICON, SUBSCRIPTION_ICON_GROUPS, subscriptionIconLabel } from '../../../data/ledgerView'

const DROPDOWN_KEY = 'recurringIcon'
// 탭 한 줄 + 격자 두세 줄이 잘리지 않고 들어가는 높이 — 이보다 아래 공간이 좁으면 위로 연다.
const PREFERRED_HEIGHT = 300
// 데스크톱 팝오버 폭. 트리거(모달 폭 전체)와 같게 두면 격자가 한 줄에 너무 많이 늘어져 찾기 어렵다.
const DESKTOP_WIDTH = 340

const stopPropagation = (e: MouseEvent) => e.stopPropagation()

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 'none', padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-mid)',
  }
}

// 터치 대상 44px(docs/mobile.md). 선택된 칸은 목록 화면의 고정 지출 아이콘과 같은 액센트 톤.
function cellStyle(active: boolean): CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: active ? '1px solid var(--accent)' : '0.5px solid transparent',
    background: active ? 'var(--accent-soft)' : 'var(--fill-subtle)',
    color: active ? 'var(--accent)' : 'var(--text-mid)',
    cursor: 'pointer', padding: 0,
  }
}

/** 지금 고른 아이콘이 속한 분류의 인덱스 — 팝오버를 열면 그 분류 탭부터 보여준다. 목록에 없으면 0. */
function groupIndexOf(icon: string): number {
  const i = SUBSCRIPTION_ICON_GROUPS.findIndex((g) => g.icons.some((it) => it.name === icon))
  return i < 0 ? 0 : i
}

export function SubscriptionIconPicker() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const open = state.openDropdown === DROPDOWN_KEY
  const selected = state.recurringIcon ?? DEFAULT_SUBSCRIPTION_ICON
  const [groupIndex, setGroupIndex] = useState(() => groupIndexOf(selected))
  const anchor = usePopoverAnchor(open, PREFERRED_HEIGHT)

  const toggle = () => {
    // 열 때마다 지금 아이콘의 분류로 맞춘다 — 지난번에 넘겨본 탭이 남아 있으면 고른 아이콘이 안 보인다.
    if (!open) setGroupIndex(groupIndexOf(selected))
    setState((prev) => ({ openDropdown: prev.openDropdown === DROPDOWN_KEY ? null : DROPDOWN_KEY }))
  }
  const pick = (name: string) => setState({ recurringIcon: name, openDropdown: null })

  const selectedLabel = subscriptionIconLabel(selected) ?? '직접 지정된 아이콘'
  const group = SUBSCRIPTION_ICON_GROUPS[groupIndex] ?? SUBSCRIPTION_ICON_GROUPS[0]

  // 모바일은 화면 폭에 꽉 채우는 anchor.style, 데스크톱은 트리거 왼쪽에 맞춘 고정 폭(오른쪽 넘침 클램프).
  const fixedStyle: CSSProperties | undefined = isMobile
    ? anchor.style
    : anchor.rect && anchor.style
      ? {
          position: 'fixed',
          left: Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(anchor.rect.left, window.innerWidth - DESKTOP_WIDTH - POPOVER_VIEWPORT_MARGIN)),
          right: 'auto',
          width: DESKTOP_WIDTH,
          top: anchor.style.top,
          bottom: anchor.style.bottom,
        }
      : undefined
  const panelMaxHeight = anchor.maxHeight !== undefined ? Math.min(PREFERRED_HEIGHT + 60, anchor.maxHeight) : undefined

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={anchor.anchorRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`아이콘 선택, 현재 ${selectedLabel}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid var(--border)', borderRadius: 10,
          padding: '8px 16px 8px 8px', cursor: 'pointer', minHeight: 52, boxSizing: 'border-box',
        }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name={selected} size={20} ariaHidden />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{selectedLabel}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)', flex: 'none' }}>변경</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={20} color="var(--text-weak)" style={{ flex: 'none' }} ariaHidden />
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="아이콘 고르기"
          onClick={stopPropagation}
          style={{
            // absolute 아래는 앵커 측정 전 첫 렌더용 폴백(Dropdown과 같은 패턴) — 측정 후 fixedStyle이 덮어쓴다.
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)',
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12,
            boxShadow: 'var(--shadow-pop)', padding: 10, zIndex: 95,
            display: 'flex', flexDirection: 'column', gap: 10, maxHeight: panelMaxHeight, boxSizing: 'border-box',
            ...fixedStyle,
          }}
        >
          <div role="tablist" aria-label="아이콘 분류" style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 'none', paddingBottom: 2 }}>
            {SUBSCRIPTION_ICON_GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={i === groupIndex}
                onClick={() => setGroupIndex(i)}
                style={tabStyle(i === groupIndex)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label={`${group.label} 아이콘`}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 6, overflowY: 'auto', minHeight: 0 }}
          >
            {group.icons.map((opt) => {
              const active = opt.name === selected
              return (
                <button
                  key={opt.name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={opt.label}
                  title={opt.label}
                  className="mini-hov"
                  onClick={() => pick(opt.name)}
                  style={{ ...cellStyle(active), justifySelf: 'center' }}
                >
                  <Icon name={opt.name} size={20} ariaHidden />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
