// C안 "이번 달 지출 TOP 5" 카드 — GET /transactions/rankings 상위 5개. buildLedgerCategories
// (ledgerView.ts)를 그대로 재사용해 순위 막대 색을 Ledger.tsx와 통일한다. 전월 대비 금액 차이는
// 응답의 expenseTotal/expenseTotalPrevious를 그대로 빼서 보여준다(증감률이 아니라 원 단위 차이).

import { useNavigate } from 'react-router-dom'
import { Card } from '../../../components/primitives/Card/Card'
import { buildLedgerCategories } from '../../../data/ledgerView'
import { formatNumber } from '../../../utils/format'
import { CARD_LINK_STYLE, CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState } from './shared'
import { useGetCategoryRankings } from '@/services/transaction'

const TOP_N = 5

function changeLabel(current: number, previous: number): string {
  const diff = current - previous
  if (previous === 0) return '신규 지출'
  if (diff === 0) return '전월 대비 변동 없음'
  return `전월 대비 ${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))}`
}

export function CategoryRankCard() {
  const navigate = useNavigate()
  const rankingsQuery = useGetCategoryRankings({})
  const rankings = rankingsQuery.rankings
  const rows = buildLedgerCategories(rankings).slice(0, TOP_N)
  const rankingByCategoryId = new Map(rankings.map((r) => [r.categoryId, r]))

  return (
    <Card style={{ padding: 24 }} aria-busy={rankingsQuery.isPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={CARD_TITLE_STYLE}>이번 달 지출 TOP 5</div>
        <button type="button" onClick={() => navigate('/ledger')} style={CARD_LINK_STYLE}>
          가계부에서 보기 ›
        </button>
      </div>
      {rankingsQuery.isPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
      ) : rankingsQuery.error ? (
        <div style={ERROR_TEXT_STYLE}>{rankingsQuery.error.message}</div>
      ) : rows.length === 0 ? (
        <EmptyState text="이번 달에는 지출 내역이 없어요." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row) => {
            const ranking = rankingByCategoryId.get(row.categoryId)
            const current = ranking?.expenseTotal ?? 0
            const previous = ranking?.expenseTotalPrevious ?? 0
            return (
              <div key={row.categoryId}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{row.name}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{changeLabel(current, previous)}</span>
                    <b style={{ fontSize: 12.5, color: 'var(--text-strong)' }}>
                      {row.amountText}
                      <span style={{ fontSize: 10.5, color: 'var(--text-weak)', fontWeight: 600 }}>원</span>
                    </b>
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--track)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${row.barPercent}%`, background: row.rampColor, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
