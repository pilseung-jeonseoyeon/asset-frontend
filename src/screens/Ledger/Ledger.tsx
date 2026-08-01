// Source: secret/Asset Manager v14.dc.html L2637-3011 (isLedger block) — transcribed verbatim.
// modalLedgerEntry/modalFixedExpense (this screen's owned modals) are not yet built — buttons that open
// them (openQuickIncome/openFixedExpense/etc.) set modalOpen state correctly but nothing renders it yet.

import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { SegmentedTab } from '../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../state/AppStateContext'
import {
  getLedgerHeroTitle, getLedgerIncomeFmt, getLedgerExpenseFmt, getLedgerSavingFmt, getLedgerSavingsRateFmt,
  getLedgerIncomeDelta, getLedgerExpenseDelta, getLedgerSavingDelta,
  ledgerCategories, topIncreaseLabel, getSubscriptions,
  getLedgerPage, getLedgerRangeLabel, getLedgerListTitle, monthDays, weekDays,
} from '../../data/mockLedger'

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

function CalendarCellView({ cell, onOpen }: { cell: { day: number; label: string; lines: { text: string; color: string }[]; highlighted: boolean }; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={{
        height: 96,
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
        {cell.lines.map((ln, i) => (
          <div
            key={i}
            style={{ fontSize: 11.5, fontWeight: 700, color: ln.color, background: 'var(--fill-subtle)', borderRadius: 8, padding: '3px 5px', width: 'fit-content' }}
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
  const period = state.ledgerPeriod
  const { subscriptions, subsTotalFmt } = getSubscriptions(state.endedSubIds)
  const fixedExpenseVisible = !state.fixedExpenseEnded
  const incomeDelta = getLedgerIncomeDelta(period)
  const expenseDelta = getLedgerExpenseDelta(period)
  const savingDelta = getLedgerSavingDelta(period)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 이번달/올해 수지 하이라이트 */}
      <DeepCard style={{ justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{getLedgerHeroTitle(period)}</div>
          <div style={{ display: 'flex', background: 'var(--deep-seg-track)', borderRadius: 10, padding: 4, gap: 2 }}>
            <SegmentedTab variant="deep" active={period === 'month'} onClick={() => setState({ ledgerPeriod: 'month' })}>
              이번 달
            </SegmentedTab>
            <SegmentedTab variant="deep" active={period === 'year'} onClick={() => setState({ ledgerPeriod: 'year' })}>
              올해
            </SegmentedTab>
          </div>
        </div>
        <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>수입</div>
            <div className="dk-accent" style={{ fontSize: 30, fontWeight: 700, marginTop: 8, color: 'var(--deep-up)', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              +{getLedgerIncomeFmt(period)}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--deep-label)' }}>원</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <DeltaChip delta={incomeDelta} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>지출</div>
            <div className="dk-accent" style={{ fontSize: 30, fontWeight: 700, marginTop: 8, color: 'var(--deep-down)', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              −{getLedgerExpenseFmt(period)}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--deep-label)' }}>원</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <DeltaChip delta={expenseDelta} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>저축</div>
            <div className="dk-accent" style={{ fontSize: 30, fontWeight: 700, marginTop: 8, color: 'var(--deep-saving)', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              {getLedgerSavingFmt(period)}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--deep-label)' }}>원</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <DeltaChip delta={savingDelta} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 22, paddingTop: 18, borderTop: '0.5px solid var(--deep-divider)' }}>
          <span style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 400 }}>저축률</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{getLedgerSavingsRateFmt(period)}</span>
          <span style={{ fontSize: 11.5, color: 'var(--deep-label)', fontWeight: 400 }}>· 최근 6개월 평균 36%</span>
        </div>
      </DeepCard>

      {/* 지출 그룹 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Icon name="credit_card" size={16} color="var(--exp-text)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>지출</span>
        </div>
        <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'stretch' }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>전월 대비 분류별 지출</div>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
                  color: 'var(--exp-text)', background: 'var(--fill-subtle)', padding: '5px 10px', borderRadius: 8,
                }}
              >
                <Icon name="arrow_upward" size={14} />
                {topIncreaseLabel}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 14 }}>카테고리별 지출 순위 · 전월 대비 증감</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ledgerCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="mini-hov"
                  onClick={() => setState({ modalOpen: 'categoryDetail', catDetailName: cat.name })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 8px', borderBottom: '0.5px solid var(--fill-subtle)', borderRadius: 10, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', width: 56, flex: 'none' }}>{cat.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', width: 92, flex: 'none', textAlign: 'right' }}>{cat.amtFmt}원</div>
                  <div style={{ flex: 1, height: 7, background: 'var(--track)', borderRadius: 4, minWidth: 40 }}>
                    <div style={{ height: '100%', width: `${cat.barPct}%`, background: cat.rampColor, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, width: 64, flex: 'none', textAlign: 'right', color: 'var(--text-mid)' }}>
                    {cat.changeSign}
                    {cat.changePctFmt}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>고정 지출</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>월 85,000원</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>결제수단 표기 · 자동 차감</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fixedExpenseVisible && (
                  <div
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'fixedExpense', recurringType: 'fixed', editingRecurId: 'fixed-0' })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="health_and_safety" size={18} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>실손의료보험</div>
                        <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>매월 25일 · 신한은행</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--exp-text)' }}>−85,000</div>
                  </div>
                )}
                <button
                  className="qbtn"
                  onClick={() => setState({ modalOpen: 'fixedExpense', recurringType: 'fixed', editingRecurId: null })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10,
                    border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform .12s',
                  }}
                >
                  <Icon name="add" size={16} />
                  고정 지출 추가
                </button>
              </div>
            </Card>
            <Card style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>구독 · 정기결제</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>월 {subsTotalFmt}원</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginBottom: 16 }}>이번 달 구독료 합계</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'fixedExpense', recurringType: 'subscription', editingRecurId: sub.id })}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: '10px 8px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 10, background: sub.bg, color: sub.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <Icon name={sub.icon} size={17} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{sub.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{sub.day}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--exp-text)' }}>−{sub.amtFmt}</div>
                  </div>
                ))}
                <button
                  className="qbtn"
                  onClick={() => setState({ modalOpen: 'fixedExpense', recurringType: 'subscription', editingRecurId: null })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 10,
                    border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform .12s',
                  }}
                >
                  <Icon name="add" size={16} />
                  구독 추가
                </button>
              </div>
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
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>이번 달 저축률</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>이번 달 수입 대비</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 1, marginTop: 14 }}>
              <div style={{ position: 'relative', width: 134, height: 134, flex: 'none' }}>
                <svg width="134" height="134" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--track)' }} strokeWidth="6" />
                  <circle
                    cx="21" cy="21" r="15.915" fill="none" style={{ stroke: 'var(--sav-fill)' }} strokeWidth="6"
                    strokeLinecap="round" strokeDasharray="40 60" transform="rotate(-90 21 21)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-strong)', lineHeight: 1 }}>40%</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>저축률</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--sav-fill)', flex: 'none' }} />
                  <span style={{ color: 'var(--text-mid)', flex: 1 }}>저축</span>
                  <b style={{ color: 'var(--sav-text)' }}>3,240,000원</b>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, flex: 'none' }} />
                  <span style={{ color: 'var(--text-mid)', flex: 1 }}>지출</span>
                  <b style={{ color: 'var(--text-mid)' }}>5,260,000원</b>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
              수입의 <b style={{ color: 'var(--text-strong)' }}>40%</b>를 저축했어요
            </div>
          </Card>
          <Card style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>월별 저축률</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>1월~12월 · 수입 대비 저축률</div>
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
                    {[8, 50, 92, 134, 176, 218, 260, 302, 344, 386, 428, 470].map((x) => (
                      <rect key={x} x={x} y="0" width="26" height="130" rx="5" />
                    ))}
                  </g>
                  <g fill="var(--sav-fill)">
                    <rect x="8" y="88.4" width="26" height="41.6" rx="5" />
                    <rect x="50" y="83.2" width="26" height="46.8" rx="5" />
                    <rect x="92" y="93.6" width="26" height="36.4" rx="5" />
                    <rect x="134" y="74.1" width="26" height="55.9" rx="5" />
                    <rect x="176" y="81.9" width="26" height="48.1" rx="5" />
                    <rect x="218" y="78.0" width="26" height="52.0" rx="5" />
                    <rect x="260" y="78.0" width="26" height="52.0" rx="5" />
                  </g>
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: 6, fontSize: 10.5, color: 'var(--text-weak)' }}>
              {MONTH_LABELS.map((m) => (
                <span key={m} style={{ flex: 1, textAlign: 'center', ...(m === '7월' ? { fontWeight: 700, color: 'var(--accent)' } : null) }}>
                  {m}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DeltaChip({ delta }: { delta: { icon: string; text: string; color: string; bg: string } }) {
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
  const range = state.ledgerRange
  const { ledgerTxPaged, pageNums, pageClamped } = getLedgerPage(state.deletedTxKeys, range, state.ledgerPage)

  const openDayEntry = (day: number) => () =>
    setState({
      modalOpen: 'ledgerEntry', entryType: 'expense', entryTabsVisible: true,
      entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: '2026.06.' + String(day).padStart(2, '0'),
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2 }}>
            <SegmentedTab active={range === 'week'} onClick={() => setState({ ledgerRange: 'week', ledgerPage: 1 })}>
              주간
            </SegmentedTab>
            <SegmentedTab active={range === 'month'} onClick={() => setState({ ledgerRange: 'month', ledgerPage: 1 })}>
              월간
            </SegmentedTab>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-mid)' }}>
            <Icon name="chevron_left" size={18} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{getLedgerRangeLabel(range)}</span>
            <Icon name="chevron_right" size={18} style={{ cursor: 'pointer' }} />
          </div>
          <button
            onClick={() => setState({ ledgerPage: 1 })}
            style={{ padding: '6px 12px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            오늘로 이동
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setState({ modalOpen: 'ledgerEntry', entryType: 'income', entryTabsVisible: false, entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: null })}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--inc-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            수입
          </button>
          <button
            onClick={() => setState({ modalOpen: 'ledgerEntry', entryType: 'expense', entryTabsVisible: false, entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: null })}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--exp-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            지출
          </button>
          <button
            onClick={() => setState({ modalOpen: 'ledgerEntry', entryType: 'saving', entryTabsVisible: false, entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: null })}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--sav-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            저축
          </button>
          <button
            onClick={() => setState({ modalOpen: 'ledgerEntry', entryType: 'transfer', entryTabsVisible: false, entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: null })}
            className="qbtn"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            이체
          </button>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'var(--surface)', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            <Icon name="upload_file" size={16} />
            CSV 가져오기
          </button>
        </div>
      </div>

      {/* 캘린더뷰 */}
      <Card style={{ padding: 26 }}>
        {range === 'week' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {weekDays.map((wd) => (
              <CalendarCellView key={wd.label} cell={wd} onOpen={openDayEntry(wd.day)} />
            ))}
          </div>
        )}
        {range === 'month' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {WEEKDAY_HEADERS.map((h) => (
              <div key={h.label} style={{ fontSize: 11.5, fontWeight: 700, color: h.color, textAlign: 'center', paddingBottom: 4 }}>
                {h.label}
              </div>
            ))}
            {/* 2026.06.01 is a Monday, so no leading blank cells */}
            {monthDays.map((d) => (
              <CalendarCellView key={d.day} cell={d} onOpen={openDayEntry(d.day)} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '0.5px solid var(--track)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{getLedgerListTitle(range)}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ledgerTxPaged.map((t) => (
              <div
                key={t.key}
                className="mini-hov"
                onClick={() =>
                  setState({
                    modalOpen: 'ledgerEntry', entryType: t.type, entryTabsVisible: true,
                    entryCatMajorIdx: 0, entryCatSubIdx: 0, entryDateOverride: '2026.' + t.date,
                    editingTx: true, editingTxKey: t.key,
                  })
                }
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.date}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.desc}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: t.tagBg, color: t.tagColor }}>
                  {t.tag}
                </span>
                <div style={{ fontSize: 13.5, fontWeight: 700, width: 120, textAlign: 'right', color: t.amountColor }}>{t.amount}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <button
              onClick={() => setState((st) => ({ ledgerPage: Math.max(1, (st.ledgerPage || 1) - 1) }))}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="chevron_left" size={16} />
            </button>
            {pageNums.map((n) => (
              <button
                key={n}
                onClick={() => setState({ ledgerPage: n })}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  background: n === pageClamped ? 'var(--accent)' : 'var(--track)', color: n === pageClamped ? '#fff' : 'var(--text-mid)',
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setState((st) => ({ ledgerPage: Math.min(pageNums.length, (st.ledgerPage || 1) + 1) }))}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
