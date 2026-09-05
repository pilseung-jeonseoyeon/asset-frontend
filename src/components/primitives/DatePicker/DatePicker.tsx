// 날짜 선택 팝오버. 트리거 아이콘은 `calendar_month`(Dropdown의 `expand_more`와 다르다).
// 부모 요소에 `position:relative`가 있어야 한다(데스크톱에서 측정 전 폴백 앵커로 쓴다).
//
// 모바일(<=767px, docs/mobile.md §4 경고 + §5 터치 영역): 고정 `width:240` 패널 대신
// `position:fixed` 뷰포트 앵커(usePopoverAnchor)를 써서, 트리거가 좁은 칸에 있을 때(예: 한 줄에
// DatePicker 두 개) 화면 밖으로 넘치거나 바텀시트의 `overflow-y:auto`에 잘리지 않게 한다.
// 날짜 셀도 28px에서 40px로 키운다 — 360px 폭에서 7열 그리드가 허용하는 한 44px 최소 터치 영역에
// 가장 가까운 값이다.
//
// 데스크톱도 같은 `position:fixed` 앵커를 쓴다. 예전처럼 `position:absolute; top: calc(100% + 6px)`로
// 트리거 아래에 붙이면, 트리거가 모달 패널 아래쪽에 있을 때 팝오버가 패널 바깥으로 삐져나가며
// 잘린다 — Modal.tsx의 데스크톱 기본 패널은 `overflow:visible`이지만 대부분의 호출부가 자기
// `overflow:auto`로 덮어쓰기 때문이다(`grep -rn "panelStyle=" src/`). 폭은 240px 고정 그대로 두고
// (전체 폭으로 퍼지는 건 모바일 레이아웃뿐) 오른쪽 뷰포트 밖으로 나가지 않게 클램프한다.
// 트리거를 아직 재기 전(`anchor.rect`가 `undefined` — `dp.open`이 막 켜지고 `useLayoutEffect`
// 측정이 아직 안 끝난 렌더)에는 원래의 `position:absolute` 배치로 폴백해 스타일 없이 그려지는 일이 없다.
//
// `openAbove`/`maxHeight`만으로는 부족하다: `usePopoverAnchor`의 기본 뒤집기 기준은 '넉넉한' 상수
// (160px)이지 달력의 실제 높이가 아니고, 달력은 그보다 크다. 그 사이 높이에서는 '공간이 충분하다'며
// 아래로 열어놓고 마지막 줄이 `maxHeight`+`overflow-y:auto`에 잘린다. 그래서 패널 자신의
// `scrollHeight`(`overflow` 값과 무관하게 정확하다)를 `panelRef`/`naturalHeight`로 재서
// `preferredHeight`로 넘긴다 — `openAbove`는 그렇게 해야 실제로 잘림을 피할 때만 뒤집힌다.
//
// 패널 높이는 고정이다. 달마다 주(week) 수가 4~6으로 달라지면 그리드 높이가 바뀌고, 그 실측 높이를
// preferredHeight로 넘기면 달을 넘기다 6주짜리 달에서 위로 튀고 5주짜리 달에서 다시 내려오는 식으로
// 패널이 왔다 갔다 한다. 지금은 (1) 셀렉터가 날짜 셀을 항상 42칸(6주)으로 채우고, (2) 헤더 아래
// 본문을 상수 높이(BODY_HEIGHT — 요일행 + 6×셀 + 5×간격)로 고정해 날짜/월/연도 세 뷰가 전부 그 안에
// 그려진다. 그래서 패널 전체 높이 = padding + 헤더 + 본문 = 상수이고, naturalHeight는 열릴 때 한 번만
// 재면 된다. 열려 있는 동안 preferredHeight가 변하지 않으니 위/아래 방향도 바뀌지 않는다 —
// 스크롤·리사이즈로 트리거 위치가 바뀔 때만 usePopoverAnchor가 다시 계산한다(의도된 동작).
//
// 연도·월 그리드: 헤더 가운데 라벨이 `[2026년 ▾] [8월 ▾]` 두 버튼이다. 연도 버튼은 연도 그리드,
// 월 버튼은 월 그리드를 같은 본문 영역에 띄우고, 이미 열린 쪽을 다시 누르면 날짜 뷰로 돌아간다.
// 목록·강조·선택 계산은 전부 selectors/datePicker.ts(dp.yearCells / dp.monthCells)이고, '지금 어느
// 그리드를 보여줄지'(view)만 이 컴포넌트의 로컬 상태다 — 실제 값(datePickerViewingMonth)과 무관한 순수 UI
// 전환이기 때문이다. 달력을 닫을 때 naturalHeight를 리셋하는 effect에 얹어 view도 'date'로 되돌린다
// — 다음에 열 때 항상 날짜 뷰부터 시작한다.
//
// 연도 그리드는 4열이고 본문 안에서 자체 overflow-y:auto로 스크롤된다(Dropdown.tsx의 옵션 목록과 같은
// 패턴). 열릴 때는 지금 보고 있는 연도(dp.yearCells의 isViewingYear)가 보이도록 그 셀의 offsetTop을
// 기준으로 컨테이너 scrollTop을 직접 계산한다 — scrollIntoView는 이 그리드보다 바깥의 스크롤 조상
// (예: 모바일 바텀시트)까지 함께 움직일 수 있어 쓰지 않는다. offsetTop은 '가장 가까운
// position:static이 아닌 조상'(offsetParent) 기준이라, yearGridRef 자신에게 position:'relative'를 줘야
// 그 값이 이 스크롤 컨테이너 기준이 된다 — 안 주면 바깥 패널(position:fixed/absolute)이 offsetParent가
// 되어 헤더 행 높이만큼 계산이 밀린다.
//
// '오늘로 이동'(goToday): 30년 전 연도로 갔다가 오늘로 돌아오려면 100여 개 목록을 다시 스크롤해야
// 하므로 둔 버튼이다. 계산은 dp.goToday(selectors/datePicker.ts)에 있고 여기서는 절제된 톤의
// 텍스트 버튼으로만 노출한다(꽉 찬 액센트 버튼 아님 — 강조 스타일 격상 금지 방침). 월/연도 그리드
// 둘 다에서 같은 자리에 보이고, 누르면 오늘이 속한 달의 날짜 뷰로 바로 이동한다(그리드에 머무르지
// 않는다 — AppState가 단일 reducer라, 열려 있는 동안 다른 입력으로 이 컴포넌트가 리렌더될 때마다
// 스크롤 위치를 오늘 연도로 되돌리면 사용자가 손으로 스크롤한 위치를 계속 빼앗기게 된다).

import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '../Icon/Icon'
import type { DatePickerState } from '../../../state/selectors/datePicker'
import { DATE_PICKER_GRID_CELL_COUNT } from '../../../state/selectors/datePicker'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../usePopoverAnchor'

const DESKTOP_PANEL_WIDTH = 240

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']
const DAY_CELL_SIZE = { desktop: 28, mobile: 40 }
const DAY_CELL_GAP = 3
const DAY_GRID_ROWS = DATE_PICKER_GRID_CELL_COUNT / 7
// 요일 행 높이를 상수로 박아 둬야 아래 BODY_HEIGHT 계산이 실제 렌더와 어긋나지 않는다(lineHeight까지 고정).
const WEEKDAY_ROW_HEIGHT = 14
const WEEKDAY_ROW_MARGIN = 4
// 헤더 아래 본문의 고정 높이 — 날짜 뷰가 6주일 때의 높이이고, 월/연도 뷰도 이 안에 그린다(파일 상단 주석).
const BODY_HEIGHT = {
  desktop: WEEKDAY_ROW_HEIGHT + WEEKDAY_ROW_MARGIN + DAY_GRID_ROWS * DAY_CELL_SIZE.desktop + (DAY_GRID_ROWS - 1) * DAY_CELL_GAP,
  mobile: WEEKDAY_ROW_HEIGHT + WEEKDAY_ROW_MARGIN + DAY_GRID_ROWS * DAY_CELL_SIZE.mobile + (DAY_GRID_ROWS - 1) * DAY_CELL_GAP,
}
const MOBILE_CELL_SIZE = { width: DAY_CELL_SIZE.mobile, height: DAY_CELL_SIZE.mobile }
const MOBILE_NAV_BUTTON_SIZE = { width: 40, height: 40 }
// 연도·월 셀은 날짜 셀(40px)과 달리 "7열 × 360px" 제약이 없다(4열이라 여유가 있다) — 44px 터치 타깃
// 기준까지 그대로 올린다. padding 대신 flex 중앙 정렬로 바꿔 고정 높이 안에서 텍스트가
// 어긋나지 않게 한다.
const MOBILE_YEAR_CELL_STYLE = { height: 44, padding: 0, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }
// 월 셀은 3행이 본문 높이를 나눠 갖도록 grid 행에 맞춰 늘어난다(고정 높이 없음) — 텍스트만 중앙 정렬.
const MONTH_CELL_LAYOUT_STYLE = { padding: 0, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }

type PickerView = 'date' | 'month' | 'year'

interface DatePickerProps {
  dp: DatePickerState
}

export function DatePicker({ dp }: DatePickerProps) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)
  // 지금 보여주는 그리드 — 값(datePickerViewingMonth)과 무관한 순수 UI 전환이라 로컬 상태로 둔다(파일 상단 주석 참고).
  // 아래 naturalHeight 리셋 effect에서 dp.open이 꺼질 때 항상 'date'로 되돌린다.
  const [view, setView] = useState<PickerView>('date')
  const yearGridRef = useRef<HTMLDivElement>(null)
  const navYearCellRef = useRef<HTMLButtonElement>(null)
  // 패널 자체의 실측 높이(scrollHeight) — overflow로 잘려 있어도 항상 잘리기 전 전체 높이를 돌려주므로,
  // 아직 잘못된 방향으로 열려 있는 렌더에서 재도 정확하다(파일 상단 주석 참고). 본문 높이가 상수라
  // 열려 있는 동안 변하지 않으니 열릴 때(와 모바일/데스크톱 전환 때)만 재면 된다. dp.open이 꺼지면
  // 리셋하고, 어느 그리드가 열려 있었든 view도 'date'로 되돌려 다음에 열 때는 항상 날짜 뷰부터 시작한다.
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (!dp.open) {
      setNaturalHeight(undefined)
      setView('date')
      return
    }
    const el = panelRef.current
    if (el) setNaturalHeight(el.scrollHeight)
  }, [dp.open, isMobile])

  // 연도 그리드가 막 열렸을 때, 지금 보고 있는 연도(dp.yearCells의 isViewingYear) 셀이 스크롤 상자 안에
  // 보이도록 위치를 맞춘다. scrollIntoView 대신 scrollTop을 직접 계산하는 이유는 파일 상단 주석 참고.
  useLayoutEffect(() => {
    if (view !== 'year') return
    const container = yearGridRef.current
    const target = navYearCellRef.current
    if (container && target) {
      container.scrollTop = target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2
    }
  }, [view])

  // 모바일·데스크톱 둘 다 position:fixed 앵커링이 필요해 dp.open만으로 활성화한다(파일 상단 주석 참고).
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

  const navButtonBaseStyle = {
    width: 24, height: 24, borderRadius: 8, border: 'none', background: 'var(--track)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined),
  } as const
  const navPlaceholderStyle = { width: 24, height: 24, flex: 'none', ...(isMobile ? MOBILE_NAV_BUTTON_SIZE : undefined) } as const

  // 헤더의 연도/월 버튼 — 누르면 해당 그리드, 이미 열린 쪽을 다시 누르면 날짜 뷰(토글). 모바일 히트
  // 영역은 양옆 40×40 chevron과 맞춰 minHeight 40 + 좌우 패딩을 넓힌다(배경은 그대로 투명 —
  // padding 2px 4px만 주면 실측 ~20px라 오탭이 쉽다).
  const renderHeaderButton = (label: string, target: Exclude<PickerView, 'date'>) => {
    const active = view === target
    return (
      <button
        onClick={() => setView(active ? 'date' : target)}
        style={{
          display: 'flex', alignItems: 'center', gap: 1, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          padding: isMobile ? '2px 6px' : '2px 3px', borderRadius: 6,
          ...(isMobile ? { minHeight: 40 } : undefined),
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{label}</span>
        <Icon name={active ? 'expand_less' : 'expand_more'} size={14} color="var(--text-weak)" />
      </button>
    )
  }

  return (
    <>
      <div
        ref={anchor.anchorRef}
        onClick={dp.toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer', minWidth: 0 }}
      >
        {/* minWidth:0 + ellipsis: 좁은 화면에서 계좌 드롭다운과 반반으로 놓이는 호출부(가계부 입력·환전·매매)가
            있어, 열이 날짜 텍스트보다 좁아져도 트리거가 칸 밖으로 삐져나가지 않게 막는다. */}
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{dp.value}</span>
        <Icon name="calendar_month" size={20} color="var(--text-weak)" style={{ flex: 'none' }} />
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
            {view === 'date' ? (
              <button onClick={dp.prevMonth} style={{ ...navButtonBaseStyle, cursor: 'pointer' }}>
                <Icon name="chevron_left" size={16} color="var(--text-mid)" />
              </button>
            ) : (
              <div style={navPlaceholderStyle} />
            )}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderHeaderButton(dp.yearLabel, 'year')}
              {renderHeaderButton(dp.monthOnlyLabel, 'month')}
            </div>
            {view === 'date' ? (
              <button
                onClick={dp.nextMonth}
                disabled={dp.nextDisabled}
                style={{ ...navButtonBaseStyle, cursor: dp.nextDisabled ? 'default' : 'pointer', opacity: dp.nextDisabled ? 0.4 : 1 }}
              >
                <Icon name="chevron_right" size={16} color="var(--text-mid)" />
              </button>
            ) : (
              <div style={navPlaceholderStyle} />
            )}
          </div>
          {/* 본문 — 세 뷰 모두 이 고정 높이 안에 그린다(파일 상단 주석 참고). */}
          <div style={{ height: isMobile ? BODY_HEIGHT.mobile : BODY_HEIGHT.desktop, display: 'flex', flexDirection: 'column' }}>
            {view === 'date' ? (
              <>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: DAY_CELL_GAP, fontSize: 10, color: 'var(--text-weak)', textAlign: 'center',
                    height: WEEKDAY_ROW_HEIGHT, lineHeight: `${WEEKDAY_ROW_HEIGHT}px`, marginBottom: WEEKDAY_ROW_MARGIN,
                  }}
                >
                  {WEEKDAY_HEADERS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                {/* gridAutoRows로 행 높이를 셀 크기에 고정한다 — 숨김 셀만 있는 마지막 줄도 같은 높이여야
                    본문 높이 계산(BODY_HEIGHT)이 맞는다. */}
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: DAY_CELL_GAP,
                    gridAutoRows: isMobile ? DAY_CELL_SIZE.mobile : DAY_CELL_SIZE.desktop,
                  }}
                >
                  {dp.cells.map((c, i) => (
                    <button
                      key={i}
                      className="mini-hov"
                      onClick={c.pick}
                      style={isMobile ? { ...c.cellStyle, ...MOBILE_CELL_SIZE } : c.cellStyle}
                    >
                      {c.d}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* "오늘로 이동" — 절제된 텍스트 버튼(꽉 찬 액센트 버튼으로 격상하지 않는다).
                    누르면 오늘이 속한 달의 날짜 뷰로 바로 돌아간다 — 이유는 파일 상단 주석 참고. 모바일
                    히트 영역은 헤더 버튼과 같은 패턴으로 minHeight 40 + 좌우 패딩을 넓힌다(배경은 그대로
                    투명, 톤 유지) — 바로 아래가 스크롤되는 연도 그리드라 오탭 위험이 크다. */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, flex: 'none' }}>
                  <button
                    onClick={() => {
                      dp.goToday()
                      setView('date')
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
                {view === 'month' ? (
                  <div
                    style={{
                      display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gridTemplateRows: 'repeat(3,minmax(0,1fr))', gap: 4,
                      flex: 1, minHeight: 0,
                    }}
                  >
                    {dp.monthCells.map((c) => (
                      <button
                        key={c.m}
                        className="mini-hov"
                        onClick={c.pick
                          ? () => {
                              c.pick?.()
                              setView('date')
                            }
                          : undefined}
                        style={{ ...c.cellStyle, ...MONTH_CELL_LAYOUT_STYLE }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    ref={yearGridRef}
                    style={{
                      // position:'relative'가 필수다 — 이 값이 없으면 아래 navYearCellRef.offsetTop이 이
                      // 스크롤 컨테이너가 아니라 바깥 패널(position:fixed/absolute) 기준으로 계산되어,
                      // 헤더 행 높이만큼 스크롤 위치가 항상 밀리는 버그였다(파일 상단 주석 참고).
                      position: 'relative',
                      display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 4, alignContent: 'start',
                      flex: 1, minHeight: 0, overflowY: 'auto',
                    }}
                  >
                    {dp.yearCells.map((c) => (
                      <button
                        key={c.y}
                        ref={c.isViewingYear ? navYearCellRef : undefined}
                        className="mini-hov"
                        onClick={() => {
                          c.pick()
                          setView('date')
                        }}
                        style={isMobile ? { ...c.cellStyle, ...MOBILE_YEAR_CELL_STYLE } : c.cellStyle}
                      >
                        {c.y}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
