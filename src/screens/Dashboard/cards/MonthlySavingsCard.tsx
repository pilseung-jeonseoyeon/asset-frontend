// C안 "월별 저축률" 카드 — Ledger.tsx의 같은 이름 카드와 완전히 같은 SVG·색·라벨을 그대로 옮긴다
// (buildSavingsBars/computeRecentAverageSavingsRate 재사용, 목표선·목표 칩 없음).

import { Card } from '../../../components/primitives/Card/Card'
import { buildSavingsBars, computeRecentAverageSavingsRate } from '../../../data/ledgerView'
import { todayYearMonth } from '../../../utils/date'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { useGetMonthlySummaries } from '@/services/transaction'

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const BAR_X_POSITIONS = [8, 50, 92, 134, 176, 218, 260, 302, 344, 386, 428, 470]

export function MonthlySavingsCard() {
  const today = todayYearMonth()
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
                    const height = (b.percent / 100) * 130
                    const x = BAR_X_POSITIONS[b.month - 1]
                    if (x === undefined) return null
                    return <rect key={b.month} x={x} y={130 - height} width="26" height={height} rx="5" />
                  })}
                </g>
              </svg>
              <div style={{ display: 'flex', marginTop: 6, fontSize: 10.5, color: 'var(--text-weak)' }}>
                {MONTH_LABELS.map((m, i) => (
                  <span key={m} style={{ flex: 1, textAlign: 'center', ...(i + 1 === today.month ? { fontWeight: 700, color: 'var(--accent)' } : null) }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
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
