// Source: secret/Asset Manager v14.dc.html L2637-3011 (isLedger block) — layout/structure transcribed
// verbatim, data source swapped from src/data/mockLedger.ts (deleted) to the transaction/subscription/
// account services + src/data/ledgerView.ts. See ledgerView.ts header for which formulas are
// design-system rules (kept verbatim) vs. new server-input plumbing.

import { useEffect, useRef } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { SegmentedTab } from '../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../state/AppStateContext'
import { isoDateToDisplay, shiftYearMonth, todayYearMonth, yearMonthLabel } from '../../utils/date'
import { fmt } from '../../utils/format'
import { useIsMobile } from '../../utils/useMediaQuery'
import {
  buildLedgerCategories,
  buildLedgerTx,
  buildMonthCalendarRows,
  buildPeriodDeltas,
  buildSavingsBars,
  buildSavingsRing,
  buildSubscriptionRows,
  computeRecentAvgSavingsRate,
  describeQueryError,
  getLedgerHeroTitle,
  pickCalendarWeek,
  pickTopIncreaseLabel,
  TX_TYPE_TO_ENTRY_TYPE,
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

function CalendarCellView({ cell, onOpen }: { cell: CalendarCell; onOpen: () => void }) {
  // 그리드 아이템은 기본적으로 내용물의 min-content보다 작아지지 않는다(min-width:auto). 금액
  // 배지의 안 끊어지는 숫자 문자열이 이 칸의 min-content라 좁은 폭(모바일)에서 칸 너비를 그대로
  // 강제로 늘려 캘린더 전체가 뷰포트 밖으로 밀려났었다(가로 스크롤 발생 확인됨). minWidth:0으로
  // 그리드 트랙이 실제 배정된 몫만큼만 차지하게 하고, 배지는 그 안에서 넘치면 말줄임표로 자른다
  // (모바일의 고정폭 칼럼과 함께 쓰면 대부분 값은 안 잘리고, 아주 큰 금액만 말줄임 처리된다).
  // 데스크톱은 칸이 이미 배지보다 넓어 이 값들이 실제로 작동할 일이 없어 렌더링이 그대로다.
  //
  // 모바일 가로 스크롤 캘린더는 기본적으로 맨 왼쪽(1일)부터 보인다 — "오늘"이 스크롤 영역
  // 오른쪽에 있으면 "오늘로 이동"을 눌러도 화면 밖이라 못 찾는다. 오늘 칸을 자동으로 보이는
  // 위치까지 스크롤한다(데스크톱은 overflow:visible이라 이 호출이 사실상 아무 일도 안 한다).
  const isMobile = useIsMobile()
  const cellRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isMobile && cell.highlighted) {
      cellRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
    }
  }, [isMobile, cell.highlighted])

  return (
    <div
      ref={cellRef}
      onClick={onOpen}
      style={{
        height: 96,
        minWidth: 0,
        borderRadius: 8,
        border: cell.highlighted ? '0.5px solid var(--accent)' : '0.5px solid var(--track)',
        padding: 7,
        background: cell.highlighted ? 'var(--fill-subtle)' : undefined,
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
      <span className="ms" style={{ position: 'absolute', top: 6, right: 6, fontSize: 13, color: 'var(--text-weak)' }}>
        add
      </span>
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

export function Ledger() {
  const { state, setState } = useAppState()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {/* 서브 세그먼트 탭 */}
      <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2, width: 'fit-content' }}>
        <SegmentedTab active={state.ledgerTab === 'overview'} onClick={() => setState({ ledgerTab: 'overview' })}>
          개요
        </SegmentedTab>
        <SegmentedTab active={state.ledgerTab === 'history'} onClick={() => setState({ ledgerTab: 'history' })}>
          내역
        </SegmentedTab>
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
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', width: 56, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', width: 92, flex: 'none', textAlign: 'right' }}>{cat.amtFmt}원</div>
                    <div style={{ flex: 1, height: 7, background: 'var(--track)', borderRadius: 4, minWidth: 40 }}>
                      <div style={{ height: '100%', width: `${cat.barPct}%`, background: cat.rampColor, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, width: 64, flex: 'none', textAlign: 'right', color: 'var(--text-mid)' }}>
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
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>결제수단 표기 · 자동 차감</div>
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
                <div style={{ fontSize: 15, fontWeight: 700 }}>구독 · 정기결제</div>
                {!subs.isPending && !subsErr && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>월 {subsTotalFmt}원</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>이번 달 구독료 합계</div>
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
            <div style={{ fontSize: 15, fontWeight: 700 }}>이번 달 저축률</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>이번 달 수입 대비</div>
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
                        {bars.map((b, i) => {
                          if (b.isFuture) return null
                          const height = (b.pct / 100) * 130
                          return <rect key={b.month} x={BAR_X_POSITIONS[i]} y={130 - height} width="26" height={height} rx="5" />
                        })}
                      </g>
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', marginTop: 6, fontSize: 10.5, color: 'var(--text-weak)' }}>
                  {MONTH_LABELS.map((m, i) => (
                    <span key={m} style={{ flex: 1, textAlign: 'center', ...(i + 1 === today.month ? { fontWeight: 700, color: 'var(--accent)' } : null) }}>
                      {m}
                    </span>
                  ))}
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
  return fmt(amounts.reduce((sum, n) => sum + n, 0))
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
        {fmt(valueFmt)}
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
  const cursor = { year: state.ledgerYear, month: state.ledgerMonth }

  const txQuery = useGetTransactions({
    year: cursor.year, month: cursor.month, page: state.ledgerPage, size: 5, sort: ['transactionDate,desc'],
  })
  const dailyQuery = useGetDailySummaries(cursor)
  const accountsQuery = useGetAccounts()

  const rows = buildLedgerTx(txQuery.data?.content ?? [], accountsQuery.data ?? [])
  const page = txQuery.data
  const totalPages = page?.totalPages ?? 0
  const currentPage = (page?.number ?? 0) + 1
  const txErr = describeQueryError(txQuery.error)
  const dailyErr = describeQueryError(dailyQuery.error)

  // 마지막 페이지의 마지막 거래를 지우면 그 페이지가 사라진다. 커서를 그대로 두면 서버가 빈
  // content를 돌려주고, 페이지 버튼도 totalPages가 줄면서 사라져 되돌아갈 방법이 없어진다
  // — 유효 범위를 벗어난 페이지에 있으면 마지막 페이지로 당겨온다.
  useEffect(() => {
    if (totalPages > 0 && state.ledgerPage > totalPages) {
      setState({ ledgerPage: totalPages })
    }
  }, [totalPages, state.ledgerPage, setState])

  const monthRows = buildMonthCalendarRows(cursor, dailyQuery.summaries)
  const weekRow = pickCalendarWeek(cursor, dailyQuery.summaries)

  const goToMonth = (delta: number) => {
    const next = shiftYearMonth(cursor, delta)
    setState({ ledgerYear: next.year, ledgerMonth: next.month, ledgerPage: 1 })
  }
  const goToToday = () => {
    const t = todayYearMonth()
    setState({ ledgerYear: t.year, ledgerMonth: t.month, ledgerPage: 1 })
  }

  // 새 거래 입력 진입점(캘린더 날짜 클릭 · 상단 유형별 버튼) 공용 초기화. 이전에 열려 있던 수정 세션의
  // 잔재(editingTxId·금액·내용·카테고리·계좌 선택)를 물려받지 않도록 매번 전부 리셋한다.
  const openNewEntry = (entryType: EntryType, tabsVisible: boolean, dateOverride: string | null) => () =>
    setState({
      modalOpen: 'ledgerEntry',
      entryType,
      entryTabsVisible: tabsVisible,
      editingTxId: null,
      entrySubcategoryId: null,
      entryAccountId: null,
      entryWithdrawAccountId: null,
      entryAmount: 0,
      entryDescription: '',
      entryPreserved: null,
      entryDateOverride: dateOverride,
      openDropdown: null,
    })

  const openDayEntry = (day: number) =>
    openNewEntry('expense', true, `${cursor.year}.${String(cursor.month).padStart(2, '0')}.${String(day).padStart(2, '0')}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2 }}>
            <SegmentedTab active={range === 'week'} onClick={() => setState({ ledgerRange: 'week' })}>
              주간
            </SegmentedTab>
            <SegmentedTab active={range === 'month'} onClick={() => setState({ ledgerRange: 'month' })}>
              월간
            </SegmentedTab>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-mid)' }}>
            <span onClick={() => goToMonth(-1)} style={{ display: 'flex', cursor: 'pointer' }}>
              <Icon name="chevron_left" size={18} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{yearMonthLabel(cursor)}</span>
            <span onClick={() => goToMonth(1)} style={{ display: 'flex', cursor: 'pointer' }}>
              <Icon name="chevron_right" size={18} />
            </span>
          </div>
          <button
            onClick={goToToday}
            style={{ padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            오늘로 이동
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={openNewEntry('income', false, null)}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--inc-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            수입
          </button>
          <button
            onClick={openNewEntry('expense', false, null)}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--exp-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            지출
          </button>
          <button
            onClick={openNewEntry('saving', false, null)}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--sav-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            저축
          </button>
          <button
            onClick={openNewEntry('transfer', false, null)}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            이체
          </button>
        </div>
      </div>

      {/* 캘린더뷰 */}
      <Card style={{ padding: 26 }} aria-busy={dailyQuery.isPending}>
        {dailyQuery.isPending ? (
          <LoadingLine />
        ) : dailyErr ? (
          <ErrorLine message={dailyErr.message} muted={dailyErr.muted} />
        ) : (
          <>
            {range === 'week' && (
              // 모바일에서는 7칸을 1fr로 욱여넣으면 배지 안 끊어지는 숫자 때문에 셀이 너무
              // 좁아진다(칸당 40px 미만) — 칸 너비를 고정하고 가로 스크롤로 넘긴다.
              <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(7,64px)' : 'repeat(7,1fr)', gap: 8 }}>
                  {/* 빈 칸의 key(인덱스)와 날짜 셀의 key(일자)가 같은 네임스페이스를 쓰면 겹친다
                      (예: 인덱스 1의 빈 칸 vs 1일 셀) — 접두사로 분리한다. */}
                  {weekRow.map((cell, i) =>
                    cell ? (
                      <CalendarCellView key={`d-${cell.day}`} cell={cell} onOpen={openDayEntry(cell.day)} />
                    ) : (
                      <div key={`e-${i}`} />
                    ),
                  )}
                </div>
              </div>
            )}
            {range === 'month' && (
              <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(7,64px)' : 'repeat(7,1fr)', gap: 8 }}>
                  {WEEKDAY_HEADERS.map((h) => (
                    <div key={h.label} style={{ fontSize: 11.5, fontWeight: 700, color: h.color, textAlign: 'center', paddingBottom: 4 }}>
                      {h.label}
                    </div>
                  ))}
                  {monthRows.flat().map((cell, i) =>
                    cell ? (
                      <CalendarCellView key={`d-${cell.day}`} cell={cell} onOpen={openDayEntry(cell.day)} />
                    ) : (
                      <div key={`e-${i}`} />
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '0.5px solid var(--track)' }}>
          {/* keepPreviousData 때문에 달을 옮기면 새 데이터가 오기 전까지 이전 달 거래가 그대로
              보인다. 제목은 이미 새 달로 바뀌어 있으므로, 갱신 중임을 옆에 표시해 오해를 막는다. */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{yearMonthLabel(cursor)} 전체 내역</div>
            {txQuery.isFetching && !txQuery.isPending && (
              <span aria-busy style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>불러오는 중…</span>
            )}
          </div>
          {txQuery.isPending ? (
            <LoadingLine />
          ) : txErr ? (
            <ErrorLine message={txErr.message} muted={txErr.muted} />
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>이 달의 거래 내역이 없어요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((t) => (
                <div
                  key={t.key}
                  className="mini-hov"
                  onClick={() =>
                    setState({
                      modalOpen: 'ledgerEntry',
                      entryType: TX_TYPE_TO_ENTRY_TYPE[t.type],
                      entryTabsVisible: true,
                      // 서버에 단일 거래 조회(GET /transactions/{id})가 없어, 이미 이 목록 조회로 받아둔
                      // 원본 값(t.accountId/subcategoryId/transferAccountId/amountRaw)을 그대로 채운다.
                      entrySubcategoryId: t.subcategoryId,
                      // TRANSFER는 출금(accountId)·입금(transferAccountId) 두 계좌를 쓴다. 그 외 유형은
                      // accountId 하나뿐이라 "출금계좌" 필드에 넣을 값이 없다.
                      entryAccountId: t.type === 'TRANSFER' ? t.transferAccountId : t.accountId,
                      entryWithdrawAccountId: t.type === 'TRANSFER' ? t.accountId : null,
                      entryAmount: t.amountRaw,
                      entryDescription: t.desc,
                      entryDateOverride: isoDateToDisplay(t.isoDate),
                      editingTxId: t.id,
                      // 이 모달이 편집하지 않는 필드 — PUT이 전체 교체라 그대로 되돌려 보내야 한다.
                      entryPreserved: {
                        memo: t.memo,
                        nativeAmount: t.nativeAmount,
                        nativeCurrency: t.nativeCurrency,
                      },
                      openDropdown: null,
                    })
                  }
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                  </div>
                  {t.tag && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)' }}>
                      {t.tag}
                    </span>
                  )}
                  <div style={{ fontSize: 13.5, fontWeight: 700, width: 120, textAlign: 'right', color: t.amountColor }}>{t.amount}</div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <button
                onClick={() => setState((st) => ({ ledgerPage: Math.max(1, (st.ledgerPage || 1) - 1) }))}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="chevron_left" size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setState({ ledgerPage: n })}
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    background: n === currentPage ? 'var(--accent)' : 'var(--track)', color: n === currentPage ? '#fff' : 'var(--text-mid)',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setState((st) => ({ ledgerPage: Math.min(totalPages, (st.ledgerPage || 1) + 1) }))}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
