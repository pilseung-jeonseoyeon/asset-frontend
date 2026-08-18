// Source: secret/Asset Manager v14.dc.html L1730-1756 (ddEntryDate trigger + panel) — transcribed
// verbatim. Trigger uses `calendar_month` icon (not `expand_more`, unlike Dropdown). Parent element
// must have `position:relative` (used as the desktop pre-measurement fallback anchor — see below).
//
// Mobile (<=767px, docs/mobile.md §4 warning + §5 touch targets): the fixed `width:240` panel is
// replaced with a `position:fixed` viewport anchor (see usePopoverAnchor) so it can't overflow off
// the side of the screen when its trigger sits in a narrow column (e.g. two DatePickers in a flex row),
// and can't be clipped by the bottom sheet's `overflow-y:auto`. Day cells also grow from 28px to 40px —
// as close to the 44px touch-target minimum as a 7-column grid allows within a 360px-wide screen.
//
// Desktop: the panel used to always open below the trigger via `position:absolute; top: calc(100% + 6px)`
// under the `position:relative` field. That's clipped whenever the trigger sits low enough in a modal
// panel that the popover would spill past the panel's own bottom edge — Modal.tsx's default desktop
// panel style is `overflow:visible`, but most callers override it with their own `overflow:auto` (see
// `grep -rn "panelStyle=" src/`) so the *panel* can scroll, which clips the popover the same way the
// mobile sheet does. Fixed instead of scrolled: like mobile, the panel switches to `usePopoverAnchor`'s
// `position:fixed` viewport anchor, positioned at the trigger's own `rect.left` with the fixed 240px
// width kept as-is (only the mobile layout goes full-bleed) and clamped so it can't run past the right
// edge of the viewport either. Before the trigger is measured (`anchor.rect` is `undefined`, i.e. the
// render right after `dp.open` flips true but before the `useLayoutEffect` measurement lands) the panel
// falls back to the original `position:absolute` placement so it never renders unstyled.
//
// `openAbove`/`maxHeight` alone aren't enough once the panel is `position:fixed`: `usePopoverAnchor`'s
// default flip threshold is a "comfortable" constant (160px), not the calendar's actual height, and a
// 5-or-6-row month is taller than that (~230-260px desktop, more on mobile's 40px cells). Between 160px
// and the real height, the panel used to open below "because there's enough room" and then get its own
// last row clipped by its `maxHeight`+`overflow-y:auto` — reproduced by rendering this component in a
// real browser with the trigger positioned in that dead zone (a static read of the code alone wouldn't
// have caught it, since `maxHeight`+`overflow-y:auto` reads as "safe" clipping until you check what's
// actually visible above the fold). Fixed by measuring the panel's own `scrollHeight` (unaffected by its
// `overflow` value, so it stays accurate even while clipped) via `panelRef`/`naturalHeight` below and
// passing that real height to `usePopoverAnchor` as `preferredHeight` instead of relying on its default —
// `openAbove` then only flips when doing so actually avoids clipping (or, if neither direction has room
// for the whole grid, still picks whichever side has more of it, same as before).
//
// 연도 그리드(2026-08-18 추가): 가운데 월 라벨을 버튼으로 바꿔 누르면 같은 패널 안에서 날짜 그리드
// 대신 연도 그리드를 보여준다(dp.yearCells — 목록·강조·선택 계산은 전부 selectors/datePicker.ts).
// 열림 여부(yearView)만 이 컴포넌트의 로컬 상태다 — 실제 값(dpNav)과 무관한 "지금 어느 그리드를
// 보여줄지"라는 순수 UI 전환이기 때문이다. 달력을 닫을 때(dp.open이 꺼질 때) naturalHeight를 리셋하는
// 기존 effect에 얹어 yearView도 같이 false로 되돌린다 — 그래야 다음에 열 때 항상 날짜 뷰부터
// 시작한다(요구사항). 같은 effect의 deps에 yearView를 추가해, 두 그리드를 오갈 때마다 패널의 실측
// 높이(naturalHeight)를 다시 재서 usePopoverAnchor에 정확한 preferredHeight를 넘긴다.
//
// 연도 그리드 자체도 4열 + 자체 maxHeight/overflow-y:auto로 스크롤된다(Dropdown.tsx의 옵션 목록과
// 같은 패턴) — 그래서 naturalHeight(panelRef.scrollHeight)는 100여 개 연도 전체 높이가 아니라 이
// 안쪽 스크롤 상자의 clamp된 높이만 반영한다(overflow가 있는 자손은 자신의 렌더 높이만큼만 부모의
// scrollHeight에 기여한다). 열릴 때는 지금 보고 있는 연도(dp.yearCells의 isNavYear)가 화면에 보이도록
// 그 셀의 offsetTop을 기준으로 컨테이너 scrollTop을 직접 계산한다 — scrollIntoView는 이 그리드보다
// 바깥의 스크롤 조상(예: 모바일 바텀시트)까지 함께 움직일 수 있어 대신 쓰지 않았다. offsetTop은
// "가장 가까운 position:static이 아닌 조상"(offsetParent) 기준이라, yearGridRef 자신에게
// position:'relative'를 줘야 그 값이 이 스크롤 컨테이너 기준이 된다 — 안 주면 바깥 패널
// (position:fixed/absolute)이 offsetParent가 되어 헤더 행 높이만큼 계산이 밀리는 버그였다(리뷰 지적).
//
// "오늘로 이동"(goToday, 리뷰 반영): 30년 전 연도로 이동한 뒤 오늘로 돌아오려면 100여 개 목록을 다시
// 스크롤해야 하는 문제라, 계산은 dp.goToday(selectors/datePicker.ts)에 두고 여기서는 절제된 톤의
// 텍스트 버튼(꽉 찬 액센트 버튼 아님 — 강조 스타일 격상 금지 방침)으로만 노출한다. 누르면 오늘이 속한
// 달의 날짜 뷰로 바로 이동한다(연도 그리드에 머무르지 않는다 — AppState가 단일 reducer라 열려 있는
// 동안 다른 입력으로 이 컴포넌트가 리렌더될 때마다 스크롤 위치를 오늘 연도로 되돌리면 사용자가 손으로
// 스크롤한 위치를 계속 빼앗기게 된다).

import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../Icon/Icon'
import type { DatePickerState } from '../../../state/selectors/datePicker'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../usePopoverAnchor'

const DESKTOP_PANEL_WIDTH = 240

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']
const MOBILE_CELL_SIZE = { width: 40, height: 40 }
const MOBILE_NAV_BUTTON_SIZE = { width: 40, height: 40 }
// 연도 셀은 날짜 셀(40px)과 달리 "7열 × 360px" 제약이 없다(4열이라 여유가 있다) — 44px 터치 타깃
// 기준까지 그대로 올린다(리뷰 지적). padding 대신 flex 중앙 정렬로 바꿔 고정 높이 안에서 텍스트가
// 어긋나지 않게 한다.
const MOBILE_YEAR_CELL_STYLE = { height: 44, padding: 0, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }
const YEAR_GRID_MAX_HEIGHT = { desktop: 180, mobile: 220 }

interface DatePickerProps {
  dp: DatePickerState
}

export function DatePicker({ dp }: DatePickerProps) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)
  // 연도 그리드가 열려 있는지 — 값(dpNav)과 무관한 순수 UI 전환이라 로컬 상태로 둔다(위 헤더 주석
  // 참고). 아래 naturalHeight 리셋 effect에서 dp.open이 꺼질 때 항상 false로 되돌린다.
  const [yearView, setYearView] = useState(false)
  const yearGridRef = useRef<HTMLDivElement>(null)
  const navYearCellRef = useRef<HTMLButtonElement>(null)
  // 패널 자체의 실측 높이(scrollHeight) — overflow로 잘려 있어도 항상 잘리기 전 전체 높이를 돌려주므로,
  // 아직 잘못된 방향으로 열려 있는 렌더에서 재도 정확하다(위 헤더 주석 참고). dp.open이 꺼지면 다음에
  // 열릴 때(달이 바뀌어 있을 수 있음) 새로 재기 위해 리셋한다 — 연도 그리드가 열려 있던 채로 닫혔을
  // 수도 있으니 yearView도 같이 되돌려, 다음에 열 때는 항상 날짜 뷰부터 시작한다.
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (!dp.open) {
      setNaturalHeight(undefined)
      setYearView(false)
      return
    }
    const el = panelRef.current
    if (el) setNaturalHeight(el.scrollHeight)
  }, [dp.open, dp.cells.length, isMobile, yearView])

  // 연도 그리드가 막 열렸을 때, 지금 보고 있는 연도(dp.yearCells의 isNavYear) 셀이 스크롤 상자 안에
  // 보이도록 위치를 맞춘다. scrollIntoView 대신 scrollTop을 직접 계산하는 이유는 위 헤더 주석 참고.
  useLayoutEffect(() => {
    if (!yearView) return
    const container = yearGridRef.current
    const target = navYearCellRef.current
    if (container && target) {
      container.scrollTop = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2
    }
  }, [yearView])

  // 모바일·데스크톱 둘 다 position:fixed 앵커링이 필요해 dp.open만으로 활성화한다(위 헤더 주석 참고).
  const anchor = usePopoverAnchor(dp.open, naturalHeight)

  // 데스크톱: rect.left에 고정폭(240px) 팝오버를 앵커링하되 뷰포트 오른쪽 밖으로 넘치지 않게 클램프한다.
  // top/bottom은 anchor.style(모바일 풀블리드용)이 이미 같은 GAP 공식으로 계산해둔 값을 그대로 쓴다.
  const desktopFixedStyle = !isMobile && anchor.rect && anchor.style
    ? {
        position: 'fixed' as const,
        left: Math.min(anchor.rect.left, window.innerWidth - DESKTOP_PANEL_WIDTH - POPOVER_VIEWPORT_MARGIN),
        right: 'auto' as const,
        top: anchor.style.top,
        bottom: anchor.style.bottom,
        maxHeight: anchor.maxHeight,
        overflowY: 'auto' as const,
      }
    : undefined

  return (
    <>
      <div
        ref={anchor.anchorRef}
        onClick={dp.toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dp.value}</span>
        <Icon name="calendar_month" size={20} color="var(--text-weak)" />
      </div>
      {dp.open && (
        <div
          ref={panelRef}
          onClick={stopPropagation}
          style={{
            // position:absolute + calc(100%+6px) 아래는 데스크톱에서 앵커 측정 전(anchor.rect === undefined)
            // 첫 렌더에만 쓰이는 폴백이다 — 측정이 끝나면 desktopFixedStyle이 아래에서 덮어쓴다.
            position: 'absolute', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 12,
            zIndex: 95, width: DESKTOP_PANEL_WIDTH,
            ...(anchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            ...(isMobile
              ? { ...anchor.style, width: 'auto', maxHeight: anchor.maxHeight, overflowY: 'auto' }
              : desktopFixedStyle),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {yearView ? (
              <div style={{ width: 24, height: 24, flex: 'none', ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined) }} />
            ) : (
              <button
                onClick={dp.prevMonth}
                style={{
                  width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                  ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined),
                }}
              >
                <Icon name="chevron_left" size={16} color="var(--text-mid)" />
              </button>
            )}
            {/* 연도를 직접 고를 수 있게 라벨을 버튼으로 바꿨다 — 개설일·만기일처럼 수십 년 전/후를
                고를 때 한 달씩 chevron 이동만으로는 사실상 쓸 수 없다는 지적 반영. 모바일 히트 영역은
                양옆 40×40 chevron과 맞춰 minHeight 40 + 좌우 패딩을 넓힌다(배경은 그대로 투명 —
                리뷰 지적, 예전엔 padding 2px 4px뿐이라 실측 ~20px로 오탭이 쉬웠다). */}
            <button
              onClick={() => setYearView((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 1, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                padding: isMobile ? '2px 10px' : '2px 4px', borderRadius: 6,
                ...(isMobile ? { minHeight: 40 } : undefined),
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{dp.monthLabel}</span>
              <Icon name={yearView ? 'expand_less' : 'expand_more'} size={14} color="var(--text-weak)" />
            </button>
            {yearView ? (
              <div style={{ width: 24, height: 24, flex: 'none', ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined) }} />
            ) : (
              <button
                onClick={dp.nextMonth}
                disabled={dp.nextDisabled}
                style={{
                  width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)',
                  cursor: dp.nextDisabled ? 'default' : 'pointer', opacity: dp.nextDisabled ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                  ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined),
                }}
              >
                <Icon name="chevron_right" size={16} color="var(--text-mid)" />
              </button>
            )}
          </div>
          {yearView ? (
            <>
              {/* "오늘로 이동" — 절제된 텍스트 버튼(꽉 찬 액센트 버튼으로 격상하지 않는다, 리뷰 지적).
                  누르면 오늘이 속한 달의 날짜 뷰로 바로 돌아간다 — 이유는 위 헤더 주석 참고. 모바일
                  히트 영역은 월 라벨 버튼과 같은 패턴으로 minHeight 40 + 좌우 패딩을 넓힌다(배경은
                  그대로 투명, 톤 유지) — 바로 아래가 스크롤되는 연도 그리드라 오탭 위험이 크다(리뷰
                  지적, 예전엔 padding 2px 4px뿐이라 실측 ~17px였다). */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <button
                  onClick={() => {
                    dp.goToday()
                    setYearView(false)
                  }}
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    padding: isMobile ? '2px 10px' : '2px 4px',
                    ...(isMobile ? { minHeight: 40, display: 'flex', alignItems: 'center' } : undefined),
                  }}
                >
                  오늘로 이동
                </button>
              </div>
              <div
                ref={yearGridRef}
                style={{
                  // position:'relative'가 필수다 — 이 값이 없으면 아래 navYearCellRef.offsetTop이 이
                  // 스크롤 컨테이너가 아니라 바깥 패널(position:fixed/absolute) 기준으로 계산되어,
                  // 헤더 행 높이만큼 스크롤 위치가 항상 밀리는 버그였다(리뷰 지적, 위 헤더 주석 참고).
                  position: 'relative',
                  display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 4,
                  maxHeight: isMobile ? YEAR_GRID_MAX_HEIGHT.mobile : YEAR_GRID_MAX_HEIGHT.desktop, overflowY: 'auto',
                }}
              >
                {dp.yearCells.map((c) => (
                  <button
                    key={c.y}
                    ref={c.isNavYear ? navYearCellRef : undefined}
                    className="mini-hov"
                    onClick={() => {
                      c.pick()
                      setYearView(false)
                    }}
                    style={isMobile ? { ...c.cellStyle, ...MOBILE_YEAR_CELL_STYLE } : c.cellStyle}
                  >
                    {c.y}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 3, fontSize: 10, color: 'var(--text-weak)', textAlign: 'center', marginBottom: 4 }}>
                {WEEKDAY_HEADERS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 3 }}>
                {dp.cells.map((c, i) => (
                  <button
                    key={i}
                    className="mini-hov"
                    onClick={c.pick}
                    style={isMobile && c.d !== '' ? { ...c.cellStyle, ...MOBILE_CELL_SIZE } : c.cellStyle}
                  >
                    {c.d}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
