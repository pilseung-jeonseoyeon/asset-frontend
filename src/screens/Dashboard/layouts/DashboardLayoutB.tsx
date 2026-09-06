// B안 · 추이 캔버스 — 총자산·증감·올해 추이를 한 딥 카드에 모으고, 아래 2열(구성 비율/목표) +
// 주요 자산 보관처. 카드는 전부 cards/*에 있고 여기서는 배치만 한다. 모바일에서는 시안대로
// 목표 → 구성 순서로 보이도록 useIsMobile()로 렌더 순서를 바꾼다(CSS만으로는 순서 반전이 안 됨).

import { AllocationCard } from '../cards/AllocationCard'
import { GoalCard } from '../cards/GoalCard'
import { InstitutionsCard } from '../cards/InstitutionsCard'
import { ReportBanner } from '../cards/ReportBanner'
import { TrendCanvasDeepCard } from '../cards/TrendCanvasDeepCard'
import { useIsMobile } from '../../../utils/useMediaQuery'

export function DashboardLayoutB() {
  const isMobile = useIsMobile()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <ReportBanner />

      <TrendCanvasDeepCard />

      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        {isMobile ? (
          <>
            <GoalCard />
            <AllocationCard />
          </>
        ) : (
          <>
            <AllocationCard />
            <GoalCard />
          </>
        )}
      </div>

      <InstitutionsCard />
    </div>
  )
}
