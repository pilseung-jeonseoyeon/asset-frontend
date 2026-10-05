// C안 "월별 저축률" 카드 — Ledger.tsx의 같은 이름 카드와 같은 차트(SavingsBarChart)를 그대로 쓴다
// (buildSavingsBars/computeRecentAverageSavingsRate 재사용, 목표선·목표 칩 없음).

import { Card } from '../../../components/primitives/Card/Card'
import { SavingsBarChart } from '../../../components/primitives/SavingsBarChart/SavingsBarChart'
import { buildSavingsBars, computeRecentAverageSavingsRate } from '../../../data/ledgerView'
import { useCurrentSettlementMonth } from '../../../utils/useCurrentSettlementMonth'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { useGetMonthlySummaries } from '@/services/transaction'

export function MonthlySavingsCard() {
  // 막대 강조·연도는 오늘이 속한 정산월 기준 — 월별 요약도 정산월 라벨로 온다.
  const today = useCurrentSettlementMonth()
  const monthlyQuery = useGetMonthlySummaries(today.year)
  const bars = buildSavingsBars(monthlyQuery.summaries, today.month)
  const recentAverage = computeRecentAverageSavingsRate(bars)

  return (
    <Card style={{ padding: 24 }} aria-busy={monthlyQuery.isPending}>
      <div style={CARD_TITLE_STYLE}>월별 저축률</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 2 }}>1월~12월 · 수입 대비 저축률</div>
      {monthlyQuery.isPending ? (
        <div style={{ marginTop: 14 }}>
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        </div>
      ) : monthlyQuery.error ? (
        <div style={{ marginTop: 14 }}>
          <div style={ERROR_TEXT_STYLE}>{monthlyQuery.error.message}</div>
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
          <SavingsBarChart bars={bars} currentMonth={today.month} />
          {recentAverage !== null && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
              최근 6개월 평균 <b style={{ color: 'var(--text-strong)' }}>{recentAverage}%</b>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
