// A안 · 기본 — 총자산 딥 카드 + 목표 / 올해 자산 현황 + 자산 구성 / 주요 자산 보관처.
// 카드는 전부 cards/*에 있고 여기서는 배치만 한다. 반응형 열 접힘은 base.css의 .rgrid-outer(<=1300px
// 1열) · .rgrid-cards(<=900px 1열)가 맡는다.

import { AllocationCard } from '../cards/AllocationCard'
import { GoalCard } from '../cards/GoalCard'
import { InstitutionsCard } from '../cards/InstitutionsCard'
import { ReportBanner } from '../cards/ReportBanner'
import { TotalAssetDeepCard } from '../cards/TotalAssetDeepCard'
import { YearStatusCard } from '../cards/YearStatusCard'

export function DashboardLayoutA() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <ReportBanner />

      {/* ROW 1: 총자산 히어로 + 목표버킷 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 26, alignItems: 'stretch' }}>
        <TotalAssetDeepCard />
        <GoalCard />
      </div>

      {/* ROW 2: 올해 자산 현황 + 구성비율 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <YearStatusCard />
        <AllocationCard />
      </div>

      {/* ROW 3: 주요 자산 보관처 */}
      <InstitutionsCard />
    </div>
  )
}
