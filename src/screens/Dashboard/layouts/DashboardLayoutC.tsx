// C안 · 이번 달 흐름판 — 이번 달 저축 중심 딥 카드 + 총자산 요약 / 이번 달 목표 + 지출 TOP 5 /
// 월별 저축률 + 다가오는 고정 지출. 카드는 전부 cards/*에 있고 여기서는 배치만 한다. 반응형 열
// 접힘은 base.css의 .rgrid-outer(<=1300px 1열) · .rgrid-cards(<=900px 1열)가 맡는다.

import { CategoryRankCard } from '../cards/CategoryRankCard'
import { MonthFlowDeepCard } from '../cards/MonthFlowDeepCard'
import { MonthlySavingsCard } from '../cards/MonthlySavingsCard'
import { ReportBanner } from '../cards/ReportBanner'
import { SpendableGoalCard } from '../cards/SpendableGoalCard'
import { TotalCompactCard } from '../cards/TotalCompactCard'
import { UpcomingSubscriptionsCard } from '../cards/UpcomingSubscriptionsCard'

export function DashboardLayoutC() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <ReportBanner />

      {/* ROW 1: 이번 달 흐름 딥 카드 + 총자산 요약 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 26, alignItems: 'stretch' }}>
        <MonthFlowDeepCard />
        <TotalCompactCard />
      </div>

      {/* ROW 2: 이번 달 목표 + 지출 TOP 5 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <SpendableGoalCard />
        <CategoryRankCard />
      </div>

      {/* ROW 3: 월별 저축률 + 다가오는 고정 지출 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <MonthlySavingsCard />
        <UpcomingSubscriptionsCard />
      </div>
    </div>
  )
}
