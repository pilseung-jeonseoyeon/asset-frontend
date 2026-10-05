// 월별 저축률 막대(1월~12월). 가계부 개요와 대시보드 C안 카드가 이 하나를 같이 쓴다 — CLAUDE.md 규칙상
// 두 화면의 가계부 카드는 색·규격이 같아야 해서, 예전처럼 두 벌로 두면 한쪽만 고쳐져 어긋난다.
//
// 막대만으로는 몇 %인지 알 수 없어(2026-09-26 사용자 지적) 달을 고르면 말풍선으로 비율·금액을 보여준다.
// - 데스크톱: 마우스를 올리면 보이고 내리면 사라진다. 클릭하면 고정되고, 같은 달을 다시 누르거나
//   차트 밖을 누르면 풀린다. 마우스가 올라가 있는 달이 고정된 달보다 먼저 보인다.
// - 모바일: 손가락으로 누른 채 좌우로 훑으면 손가락 아래 달이 바로 바뀐다(scrub). 짧게 탭하면 그 달이
//   고정되고, 같은 달을 다시 탭하거나 차트 밖을 탭하면 풀린다. touch-action: pan-y라 차트 위에서
//   시작해도 위아래로 밀면 페이지가 그대로 스크롤된다 — 그때는 브라우저가 pointercancel을 보내므로
//   말풍선을 띄우지 않는다(스크롤하려던 손가락이 달을 고정해 버리지 않게).
// - 키보드: Tab으로 들어와 ←/→로 달을 옮기고 Esc로 닫는다. 각 달은 aria-label로 값 전체를 읽는다.
//
// 반응 영역은 가는 막대(26/504)가 아니라 달 한 칸 전체(42/504)다 — 9%처럼 얇은 막대는 막대에만 맞추면
// 손가락이 닿지 않는다. 칸 경계는 BAR_X_POSITIONS와 정확히 맞는다(막대 x = 42·i + 8, 가운데 = 42·i + 21).
// 미래 달은 막대가 없으니 고를 수도 없다.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { buildSavingsBarLabel } from '../../../data/ledgerView'
import type { SavingsBar } from '../../../data/ledgerView'

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const BAR_X_POSITIONS = [8, 50, 92, 134, 176, 218, 260, 302, 344, 386, 428, 470]
const CHART_HEIGHT = 130
// 0보다 큰 비율이 둥근 모서리(rx 5)에 먹혀 안 보이지 않게 하는 최소 높이. 진짜 0%·수입 없음은 0 그대로.
const MIN_VISIBLE_BAR_HEIGHT = 6
const TOOLTIP_GAP = 8

function barHeightOf(bar: SavingsBar): number {
  if (bar.isFuture || bar.percent <= 0) return 0
  return Math.max((bar.percent / 100) * CHART_HEIGHT, MIN_VISIBLE_BAR_HEIGHT)
}

interface SavingsBarChartProps {
  bars: SavingsBar[]
  /** 라벨을 accent로 강조할 이번 달(1~12). */
  currentMonth: number
}

export function SavingsBarChart({ bars, currentMonth }: SavingsBarChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const [pinnedMonth, setPinnedMonth] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  // 터치 한 번의 진행 상태. 좌우로 움직였으면 scrub, 안 움직이고 떼면 탭이다.
  const touchRef = useRef<{ startX: number; startMonth: number | null; moved: boolean; pinnedAtStart: number | null } | null>(null)
  // 마지막 입력이 터치였는지 — 터치 탭 뒤에 따라오는 click 이벤트를 두 번 처리하지 않으려고 쓴다.
  const lastPointerTypeRef = useRef<string>('mouse')

  const barByMonth = new Map(bars.map((b) => [b.month, b]))
  const isSelectable = (month: number) => {
    const bar = barByMonth.get(month)
    return !!bar && !bar.isFuture
  }
  const activeMonth = hoveredMonth ?? pinnedMonth
  const activeBar = activeMonth !== null ? barByMonth.get(activeMonth) : undefined
  const activeLabel = activeBar ? buildSavingsBarLabel(activeBar) : null

  // 고정된 말풍선은 차트 밖을 누르면 닫는다.
  useEffect(() => {
    if (pinnedMonth === null) return
    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPinnedMonth(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pinnedMonth])

  // 말풍선 가로 위치: 고른 달 칸의 가운데에 맞추되 차트 폭 밖으로 나가지 않게 양끝에서 멈춘다
  // (1월·12월, 좁은 모바일 카드). 폭은 글자 길이마다 달라 그린 뒤에 잰다.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    const plot = plotRef.current
    if (!tooltip || !plot || activeMonth === null) return
    const plotWidth = plot.clientWidth
    const tooltipWidth = tooltip.offsetWidth
    const center = ((activeMonth - 0.5) / 12) * plotWidth
    const left = Math.max(0, Math.min(center - tooltipWidth / 2, plotWidth - tooltipWidth))
    tooltip.style.left = `${left}px`
  }, [activeMonth, activeLabel?.detail])

  const monthAtClientX = (clientX: number): number | null => {
    const plot = plotRef.current
    if (!plot) return null
    const rect = plot.getBoundingClientRect()
    if (rect.width <= 0) return null
    const month = Math.floor(((clientX - rect.left) / rect.width) * 12) + 1
    const clamped = Math.max(1, Math.min(12, month))
    return isSelectable(clamped) ? clamped : null
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    lastPointerTypeRef.current = e.pointerType
    if (e.pointerType === 'mouse') return
    touchRef.current = { startX: e.clientX, startMonth: monthAtClientX(e.clientX), moved: false, pinnedAtStart: pinnedMonth }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const touch = touchRef.current
    if (e.pointerType === 'mouse' || !touch) return
    // 손가락 떨림을 scrub으로 오인하지 않도록 몇 px은 흘려보낸다.
    if (!touch.moved && Math.abs(e.clientX - touch.startX) < 6) return
    if (!touch.moved) {
      touch.moved = true
      // 차트 밖으로 손가락이 조금 나가도 계속 따라가게 잡아 둔다. 이미 끝난 포인터면 던지므로 무시한다 —
      // 여기서 던지면 아래 달 갱신까지 건너뛰어 첫 scrub이 먹지 않는다.
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // 캡처 없이도 차트 안에서는 그대로 따라간다.
      }
    }
    const month = monthAtClientX(e.clientX)
    if (month !== null) setPinnedMonth(month)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const touch = touchRef.current
    touchRef.current = null
    if (e.pointerType === 'mouse' || !touch || touch.moved) return
    // 짧은 탭: 같은 달을 다시 탭하면 닫고, 아니면 그 달을 고정한다.
    const month = touch.startMonth
    if (month === null) return
    setPinnedMonth(touch.pinnedAtStart === month ? null : month)
  }
  const onPointerCancel = () => {
    // 세로 스크롤로 넘어간 경우 — 아무것도 고정하지 않는다.
    touchRef.current = null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setPinnedMonth(null)
      return
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const from = pinnedMonth ?? currentMonth
    const step = e.key === 'ArrowLeft' ? -1 : 1
    for (let m = from + step; m >= 1 && m <= 12; m += step) {
      if (isSelectable(m)) {
        e.preventDefault()
        buttonRefs.current[m - 1]?.focus()
        setPinnedMonth(m)
        return
      }
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
      <div style={{ position: 'relative', width: 32, flex: 'none', height: CHART_HEIGHT, fontSize: 10.5, color: 'var(--text-mid)', textAlign: 'right' }}>
        <span style={{ position: 'absolute', right: 0, top: 0, transform: 'translateY(-50%)' }}>100%</span>
        <span style={{ position: 'absolute', right: 0, top: CHART_HEIGHT / 2, transform: 'translateY(-50%)' }}>50%</span>
        <span style={{ position: 'absolute', right: 0, top: CHART_HEIGHT, transform: 'translateY(-50%)' }}>0%</span>
      </div>
      {/* 월 라벨은 반드시 SVG와 같은 래퍼(이 flex:1 열) 안에 둔다. 바깥(축 라벨 열의 형제)에 두면 왼쪽
          축 라벨 32px + gap 10px = 42px만큼 기준 폭이 달라져 1월 라벨이 막대보다 40px 왼쪽으로 밀린다. */}
      <div ref={wrapRef} style={{ flex: 1, minWidth: 0 }}>
        <div ref={plotRef} style={{ position: 'relative', height: CHART_HEIGHT }}>
          <svg viewBox={`0 0 504 ${CHART_HEIGHT}`} preserveAspectRatio="none" style={{ width: '100%', height: CHART_HEIGHT, display: 'block' }} aria-hidden>
            {BAR_X_POSITIONS.map((x, i) => (
              <rect key={x} x={x} y="0" width="26" height={CHART_HEIGHT} rx="5" style={{ fill: i + 1 === activeMonth ? 'var(--accent-soft)' : 'var(--track)' }} />
            ))}
            <g fill="var(--sav-fill)">
              {bars.map((b) => {
                const height = barHeightOf(b)
                // 배열 인덱스가 아니라 b.month로 x좌표를 고른다 — 서버가 12개월을 다 내려주지 않는 달(연초 등)에는
                // 인덱스와 월이 어긋나 막대가 엉뚱한 달 자리에 그려진다.
                const x = BAR_X_POSITIONS[b.month - 1]
                if (height === 0 || x === undefined) return null
                return <rect key={b.month} x={x} y={CHART_HEIGHT - height} width="26" height={height} rx="5" />
              })}
            </g>
          </svg>
          {/* 달 한 칸씩의 투명 버튼 — 마우스·터치·키보드 입력을 모두 여기서 받는다. */}
          <div
            role="group"
            aria-label="월별 저축률"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse') setHoveredMonth(null)
            }}
            onKeyDown={onKeyDown}
            style={{ position: 'absolute', inset: 0, display: 'flex', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          >
            {MONTH_LABELS.map((label, i) => {
              const month = i + 1
              const bar = barByMonth.get(month)
              const selectable = isSelectable(month)
              return (
                <button
                  key={label}
                  ref={(el) => {
                    buttonRefs.current[i] = el
                  }}
                  type="button"
                  disabled={!selectable}
                  aria-label={bar && selectable ? buildSavingsBarLabel(bar).ariaLabel : `${label}, 아직 오지 않은 달`}
                  aria-pressed={pinnedMonth === month}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse' && selectable) setHoveredMonth(month)
                  }}
                  onClick={() => {
                    // 터치 탭은 onPointerUp이 이미 처리했다. 여기서는 마우스 클릭과 키보드(Enter/Space)만 받는다.
                    if (lastPointerTypeRef.current !== 'mouse') {
                      lastPointerTypeRef.current = 'mouse'
                      return
                    }
                    setPinnedMonth((prev) => (prev === month ? null : month))
                  }}
                  onFocus={(e) => {
                    // 키보드로 들어온 포커스만 말풍선을 연다 — 마우스 클릭의 포커스까지 열면 뒤따르는 click이 바로 닫는다.
                    if (e.currentTarget.matches(':focus-visible')) setPinnedMonth(month)
                  }}
                  // 손가락 커서는 쓰지 않는다 — 누르면 뭔가 열릴 것처럼 보여 과하게 클릭을 유도한다(2026-09-26 사용자 결정).
                  style={{ flex: 1, height: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'default', WebkitTapHighlightColor: 'transparent', borderRadius: 6 }}
                />
              )
            })}
          </div>
          {activeLabel && activeBar && (
            <div
              ref={tooltipRef}
              role="status"
              style={{
                position: 'absolute', left: 0, top: CHART_HEIGHT - barHeightOf(activeBar) - TOOLTIP_GAP, transform: 'translateY(-100%)',
                background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)',
                padding: '8px 12px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{activeLabel.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-mid)', marginTop: 2 }}>{activeLabel.detail}</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', marginTop: 6, fontSize: 10.5, color: 'var(--text-weak)' }}>
          {MONTH_LABELS.map((m, i) => (
            <span
              key={m}
              style={{
                flex: 1, textAlign: 'center',
                // 고른 달은 진하게, 이번 달은 고른 상태여도 accent를 유지한다.
                ...(i + 1 === activeMonth ? { fontWeight: 700, color: 'var(--text-strong)' } : null),
                ...(i + 1 === currentMonth ? { fontWeight: 700, color: 'var(--accent)' } : null),
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
