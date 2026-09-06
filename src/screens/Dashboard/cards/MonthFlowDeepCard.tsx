// C안 대표 카드 — 이번 달 저축 중심 딥 카드. GET /transactions/summaries/period?period=MONTH.
// 수입·지출·저축은 Ledger.tsx의 딥 카드와 같은 --deep-* 색을 쓴다(대시보드-가계부 색 통일).

import { StatBadge } from '../../../components/primitives/StatBadge/StatBadge'
import { DeepCard } from '../../../components/primitives/DeepCard/DeepCard'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { formatNumber } from '../../../utils/format'
import { todayYearMonth } from '../../../utils/date'
import { useGetGoal } from '@/services/goal'
import { useGetPeriodSummary } from '@/services/transaction'
import { DASHED_CTA_STYLE_DEEP, EMPTY_TEXT_STYLE_DEEP, ERROR_TEXT_STYLE_DEEP } from './cardStyles'
import { EmptyState } from './shared'

interface FlowValueProps {
  label: string
  valueText: string
  color: string
}

function FlowValue({ label, valueText, color }: FlowValueProps) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-.01em', marginTop: 6, whiteSpace: 'nowrap' }}>
        {valueText}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
      </div>
    </div>
  )
}

export function MonthFlowDeepCard() {
  const { setState } = useAppState()
  const isMobile = useIsMobile()
  const summaryQuery = useGetPeriodSummary('MONTH')
  const goalQuery = useGetGoal({})
  const summary = summaryQuery.data

  const hasTransactions = !!summary && (summary.incomeTotal > 0 || summary.expenseTotal > 0 || summary.savingTotal > 0)

  // 월 필요 저축까지 부족/초과 — 둘 중 하나라도 null이면 이 줄을 숨긴다(계산 근거 없음).
  // 목표 미설정(targetDate === null)이면 서버가 404 대신 0으로 채운 200을 주므로(goal.type.ts) 그대로
  // 계산하면 "0원 초과"라는 거짓 배지가 뜬다 — 미설정일 때는 배지 대신 아래 "목표 설정" 버튼만 보인다.
  const monthlyTarget = goalQuery.isUnset ? null : (goalQuery.goal?.monthly.targetAmount ?? null)
  const monthlyCurrent = goalQuery.isUnset ? null : (goalQuery.goal?.monthly.currentValue ?? null)
  const shortfall = monthlyTarget !== null && monthlyCurrent !== null ? monthlyTarget - monthlyCurrent : null

  const openAddTransaction = () => setState({ openModal: 'ledgerEntry' })
  const openAddGoal = () => setState({ openModal: 'addGoal', addGoalReturnTo: null })

  return (
    <DeepCard aria-busy={summaryQuery.isPending}>
      {summaryQuery.isPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
      ) : summaryQuery.error ? (
        <div style={ERROR_TEXT_STYLE_DEEP}>{summaryQuery.error.message}</div>
      ) : !summary || !hasTransactions ? (
        <EmptyState
          deep
          text="이번 달 거래를 등록하면 수입·지출·저축이 보여요"
          ctaLabel="거래 추가"
          onCta={openAddTransaction}
        />
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>
            이번 달 · {todayYearMonth().month}월 정산월
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap', color: 'var(--deep-saving)' }}>
              {formatNumber(summary.savingTotal)}
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
            </div>
            <div style={{ paddingBottom: 9, fontSize: 13, color: 'var(--deep-label)' }}>
              {summary.savingsRatePercent === null ? (
                '수입이 없어 저축률을 계산할 수 없어요'
              ) : (
                <>
                  저축 · 수입의 <b style={{ color: 'var(--deep-value)' }}>{summary.savingsRatePercent}%</b>
                </>
              )}
            </div>
          </div>
          {shortfall !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: 'var(--deep-label)', fontWeight: 400 }}>월 필요 저축까지</span>
              <StatBadge
                direction={shortfall > 0 ? 'down' : 'up'}
                text={`${formatNumber(Math.abs(shortfall))}원 ${shortfall > 0 ? '부족' : '초과'}`}
                bg="var(--deep-chip)"
                color={shortfall > 0 ? 'var(--deep-down)' : 'var(--deep-up)'}
              />
            </div>
          )}
          {goalQuery.isUnset && (
            <button onClick={openAddGoal} className="qbtn" style={{ ...DASHED_CTA_STYLE_DEEP, marginTop: 14, alignSelf: 'flex-start' }}>
              목표 설정
            </button>
          )}
          <div
            style={{
              display: isMobile ? 'grid' : 'flex',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
              gap: isMobile ? '14px 18px' : 32,
              marginTop: 22,
              paddingTop: 18,
              borderTop: '0.5px solid var(--deep-divider)',
            }}
          >
            <FlowValue label="수입" valueText={`+${formatNumber(summary.incomeTotal)}`} color="var(--deep-up)" />
            <FlowValue label="지출" valueText={`−${formatNumber(summary.expenseTotal)}`} color="var(--deep-down)" />
            <FlowValue label="저축" valueText={formatNumber(summary.savingTotal)} color="var(--deep-saving)" />
            {!isMobile && <div style={{ width: 0.5, background: 'var(--deep-divider)' }} />}
            <FlowValue label="전월 지출" valueText={`−${formatNumber(summary.expenseTotalPrevious)}`} color="var(--deep-label)" />
          </div>
        </>
      )}
    </DeepCard>
  )
}
