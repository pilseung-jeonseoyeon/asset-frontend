// Source: secret/Asset Manager v14.dc.html L2637-3011 (isLedger block) — layout/structure transcribed
// verbatim, data source swapped from src/data/mockLedger.ts (deleted) to the transaction/subscription/
// account services + src/data/ledgerView.ts. See ledgerView.ts header for which formulas are
// design-system rules (kept verbatim) vs. new server-input plumbing.

import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { SegmentedTab } from '../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../state/AppStateContext'
import {
  addDays,
  firstOwnedWeekMonday,
  isoDateToDisplay,
  mondayOf,
  shiftYearMonth,
  toISODate,
  todayYearMonth,
  weekOwnerYearMonth,
  yearMonthLabel,
  yearMonthOf,
} from '../../utils/date'
import { formatNumber } from '../../utils/format'
import { openNewEntryUpdater } from '../../state/selectors/entryDraft'
import { useDebouncedValue } from '../../utils/useDebouncedValue'
import { useIsMobile } from '../../utils/useMediaQuery'
import {
  buildLedgerCategories,
  buildLedgerTx,
  buildMonthCalendarRows,
  buildPeriodDeltas,
  buildSavingsBars,
  buildSavingsRing,
  buildSubscriptionRows,
  buildTransferTotalsByDate,
  buildWeekCalendarRow,
  computeRecentAvgSavingsRate,
  dayListTitle,
  describeQueryError,
  getLedgerHeroTitle,
  getSavingsRingCopy,
  pickTopIncreaseLabel,
  sumCalendarTotals,
  TX_TYPE_TO_ENTRY_TYPE,
  weekListTitle,
  weekPeriodLabel,
  type CalendarCell,
  type DayLine,
  type SubscriptionRow,
} from '../../data/ledgerView'
import { useGetAccounts } from '@/services/account'
import { useGetSubscriptions } from '@/services/subscription'
import {
  useGetCategoryRankings,
  useGetDailySummaries,
  useGetMonthlySummaries,
  useGetPeriodSummary,
  useGetTransactions,
} from '@/services/transaction'
import type { DeltaBadge } from '../../utils/deltaBadge'
import type { EntryType } from '../../state/types'

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const WEEKDAY_HEADERS: { label: string; color: string }[] = [
  { label: '월', color: 'var(--text-weak)' },
  { label: '화', color: 'var(--text-weak)' },
  { label: '수', color: 'var(--text-weak)' },
  { label: '목', color: 'var(--text-weak)' },
  { label: '금', color: 'var(--text-weak)' },
  { label: '토', color: 'var(--text-mid)' },
  { label: '일', color: 'var(--text-mid)' },
]
/** 기간 이동 화살표. 아이콘은 18px 그대로 두고 터치 영역만 44px로 넓힌다(docs/mobile.md §5). */
const ARROW_BTN_STYLE = {
  width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0,
} as const

const BAR_X_POSITIONS = [8, 50, 92, 134, 176, 218, 260, 302, 344, 386, 428, 470]

function LoadingLine() {
  return (
    <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>
      —
    </div>
  )
}

function ErrorLine({ message, muted }: { message: string; muted: boolean }) {
  return <div style={{ fontSize: 11.5, color: muted ? 'var(--text-weak)' : 'var(--down)' }}>{message}</div>
}

/** 달력의 이체 줄을 만들기 위해 한 번에 받아오는 이체 거래 수. 한 달치 이체가 이 수를 넘으면
 *  넘친 만큼은 달력에 그려지지 않고 캡션으로 안내한다(transferTruncated). */
const CALENDAR_TRANSFER_SIZE = 200

/**
 * 모바일은 7칸을 화면 폭에 균등 분배한다 — minmax(0,1fr)의 0이 핵심으로, 1fr만 쓰면 칸 안 내용의
 * min-content가 트랙을 밀어올려 격자가 다시 화면 밖으로 넘어간다(CalendarCellView 주석 참고).
 */
const CALENDAR_GRID_COLUMNS = (isMobile: boolean) =>
  isMobile ? 'repeat(7, minmax(0, 1fr))' : 'repeat(7, 1fr)'

/** 모바일 달력 칸의 색 점이 무슨 뜻인지 알려주는 범례. 색은 dayLine(ledgerView.ts)과 같은 순서. */
const CALENDAR_DOT_LEGEND: { label: string; color: string }[] = [
  { label: '수입', color: 'var(--inc-text)' },
  { label: '저축', color: 'var(--sav-text)' },
  { label: '지출', color: 'var(--exp-text)' },
  { label: '이체', color: 'var(--text-mid)' },
]

/**
 * 달력 우측 상단의 기간(주/월) 수입·지출 합계. 달력 칸은 "그 날 하루"만 보여줘서 지금 보고 있는
 * 주/달 전체가 얼마인지 알 수 없었다 — 특히 모바일은 칸에서 금액 배지를 걷어내고 색 점만 남겼기
 * 때문에(CalendarCellView 주석) 달력만 봐서는 규모를 전혀 알 수 없었다.
 *
 * 저축·이체는 넣지 않는다(2026-08-29 사용자 결정). 색만으로 수입/지출을 가르지 않도록 라벨과
 * +/− 부호를 함께 둔다. 0원인 기간은 "+0 / −0"이 어색하므로 부호 없이 회색 0으로 조용히 구분한다.
 */
function CalendarTotalsRow({ periodLabel, income, expense }: { periodLabel: string; income: number; expense: number }) {
  const isMobile = useIsMobile()
  // 금액이 커져 한 줄에 안 들어가면 잘라내지 않고 줄바꿈한다(docs/mobile.md §6 — 금액은 크기를
  // 줄이기보다 줄바꿈·축약 우선. 여기서는 축약 없이 전체 금액을 그대로 보여준다).
  const item = (label: string, amount: number, sign: string, color: string) => (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{label}</span>
      <span
        style={{
          fontSize: isMobile ? 11.5 : 13,
          fontWeight: 700,
          color: amount === 0 ? 'var(--text-weak)' : color,
          whiteSpace: 'nowrap',
        }}
      >
        {amount === 0 ? '0' : sign + formatNumber(amount)}
      </span>
    </span>
  )

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: isMobile ? 10 : 14,
        marginBottom: isMobile ? 10 : 14,
      }}
    >
      {/* 무엇의 합계인지 밝힌다. 달력 칸을 눌러 아래 목록을 하루로 좁혀도 이 합계는 기간 전체
          그대로이므로(달력이 그리는 범위와 맞춘다), 라벨이 없으면 "오늘 하루 합계"로 오해한다. */}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)', marginRight: 'auto' }}>{periodLabel}</span>
      {item('수입', income, '+', 'var(--inc-text)')}
      {/* 부호는 달력 칸 배지(dayLine)와 같은 U+2212 −를 쓴다 — 하이픈과 섞이면 모양이 어긋난다. */}
      {item('지출', expense, '−', 'var(--exp-text)')}
    </div>
  )
}

function CalendarCellView({
  cell,
  selected,
  onSelect,
  onAdd,
}: {
  cell: CalendarCell
  selected: boolean
  onSelect: () => void
  onAdd: () => void
}) {
  // 그리드 아이템은 기본적으로 내용물의 min-content보다 작아지지 않는다(min-width:auto). 금액
  // 배지의 안 끊어지는 숫자 문자열이 이 칸의 min-content라 좁은 폭에서 칸 너비를 그대로 강제로
  // 늘려 캘린더 전체가 뷰포트 밖으로 밀려난다. minWidth:0으로 그리드 트랙이 실제 배정된 몫만큼만
  // 차지하게 하고, 배지는 그 안에서 넘치면 말줄임표로 자른다.
  //
  // 모바일은 아예 금액 배지를 그리지 않는다(2026-08-20). 칸 폭을 64px로 고정하고 가로 스크롤로
  // 넘기던 방식은 7칸(496px)이 어떤 폰 화면에도 들어가지 않아, 열자마자 한 열이 잘린 채로 보이고
  // "달력이 넘어갔다"로 읽혔다. 7칸을 화면 폭에 균등 분배(minmax(0,1fr))하는 대신 칸 안에는
  // 날짜와 거래 종류별 색 점만 남기고, 금액은 바로 아래 "전체 내역" 목록에서 본다 — 가로 스크롤이
  // 사라지고 한 달이 한 화면에 들어온다. 점 색은 배지와 같은 dayLine의 color를 그대로 쓴다
  // (수입 --inc-text / 저축 --sav-text / 지출 --exp-text / 이체 --text-mid).
  const isMobile = useIsMobile()

  // 칸은 원래 그냥 클릭되는 div였다. "그날 내역 보기" 토글이 되면서 눌림 상태(aria-pressed)를 알려야
  // 하는데, aria-pressed는 role="button"이 있어야 유효하다 — role을 붙이면 키보드로도 눌려야 하므로
  // tabIndex와 Enter/Space 처리를 함께 둔다(그 전까지 이 칸은 키보드로 도달조차 못 했다).
  const interactiveProps = {
    role: 'button',
    tabIndex: 0,
    'aria-pressed': selected,
    onClick: onSelect,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onSelect()
    },
  }

  if (isMobile) {
    return (
      <div
        {...interactiveProps}
        style={{
          height: 44,
          minWidth: 0,
          borderRadius: 8,
          // 고른 날은 오늘(highlighted)보다 한 단계 진하게 — 둘이 같으면 "내가 누른 칸"이 어디인지
          // 알 수 없다. 선택은 사용자의 조작 결과라 오늘 표시보다 우선한다.
          border: selected
            ? '1px solid var(--accent)'
            : cell.highlighted
              ? '0.5px solid var(--accent)'
              : '0.5px solid var(--track)',
          background: selected ? 'var(--accent-soft)' : cell.highlighted ? 'var(--fill-subtle)' : undefined,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            lineHeight: 1,
            color: cell.highlighted ? 'var(--text-strong)' : 'var(--text-mid)',
          }}
        >
          {cell.label}
        </div>
        {/* 점이 하나도 없는 날에도 높이가 흔들리지 않도록 자리(5px)는 항상 잡아 둔다. */}
        <div style={{ display: 'flex', gap: 2.5, height: 5, alignItems: 'center' }}>
          {cell.lines.map((ln: DayLine, i: number) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: ln.color }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      {...interactiveProps}
      style={{
        // 배지 한 줄이 약 20px + 줄 간격 2px, 위 여백(날짜 숫자 자리) 20px, 상하 padding 7px씩 —
        // 수입·저축·지출·이체 네 줄이 모두 있는 날에도 잘리지 않는 높이다(3줄 96px → 4줄 120px).
        height: 120,
        minWidth: 0,
        borderRadius: 8,
        // 선택 표시는 모바일 칸과 같은 규칙 — 위 isMobile 분기 주석 참고.
        border: selected
          ? '1px solid var(--accent)'
          : cell.highlighted
            ? '0.5px solid var(--accent)'
            : '0.5px solid var(--track)',
        padding: 7,
        background: selected ? 'var(--accent-soft)' : cell.highlighted ? 'var(--fill-subtle)' : undefined,
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 7,
          fontSize: 16,
          fontWeight: 700,
          color: cell.highlighted ? 'var(--text-strong)' : 'var(--text-mid)',
        }}
      >
        {cell.label}
      </div>
      {/* 칸 자체를 누르면 이제 "그날 내역 보기"라, 예전에 칸 클릭이 하던 "그날 거래 추가"는 이
          + 아이콘이 이어받는다. stopPropagation으로 칸의 선택 동작과 겹치지 않게 한다.
          (모바일 칸에는 이 아이콘이 없다 — 대신 목록 위 "이 날짜에 거래 추가" 버튼으로 들어간다.) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onAdd()
        }}
        aria-label={`${cell.label}일에 거래 추가`}
        className="mini-hov"
        style={{
          position: 'absolute', top: 2, right: 2, width: 24, height: 24, borderRadius: 6,
          border: 'none', background: 'transparent', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', padding: 0,
        }}
      >
        <span className="ms" style={{ fontSize: 13, color: 'var(--text-weak)' }}>add</span>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 20 }}>
        {cell.lines.map((ln: DayLine, i: number) => (
          <div
            key={i}
            style={{
              fontSize: 11.5, fontWeight: 700, color: ln.color, background: 'var(--fill-subtle)', borderRadius: 8,
              padding: '3px 5px', width: 'fit-content', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', boxSizing: 'border-box',
            }}
          >
            {ln.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 수입·지출·저축·이체 빠른 입력 버튼. 원래 '내역' 탭 툴바에만 있었는데, 가계부에 들어오면 항상
 * '개요' 탭이 먼저 떠서 지출 하나 적는 데 탭 전환이 한 번씩 더 들었다(2026-08-29 사용자 요청).
 * 두 탭이 공유하도록 화면 최상단 세그탭 옆으로 올렸다.
 */
function EntryQuickButtons() {
  const { setState } = useAppState()
  // 여기서 여는 건 항상 새 거래다. 저장하지 않고 닫아둔 같은 유형의 초안이 있으면 되살아난다
  // (state/selectors/entryDraft.ts). 유형을 버튼으로 지목해 들어오므로 유형 탭은 숨긴다.
  const openEntry = (entryType: EntryType) => () => setState(openNewEntryUpdater(entryType, false, null))

  return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <button
          onClick={openEntry('income')}
          className="qbtn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--inc-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          수입
        </button>
        <button
          onClick={openEntry('expense')}
          className="qbtn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--exp-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          지출
        </button>
        <button
          onClick={openEntry('saving')}
          className="qbtn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--sav-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          저축
        </button>
        <button
          onClick={openEntry('transfer')}
          className="qbtn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, padding: '0 14px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          이체
        </button>
      </div>)
}

export function Ledger() {
  const { state, setState } = useAppState()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {/* 서브 세그먼트 탭 + 빠른 입력 버튼. 좁은 화면에서는 버튼이 아랫줄로 접힌다. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2, width: 'fit-content' }}>
          <SegmentedTab active={state.ledgerTab === 'overview'} onClick={() => setState({ ledgerTab: 'overview' })}>
            개요
          </SegmentedTab>
          <SegmentedTab active={state.ledgerTab === 'history'} onClick={() => setState({ ledgerTab: 'history' })}>
            내역
          </SegmentedTab>
        </div>
        <EntryQuickButtons />
      </div>

      {state.ledgerTab === 'overview' && <LedgerOverview />}
      {state.ledgerTab === 'history' && <LedgerHistory />}
    </div>
  )
}

function LedgerOverview() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const period = state.ledgerPeriod
  const today = todayYearMonth()

  const summary = useGetPeriodSummary(period === 'month' ? 'MONTH' : 'YEAR')
  const rankings = useGetCategoryRankings({})
  const fixed = useGetSubscriptions('FIXED')
  const subs = useGetSubscriptions('SUBSCRIPTION')
  const monthly = useGetMonthlySummaries(today.year)
  const accountsQuery = useGetAccounts()

  const accounts = accountsQuery.data ?? []
  const summaryErr = describeQueryError(summary.error)
  const rankingsErr = describeQueryError(rankings.error)
  const fixedErr = describeQueryError(fixed.error)
  const subsErr = describeQueryError(subs.error)
  const monthlyErr = describeQueryError(monthly.error)

  const deltas = summary.data ? buildPeriodDeltas(summary.data, period) : null
  const ring = summary.data ? buildSavingsRing(summary.data) : null
  const ringCopy = getSavingsRingCopy(period)
  const catRows = buildLedgerCategories(rankings.rankings)
  const topIncreaseLabel = pickTopIncreaseLabel(catRows)
  // 서버가 isActive:false도 목록에 그대로 내려주므로(소프트 삭제) activeSubscriptions로 한 번 걸러낸다
  // — 로컬 전용 숨김 목록은 더 이상 쓰지 않는다(DELETE /subscriptions가 실제로 종료 처리한다).
  const fixedRows = buildSubscriptionRows(fixed.activeSubscriptions, accounts)
  const subRows = buildSubscriptionRows(subs.activeSubscriptions, accounts)
  const fixedTotalFmt = fixedRows.length ? fmtSum(fixed.activeSubscriptions.map((s) => s.amount)) : '0'
  const subsTotalFmt = subRows.length ? fmtSum(subs.activeSubscriptions.map((s) => s.amount)) : '0'
  const bars = buildSavingsBars(monthly.summaries, today.month)
  const recentAvg = computeRecentAvgSavingsRate(bars)

  // 서버에 단일 구독 조회가 없어(secret/API-SPEC.md §8), 이미 이 화면이 받아둔 목록 행(SubscriptionRow)의
  // 값을 그대로 폼에 채운다 — sub가 null이면 신규 추가.
  const openRecur = (recurringType: 'fixed' | 'subscription', sub: SubscriptionRow | null) =>
    setState({
      modalOpen: 'fixedExpense',
      recurringType,
      editingRecurId: sub?.id ?? null,
      recurName: sub?.name ?? '',
      recurAmount: sub?.amount ?? 0,
      recurSubcategoryId: sub?.subcategoryId ?? null,
      recurAccountId: sub?.accountId ?? null,
      recurPayDay: sub ? `${sub.paymentDay}일` : '25일',
      openDropdown: null,
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 이번달/올해 수지 하이라이트 */}
      <DeepCard style={{ justifyContent: 'flex-start' }}>
        {/* 좁은 폭에서는 제목이 두 줄로 접힌다 — center 정렬이면 탭이 두 줄 사이 애매한 높이에
            떠 보여서, 모바일에서는 첫 줄과 나란히 뜨도록 위쪽 기준으로 맞춘다. */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{getLedgerHeroTitle(period, today.year)}</div>
          <div style={{ display: 'flex', background: 'var(--deep-seg-track)', borderRadius: 10, padding: 4, gap: 2, flex: 'none' }}>
            <SegmentedTab variant="deep" active={period === 'month'} onClick={() => setState({ ledgerPeriod: 'month' })}>
              이번 달
            </SegmentedTab>
            <SegmentedTab variant="deep" active={period === 'year'} onClick={() => setState({ ledgerPeriod: 'year' })}>
              올해
            </SegmentedTab>
          </div>
        </div>
        {summary.isPending ? (
          <div aria-busy style={{ fontSize: 12.5, color: 'var(--deep-label)' }}>
            —
          </div>
        ) : summaryErr ? (
          <div style={{ fontSize: 11.5, color: summaryErr.muted ? 'var(--deep-label)' : 'var(--deep-down)' }}>{summaryErr.message}</div>
        ) : (
          summary.data && (
            <>
              <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                <HeroValue label="수입" valueFmt={summary.data.incomeTotal} sign="+" color="var(--deep-up)" delta={deltas?.income ?? null} />
                <HeroValue label="지출" valueFmt={summary.data.expenseTotal} sign="−" color="var(--deep-down)" delta={deltas?.expense ?? null} />
                <HeroValue label="저축" valueFmt={summary.data.savingTotal} sign="" color="var(--deep-saving)" delta={deltas?.saving ?? null} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 22, paddingTop: 18, borderTop: '0.5px solid var(--deep-divider)' }}>
                <span style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 400 }}>저축률</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  {summary.data.savingsRatePercent === null ? '—' : `${Math.round(summary.data.savingsRatePercent)}%`}
                </span>
                {recentAvg !== null && (
                  <span style={{ fontSize: 11.5, color: 'var(--deep-label)', fontWeight: 400 }}>· 최근 6개월 평균 {recentAvg}%</span>
                )}
              </div>
            </>
          )
        )}
      </DeepCard>

      {/* 지출 그룹 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Icon name="credit_card" size={16} color="var(--exp-text)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>지출</span>
        </div>
        <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'stretch' }}>
          <Card style={{ padding: 24 }} aria-busy={rankings.isPending}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>전월 대비 분류별 지출</div>
              {topIncreaseLabel && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
                    color: 'var(--exp-text)', background: 'var(--fill-subtle)', padding: '5px 10px', borderRadius: 8,
                  }}
                >
                  <Icon name="arrow_upward" size={14} />
                  {topIncreaseLabel}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 14 }}>카테고리별 지출 순위 · 전월 대비 증감</div>
            {rankings.isPending ? (
              <LoadingLine />
            ) : rankingsErr ? (
              <ErrorLine message={rankingsErr.message} muted={rankingsErr.muted} />
            ) : catRows.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>이번 달에는 지출 내역이 없어요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {catRows.map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'categoryDetail', catDetailCategoryId: cat.categoryId })}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', borderBottom: '0.5px solid var(--fill-subtle)', borderRadius: 10, cursor: 'pointer' }}
                  >
                    {/* 네 칸의 고정 폭 합(56+92+40+64)에 간격 36을 더하면 288px이라, 좁은 폰
                        (아이폰 SE·미니 등 375px 이하)에서는 카드 안쪽 폭을 넘어 줄이 화면 밖으로
                        밀려났다(2026-08-29 실기 확인, 306px에서 337px까지 넘침).
                        flex:'none'을 '0 1 auto'로 바꿔 **자리가 모자랄 때만** 줄어들게 한다 — 데스크톱처럼
                        여유가 있으면 flex-basis(=width)가 그대로라 지금 보이는 정렬이 유지되고, 좁아지면
                        각 칸이 비례해 줄면서 넘치는 글자는 말줄임으로 잘린다. */}
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', width: 56, flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', width: 92, flex: '0 1 auto', minWidth: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.amtFmt}원</div>
                    <div style={{ flex: 1, height: 7, background: 'var(--track)', borderRadius: 4, minWidth: 24 }}>
                      <div style={{ height: '100%', width: `${cat.barPct}%`, background: cat.rampColor, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, width: 64, flex: '0 1 auto', minWidth: 0, textAlign: 'right', color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.isNew ? '신규' : `${cat.changeSign}${cat.changePctFmt}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card style={{ padding: 24 }} aria-busy={fixed.isPending}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>고정 지출</div>
                {!fixed.isPending && !fixedErr && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>월 {fixedTotalFmt}원</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>주거, 보험 등</div>
              {fixed.isPending ? (
                <LoadingLine />
              ) : fixedErr ? (
                <ErrorLine message={fixedErr.message} muted={fixedErr.muted} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fixedRows.map((sub) => (
                    <div
                      key={sub.id}
                      className="mini-hov"
                      onClick={() => openRecur('fixed', sub)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <Icon name={sub.icon} size={18} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>
                            {sub.dayLabel}
                            {sub.accountLabel && ` · ${sub.accountLabel}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--exp-text)', flex: 'none' }}>−{sub.amtFmt}</div>
                    </div>
                  ))}
                  <button
                    className="qbtn"
                    onClick={() => openRecur('fixed', null)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10,
                      border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit',
                    }}
                  >
                    <Icon name="add" size={16} />
                    고정 지출 추가
                  </button>
                </div>
              )}
            </Card>
            <Card style={{ padding: 24 }} aria-busy={subs.isPending}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>구독</div>
                {!subs.isPending && !subsErr && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>월 {subsTotalFmt}원</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>음악, OTT 등</div>
              {subs.isPending ? (
                <LoadingLine />
              ) : subsErr ? (
                <ErrorLine message={subsErr.message} muted={subsErr.muted} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {subRows.map((sub) => (
                    <div
                      key={sub.id}
                      className="mini-hov"
                      onClick={() => openRecur('subscription', sub)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: '10px 8px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--fill-subtle)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <Icon name={sub.icon} size={17} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{sub.dayLabel}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--exp-text)', flex: 'none' }}>−{sub.amtFmt}</div>
                    </div>
                  ))}
                  <button
                    className="qbtn"
                    onClick={() => openRecur('subscription', null)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10,
                      border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit',
                    }}
                  >
                    <Icon name="add" size={16} />
                    구독 추가
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 저축 그룹 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Icon name="savings" size={16} color="var(--sav-text)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>저축</span>
        </div>
        <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, alignItems: 'stretch' }}>
          <Card style={{ padding: 24 }} aria-busy={summary.isPending}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{ringCopy.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>{ringCopy.subtitle}</div>
            {summary.isPending ? (
              <div style={{ marginTop: 14 }}>
                <LoadingLine />
              </div>
            ) : summaryErr ? (
              <div style={{ marginTop: 14 }}>
                <ErrorLine message={summaryErr.message} muted={summaryErr.muted} />
              </div>
            ) : !ring ? (
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-weak)' }}>수입이 없어 계산할 수 없어요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 1, marginTop: 14 }}>
                  <div style={{ position: 'relative', width: 134, height: 134, flex: 'none' }}>
                    <svg width="134" height="134" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--track)' }} strokeWidth="6" />
                      <circle
                        cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--sav-fill)' }} strokeWidth="6"
                        strokeLinecap="round" strokeDasharray={ring.dashArray} transform="rotate(-90 21 21)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-strong)', lineHeight: 1 }}>{ring.ratePct}%</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>저축률</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--sav-fill)', flex: 'none' }} />
                      <span style={{ color: 'var(--text-mid)', flex: 1 }}>저축</span>
                      <b style={{ color: 'var(--sav-text)' }}>{ring.savingFmt}원</b>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, flex: 'none' }} />
                      <span style={{ color: 'var(--text-mid)', flex: 1 }}>지출</span>
                      <b style={{ color: 'var(--text-mid)' }}>{ring.expenseFmt}원</b>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
                  수입의 <b style={{ color: 'var(--text-strong)' }}>{ring.ratePct}%</b>를 저축했어요
                </div>
              </>
            )}
          </Card>
          <Card style={{ padding: 24 }} aria-busy={monthly.isPending}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>월별 저축률</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>1월~12월 · 수입 대비 저축률</div>
            {monthly.isPending ? (
              <div style={{ marginTop: 14 }}>
                <LoadingLine />
              </div>
            ) : monthlyErr ? (
              <div style={{ marginTop: 14 }}>
                <ErrorLine message={monthlyErr.message} muted={monthlyErr.muted} />
              </div>
            ) : bars.length === 0 ? (
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-weak)' }}>아직 월별 데이터가 없어요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14, fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: 'var(--sav-fill)' }} />
                    저축률
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
                  <div style={{ position: 'relative', width: 32, flex: 'none', height: 130, fontSize: 10.5, color: 'var(--text-mid)', textAlign: 'right' }}>
                    <span style={{ position: 'absolute', right: 0, top: 0, transform: 'translateY(-50%)' }}>100%</span>
                    <span style={{ position: 'absolute', right: 0, top: 65, transform: 'translateY(-50%)' }}>50%</span>
                    <span style={{ position: 'absolute', right: 0, top: 130, transform: 'translateY(-50%)' }}>0%</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <svg viewBox="0 0 504 130" preserveAspectRatio="none" style={{ width: '100%', height: 130, display: 'block' }}>
                      <g fill="var(--track)">
                        {BAR_X_POSITIONS.map((x) => (
                          <rect key={x} x={x} y="0" width="26" height="130" rx="5" />
                        ))}
                      </g>
                      <g fill="var(--sav-fill)">
                        {bars.map((b) => {
                          if (b.isFuture) return null
                          const height = (b.pct / 100) * 130
                          // 배열 인덱스가 아니라 b.month로 x좌표를 고른다 — 서버가 12개월을 다 내려주지
                          // 않는 달(연초 등)에는 인덱스와 월이 어긋나 막대가 엉뚱한 달 자리에 그려진다.
                          const x = BAR_X_POSITIONS[b.month - 1]
                          if (x === undefined) return null
                          return <rect key={b.month} x={x} y={130 - height} width="26" height={height} rx="5" />
                        })}
                      </g>
                    </svg>
                    {/* 월 라벨은 반드시 SVG와 같은 래퍼(이 flex:1 열) 안에 둔다. 바깥(축 라벨 열의
                        형제)에 두면 왼쪽 축 라벨 32px + gap 10px = 42px만큼 기준 폭이 달라져, 카드
                        폭과 무관하게 1월 라벨이 막대보다 40px 왼쪽으로 밀린다(대시보드 추이 그래프도
                        같은 이유로 라벨을 SVG와 한 래퍼에 두고 있다). */}
                    <div style={{ display: 'flex', marginTop: 6, fontSize: 10.5, color: 'var(--text-weak)' }}>
                      {MONTH_LABELS.map((m, i) => (
                        <span key={m} style={{ flex: 1, textAlign: 'center', ...(i + 1 === today.month ? { fontWeight: 700, color: 'var(--accent)' } : null) }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function fmtSum(amounts: number[]): string {
  return formatNumber(amounts.reduce((sum, n) => sum + n, 0))
}

function HeroValue({
  label, valueFmt, sign, color, delta,
}: {
  label: string
  valueFmt: number
  sign: string
  color: string
  delta: DeltaBadge | null
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>{label}</div>
      <div className="dk-accent" style={{ fontSize: 30, fontWeight: 700, marginTop: 8, color, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
        {sign}
        {formatNumber(valueFmt)}
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--deep-label)' }}>원</span>
      </div>
      <div style={{ marginTop: 10, minHeight: 24 }}>{delta && <DeltaChip delta={delta} />}</div>
    </div>
  )
}

function DeltaChip({ delta }: { delta: DeltaBadge }) {
  return (
    <span
      className="dk-accent"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700,
        color: delta.color, background: delta.bg, padding: '4px 9px 4px 5px', borderRadius: 8,
      }}
    >
      <Icon name={delta.icon} size={14} />
      {delta.text}
    </span>
  )
}

function LedgerHistory() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const range = state.ledgerRange
  const isWeek = range === 'week'
  const cursor = { year: state.ledgerYear, month: state.ledgerMonth }
  const weekAnchor = state.ledgerWeekAnchor
  const weekEnd = addDays(weekAnchor, 6)
  // 주간 뷰가 월 경계를 넘으면(예: 8월 마지막 주에 9/1이 섞임) 일별 요약이 두 달에 걸쳐 있을 수
  // 있다 — daily summary가 year/month 단위로만 조회되므로(from/to 미지원) 겹치는 두 달을 각각 조회해
  // 합친다. 월간 뷰거나 주가 한 달 안에 온전히 들어가면 두 번째 쿼리는 enabled:false로 쉰다.
  const weekStartMonth = isWeek ? yearMonthOf(weekAnchor) : cursor
  const weekEndMonth = isWeek ? yearMonthOf(weekEnd) : cursor
  const needsSecondMonth =
    isWeek && (weekStartMonth.year !== weekEndMonth.year || weekStartMonth.month !== weekEndMonth.month)

  // 목록 조회: 서버 TransactionSearchReq가 from/to를 지원하므로(OpenAPI 실측) 주간 뷰는 정산월
  // year/month 대신 from/to로 직접 필터한다 — year/month를 함께 보내면 이 화면이 쓰는 달력 주(월요일
  // 시작)와 서버의 정산월 경계가 어긋날 때 필터 조건이 서로 충돌해 없어도 될 결과 누락이 생길 수 있다.
  // 달력에서 하루를 고르면 목록을 그 하루로 좁힌다(from=to=그 날). 정산월 year/month를 함께 보내지
  // 않는 이유는 주간 뷰와 같다 — 고른 날이 정산월 경계 밖일 수 있어 두 조건이 충돌하면 있어야 할
  // 거래가 사라진다. 하루치는 5건을 넘길 수 있으므로 페이지네이션은 그대로 둔다.
  const selectedDate = state.ledgerSelectedDate
  // 검색어는 타이핑 중 글자마다 요청이 나가지 않도록 잠시 멈출 때까지 기다렸다 보낸다.
  const searchInput = state.ledgerSearch
  const searchTerm = useDebouncedValue(searchInput.trim(), 300)
  const isSearching = searchTerm.length > 0
  // 검색 중에는 기간 조건(year·month / from·to)을 전부 빼고 keyword만 보낸다 — 서버가 날짜 조건이
  // 없으면 전체 기간을 조회하므로, "지난번에 그거"를 달을 넘겨가며 찾지 않아도 된다. 달력이 고른
  // 하루도 무시한다(검색이 기간보다 우선).
  const txQuery = useGetTransactions(
    isSearching
      ? { keyword: searchTerm, page: state.ledgerPage, size: 5, sort: ['transactionDate,desc'] }
      : selectedDate
        ? { from: selectedDate, to: selectedDate, page: state.ledgerPage, size: 5, sort: ['transactionDate,desc'] }
        : isWeek
          ? { from: weekAnchor, to: weekEnd, page: state.ledgerPage, size: 5, sort: ['transactionDate,desc'] }
          : { year: cursor.year, month: cursor.month, page: state.ledgerPage, size: 5, sort: ['transactionDate,desc'] },
  )
  const dailyQueryA = useGetDailySummaries(weekStartMonth)
  const dailyQueryB = useGetDailySummaries(weekEndMonth, { enabled: needsSecondMonth })
  // 달력의 이체 줄: 서버의 일별 요약(DailySummaryResponse)은 수입·지출·저축 세 가지만 내려주므로
  // 이체는 거래 목록에서 TRANSFER만 따로 받아 날짜별로 합산한다. 기간 조건은 위 목록 조회와 똑같이
  // 주간은 from/to, 월간은 정산월 year/month를 쓴다 — 달력과 목록이 다른 기간을 보면 안 된다.
  // 서버가 일별 요약에 이체 합계를 추가해주면 이 조회는 통째로 지울 수 있다.
  const transferQuery = useGetTransactions(
    isWeek
      ? { from: weekAnchor, to: weekEnd, type: 'TRANSFER', page: 1, size: CALENDAR_TRANSFER_SIZE }
      : { year: cursor.year, month: cursor.month, type: 'TRANSFER', page: 1, size: CALENDAR_TRANSFER_SIZE },
  )
  const accountsQuery = useGetAccounts()

  const rows = buildLedgerTx(txQuery.data?.content ?? [], accountsQuery.data ?? [])
  const page = txQuery.data
  const totalPages = page?.totalPages ?? 0
  const currentPage = (page?.number ?? 0) + 1
  const txErr = describeQueryError(txQuery.error)
  const dailyErr = describeQueryError(dailyQueryA.error ?? dailyQueryB.error)
  const dailyPending = dailyQueryA.isPending || (needsSecondMonth && dailyQueryB.isPending)
  const dailySummaries = needsSecondMonth ? [...dailyQueryA.summaries, ...dailyQueryB.summaries] : dailyQueryA.summaries
  const transferPage = transferQuery.data
  const transferByDate = buildTransferTotalsByDate(transferPage?.content ?? [])
  // 이체가 한 화면 조회 한도를 넘으면 넘친 만큼은 달력에 그려지지 않는다 — 조용히 빠뜨리지 않고
  // 캡션으로 알린다(현실적으로 한 달에 이체 200건을 넘길 일은 거의 없다).
  const transferTruncated = (transferPage?.totalElements ?? 0) > (transferPage?.content.length ?? 0)

  // 마지막 페이지의 마지막 거래를 지우면 그 페이지가 사라진다. 커서를 그대로 두면 서버가 빈
  // content를 돌려주고, 페이지 버튼도 totalPages가 줄면서 사라져 되돌아갈 방법이 없어진다
  // — 유효 범위를 벗어난 페이지에 있으면 마지막 페이지로 당겨온다.
  useEffect(() => {
    if (totalPages > 0 && state.ledgerPage > totalPages) {
      setState({ ledgerPage: totalPages })
    }
  }, [totalPages, state.ledgerPage, setState])

  // 검색어가 **실제로 바뀌었을 때만** 첫 페이지로 돌아간다. 의존성 배열만 두면 이 화면이 다시
  // 마운트될 때(개요↔내역 탭 왕복 등)마다 실행돼, 검색을 하지도 않았는데 보던 페이지가 1로 리셋된다.
  // 함께 골라둔 날짜도 푼다 — 검색 중에는 해제 칩이 보이지 않아, 그대로 두면 검색어를 지우는 순간
  // 목록이 엉뚱한 하루로 튄다.
  const prevSearchTermRef = useRef(searchTerm)
  useEffect(() => {
    if (prevSearchTermRef.current === searchTerm) return
    prevSearchTermRef.current = searchTerm
    setState({ ledgerPage: 1, ledgerSelectedDate: null })
  }, [searchTerm, setState])

  // 검색어는 이 화면을 떠나면 지운다. AppState에 남겨두면 다른 메뉴에 갔다 돌아왔을 때 지난 검색
  // 결과만 보이는데, 검색창이 달력 아래에 있어 사용자가 그 이유를 알아채기 어렵다.
  useEffect(() => () => setState({ ledgerSearch: '' }), [setState])

  const { rows: monthRows, hasOutOfGridData } = buildMonthCalendarRows(cursor, dailySummaries, transferByDate)
  const weekRow = buildWeekCalendarRow(weekAnchor, dailySummaries, transferByDate)
  // 달력에 실제로 그려진 칸만 더한다 — 주간은 7칸, 월간은 빈 칸을 뺀 그 달 격자(sumCalendarTotals 주석).
  const calendarTotals = sumCalendarTotals(isWeek ? weekRow : monthRows.flat())

  const goToMonth = (delta: number) => {
    const next = shiftYearMonth(cursor, delta)
    setState({ ledgerYear: next.year, ledgerMonth: next.month, ledgerPage: 1, ledgerSelectedDate: null })
  }
  const goToWeek = (delta: number) => {
    const nextAnchor = addDays(weekAnchor, delta * 7)
    const owner = weekOwnerYearMonth(nextAnchor)
    setState({ ledgerWeekAnchor: nextAnchor, ledgerYear: owner.year, ledgerMonth: owner.month, ledgerPage: 1, ledgerSelectedDate: null })
  }
  const goToToday = () => {
    const t = todayYearMonth()
    if (isWeek) {
      setState({ ledgerWeekAnchor: mondayOf(toISODate(new Date())), ledgerYear: t.year, ledgerMonth: t.month, ledgerPage: 1, ledgerSelectedDate: null })
    } else {
      setState({ ledgerYear: t.year, ledgerMonth: t.month, ledgerPage: 1, ledgerSelectedDate: null })
    }
  }
  // 주간/월간 토글: 상대 뷰가 보던 위치를 최대한 이어받는다. 월간 → 주간은 지금 커서 달이 실제
  // 이번 달이면 오늘이 포함된 주, 아니면 그 달의 첫 주를 기본으로 보여준다(dc.html L4642-4643과
  // 같은 취지 — 탭을 바꿔도 페이지는 1로 리셋). "그 달의 첫 주"는 반드시 라벨/목록 제목/
  // switchToMonth와 같은 기준(weekOwnerYearMonth, 목요일 소속 달)으로 골라야 한다 — 달력 격자
  // 1행 월요일(firstMondayOfMonthGrid)을 쓰면 그 달이 금·토·일에 시작할 때 소속 달이 전달로
  // 어긋나 월간→주간→월간 왕복이 제자리로 돌아오지 않는다(firstOwnedWeekMonday 주석 참고).
  const switchToWeek = () => {
    const t = todayYearMonth()
    const inCurrentMonth = t.year === cursor.year && t.month === cursor.month
    const nextAnchor = inCurrentMonth ? mondayOf(toISODate(new Date())) : firstOwnedWeekMonday(cursor.year, cursor.month)
    setState({ ledgerRange: 'week', ledgerWeekAnchor: nextAnchor, ledgerPage: 1, ledgerSelectedDate: null })
  }
  const switchToMonth = () => {
    const owner = weekOwnerYearMonth(weekAnchor)
    setState({ ledgerRange: 'month', ledgerYear: owner.year, ledgerMonth: owner.month, ledgerPage: 1, ledgerSelectedDate: null })
  }

  // 새 거래 입력 진입점(캘린더 날짜의 + · 상단 유형별 버튼). 이전에 열려 있던 수정 세션의 잔재
  // (editingTxId·금액·내용·카테고리·계좌 선택)를 물려받지 않도록 매번 리셋하되, 저장하지 않고 닫아
  // 보관해 둔 같은 거래유형의 초안이 있으면 그것만 되살린다(state/selectors/entryDraft.ts).
  const openNewEntry = (entryType: EntryType, tabsVisible: boolean, dateOverride: string | null) => () =>
    setState(openNewEntryUpdater(entryType, tabsVisible, dateOverride))

  // cell.isoDate로 바로 만든다 — 주간 뷰의 셀은 월 경계를 넘어 cursor.year/month와 다른 달에 속할 수
  // 있어(예: 8월 마지막 주에 9월 1일 칸이 섞임) cursor로 재조합하면 엉뚱한 날짜가 만들어진다.
  const openDayEntry = (isoDate: string) => openNewEntry('expense', true, isoDateToDisplay(isoDate))

  // 달력 칸 클릭 = "그날 내역 보기". 같은 칸을 다시 누르면 해제해 기간 전체로 돌아간다 — 선택을
  // 푸는 방법이 목록 위 X 하나뿐이면 모바일에서 되돌리기가 번거롭다. 날짜가 바뀌면 페이지는 1로.
  const selectDay = (isoDate: string) => () =>
    setState((st) => ({
      // 검색 중이라면 검색을 풀면서 그 날짜로 옮겨간다 — 검색은 기간·날짜를 무시하므로, 검색어를 둔 채
      // 날짜만 골라두면 눌러도 목록이 꿈쩍하지 않는 "죽은 달력"이 된다.
      ledgerSearch: '',
      ledgerSelectedDate: st.ledgerSelectedDate === isoDate ? null : isoDate,
      ledgerPage: 1,
    }))
  const clearSelectedDay = () => setState({ ledgerSelectedDate: null, ledgerPage: 1 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2 }}>
            <SegmentedTab active={isWeek} onClick={switchToWeek}>
              주간
            </SegmentedTab>
            <SegmentedTab active={!isWeek} onClick={switchToMonth}>
              월간
            </SegmentedTab>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-mid)' }}>
            {/* span+onClick이던 것을 button으로 바꿨다 — 키보드로 도달조차 못 했고 터치 영역도
                아이콘 크기(18px)뿐이라 손끝이 큰 사용자에게는 거의 안 눌렸다(docs/mobile.md §5). */}
            <button
              type="button"
              onClick={() => (isWeek ? goToWeek(-1) : goToMonth(-1))}
              aria-label={isWeek ? '이전 주' : '이전 달'}
              style={ARROW_BTN_STYLE}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{isWeek ? weekPeriodLabel(weekAnchor) : yearMonthLabel(cursor)}</span>
            <button
              type="button"
              onClick={() => (isWeek ? goToWeek(1) : goToMonth(1))}
              aria-label={isWeek ? '다음 주' : '다음 달'}
              style={ARROW_BTN_STYLE}
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
          <button
            onClick={goToToday}
            style={{ padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            오늘로 이동
          </button>
        </div>
      </div>

      {/* 캘린더뷰 */}
      <Card style={{ padding: 26 }} aria-busy={dailyPending}>
        {/* 검색 중에도 달력은 그대로 둔다(2026-08-29 사용자 결정 — 검색하면 달력이 사라지는 게 어색하다).
            검색은 기간·선택 날짜를 무시하므로 달력이 "죽은 화면"이 되지 않도록, 검색 중에 날짜 칸을
            누르면 검색을 풀고 그 날짜로 옮겨간다(selectDay 참고). */}
        {dailyPending ? (
          <LoadingLine />
        ) : dailyErr ? (
          <ErrorLine message={dailyErr.message} muted={dailyErr.muted} />
        ) : (
          <>
            {/* 합계는 주간/월간 공통이라 두 분기 위에 한 번만 그린다. 로딩·에러 중에는 아예 그리지
                않는다 — 값이 비어 있는 걸 "0원"으로 읽으면 안 된다. */}
            <CalendarTotalsRow
              periodLabel={isWeek ? weekPeriodLabel(weekAnchor) : yearMonthLabel(cursor)}
              income={calendarTotals.income}
              expense={calendarTotals.expense}
            />
            {isWeek && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: CALENDAR_GRID_COLUMNS(isMobile), gap: isMobile ? 4 : 8 }}>
                  {WEEKDAY_HEADERS.map((h) => (
                    <div key={h.label} style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 700, color: h.color, textAlign: 'center', paddingBottom: 4 }}>
                      {h.label}
                    </div>
                  ))}
                  {/* 주간 뷰는 항상 7칸이 실제 날짜라 빈 칸이 없다(월 경계를 넘는 칸도 label이 "M/D"로
                      스스로 구분되므로 별도 처리가 필요 없다). */}
                  {weekRow.map((cell) => (
                    <CalendarCellView
                      key={cell.isoDate}
                      cell={cell}
                      selected={selectedDate === cell.isoDate}
                      onSelect={selectDay(cell.isoDate)}
                      onAdd={openDayEntry(cell.isoDate)}
                    />
                  ))}
                </div>
              </div>
            )}
            {!isWeek && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: CALENDAR_GRID_COLUMNS(isMobile), gap: isMobile ? 4 : 8 }}>
                  {WEEKDAY_HEADERS.map((h) => (
                    <div key={h.label} style={{ fontSize: isMobile ? 10.5 : 11.5, fontWeight: 700, color: h.color, textAlign: 'center', paddingBottom: 4 }}>
                      {h.label}
                    </div>
                  ))}
                  {/* 빈 칸의 key(인덱스)와 날짜 셀의 key(일자)가 같은 네임스페이스를 쓰면 겹친다
                      (예: 인덱스 1의 빈 칸 vs 1일 셀) — 접두사로 분리한다. */}
                  {monthRows.flat().map((cell, i) =>
                    cell ? (
                      <CalendarCellView
                        key={`d-${cell.day}`}
                        cell={cell}
                        selected={selectedDate === cell.isoDate}
                        onSelect={selectDay(cell.isoDate)}
                        onAdd={openDayEntry(cell.isoDate)}
                      />
                    ) : (
                      <div key={`e-${i}`} />
                    ),
                  )}
                </div>
              </div>
            )}
            {/* 색 점만으로는 무슨 거래인지 알 수 없다 — 모바일에서만 범례를 붙인다
                (데스크톱은 칸 안에 금액 배지가 그대로 있어 범례가 필요 없다). */}
            {isMobile && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text-weak)' }}>
                {CALENDAR_DOT_LEGEND.map((d) => (
                  <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: d.color }} />
                    {d.label}
                  </span>
                ))}
                <span style={{ marginLeft: 'auto' }}>날짜를 누르면 그날 내역</span>
              </div>
            )}
            {/* 정산월(monthStartDay≠1)이면 서버가 이 달력월과 다른 달의 날짜도 함께 내려줄 수 있는데,
                근본 원인(periodStart/periodEnd 부재, docs/backend-request.md 2장)은 백엔드 몫이라
                프론트는 "빠진 항목이 있을 수 있다"는 사실만 안내한다 — 아래 목록에는 정상적으로 나온다. */}
            {!isWeek && hasOutOfGridData && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-weak)' }}>
                일부 거래는 정산월 경계 때문에 캘린더에 표시되지 못했어요. 아래 목록에서 확인해주세요.
              </div>
            )}
            {transferTruncated && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-weak)' }}>
                이체가 너무 많아 일부는 캘린더에 표시되지 못했어요. 아래 목록에서 확인해주세요.
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '0.5px solid var(--track)' }}>
          {/* 내역 검색. 돋보기와 지우기 X를 입력창 안에 겹쳐 두어 한 줄만 차지하게 한다 — 모바일에서
              달력 아래 세로 공간이 귀하다. 지우기 버튼은 터치 최소치(44px, docs/mobile.md §5)를 지킨다. */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span
              className="ms"
              aria-hidden
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: 'var(--text-weak)', pointerEvents: 'none' }}
            >
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setState({ ledgerSearch: e.target.value })}
              placeholder="내용·메모로 전체 기간에서 찾기"
              aria-label="가계부 내역 검색"
              style={{
                width: '100%', minHeight: 44, boxSizing: 'border-box',
                padding: searchInput ? '0 46px 0 38px' : '0 14px 0 38px',
                borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-strong)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setState({ ledgerSearch: '', ledgerPage: 1 })}
                aria-label="검색어 지우기"
                className="mini-hov"
                style={{
                  position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)',
                  width: 44, height: 44, borderRadius: 10, border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                  color: 'var(--text-weak)',
                }}
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          {/* keepPreviousData 때문에 기간을 옮기면 새 데이터가 오기 전까지 이전 기간 거래가 그대로
              보인다. 제목은 이미 새 기간으로 바뀌어 있으므로, 갱신 중임을 옆에 표시해 오해를 막는다. */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isSearching
                ? `'${searchTerm}' 검색 결과${page ? ` ${page.totalElements}건` : ''}`
                : selectedDate
                  ? dayListTitle(selectedDate)
                  : isWeek
                    ? weekListTitle(weekAnchor)
                    : `${yearMonthLabel(cursor)} 전체 내역`}
            </div>
            {txQuery.isFetching && !txQuery.isPending && (
              <span aria-busy style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>불러오는 중…</span>
            )}
            {selectedDate && (
              <>
                {/* 하루로 좁힌 상태를 되돌리는 칩. 터치 최소치(44px)를 지킨다(docs/mobile.md §5). */}
                <button
                  type="button"
                  onClick={clearSelectedDay}
                  className="mini-hov"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 10px',
                    borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)',
                    fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Icon name="close" size={13} />
                  {isWeek ? '이 주 전체' : '이 달 전체'}
                </button>
                {/* 예전에 달력 칸 클릭이 하던 "그날 거래 추가"의 모바일 경로 — 데스크톱 칸의 + 아이콘과 같은 동작. */}
                <button
                  type="button"
                  onClick={openDayEntry(selectedDate)}
                  className="mini-hov"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 10px',
                    borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)',
                    fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    marginLeft: 'auto',
                  }}
                >
                  <Icon name="add" size={14} />
                  이 날짜에 거래 추가
                </button>
              </>
            )}
          </div>
          {txQuery.isPending ? (
            <LoadingLine />
          ) : txErr ? (
            <ErrorLine message={txErr.message} muted={txErr.muted} />
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>
              {isSearching
                ? `'${searchTerm}'에 해당하는 거래를 찾지 못했어요.`
                : `${selectedDate ? '이 날에는' : isWeek ? '이 주에는' : '이 달에는'} 거래 내역이 없어요.`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((t) => (
                <div
                  key={t.key}
                  className="mini-hov"
                  onClick={() => {
                    // 잔액 조정(ADJUSTMENT)은 계좌 잔액을 정정할 때 **서버가 자동으로 만드는** 거래라
                    // 사용자가 고칠 수 없다(서버도 ADJUSTMENT_NOT_ALLOWED로 거부한다). 편집 모달을 열면
                    // 저장 시점에야 에러가 나므로 아예 열지 않는다 — 잔액을 다시 맞추려면 계좌 수정
                    // 화면의 '현재 잔액'을 고쳐 새 조정 거래를 만들게 한다.
                    if (t.type === 'ADJUSTMENT') return
                    setState({
                      modalOpen: 'ledgerEntry',
                      entryType: TX_TYPE_TO_ENTRY_TYPE[t.type],
                      entryTabsVisible: true,
                      // 서버에 단일 거래 조회(GET /transactions/{id})가 없어, 이미 이 목록 조회로 받아둔
                      // 원본 값(t.accountId/subcategoryId/transferAccountId/amountRaw)을 그대로 채운다.
                      entrySubcategoryId: t.subcategoryId,
                      // TRANSFER·SAVING은 출금(accountId)·상대(transferAccountId) 두 계좌를 쓴다. 그 외
                      // 유형은 accountId 하나뿐이라 "출금계좌" 필드에 넣을 값이 없다.
                      entryAccountId: t.type === 'TRANSFER' || t.type === 'SAVING' ? t.transferAccountId : t.accountId,
                      entryWithdrawAccountId: t.type === 'TRANSFER' || t.type === 'SAVING' ? t.accountId : null,
                      entryAmount: t.amountRaw,
                      entryDescription: t.desc,
                      entryMemo: t.memo ?? '',
                      entryDateOverride: isoDateToDisplay(t.isoDate),
                      editingTxId: t.id,
                      // 이 모달이 편집하지 않는 필드(외화) — PUT이 전체 교체라 그대로 되돌려 보내야 한다.
                      entryPreserved: {
                        nativeAmount: t.nativeAmount,
                        nativeCurrency: t.nativeCurrency,
                      },
                      openDropdown: null,
                    })
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8, cursor: t.type === 'ADJUSTMENT' ? 'default' : 'pointer' }}
                >
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                    {t.memo && (
                      <span title={t.memo} style={{ display: 'flex', flex: 'none', color: 'var(--text-weak)' }}>
                        <Icon name="sticky_note_2" size={13} />
                      </span>
                    )}
                  </div>
                  {t.tag && (
                    // 태그는 사용자가 직접 지은 계좌명·소분류명이라 길이 제한이 없다(ledgerView.ts
                    // buildLedgerTx). flex 아이템의 자동 최소 크기는 내용의 min-content라, nowrap만
                    // 걸고 두면 긴 이름이 이 줄 전체를 화면 밖으로 밀어낸다 — 위 카테고리 랭킹 행과
                    // 같은 방식으로 최대 폭을 정하고 넘치면 말줄임 처리한다(전체 값은 눌러서 여는
                    // 수정 모달에서 볼 수 있다).
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)', flex: 'none', maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.tag}
                    </span>
                  )}
                  <div style={{ fontSize: 13.5, fontWeight: 700, width: 120, textAlign: 'right', color: t.amountColor }}>{t.amount}</div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, overflowX: 'auto' }}>
              <button
                onClick={() => setState((st) => ({ ledgerPage: Math.max(1, (st.ledgerPage || 1) - 1) }))}
                style={{ width: 44, height: 44, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setState({ ledgerPage: n })}
                  style={{
                    width: 44, height: 44, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', flex: 'none',
                    background: n === currentPage ? 'var(--accent)' : 'var(--track)', color: n === currentPage ? '#fff' : 'var(--text-mid)',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setState((st) => ({ ledgerPage: Math.min(totalPages, (st.ledgerPage || 1) + 1) }))}
                style={{ width: 44, height: 44, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
