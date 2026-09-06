// 자산 구성 비율 카드 — 도넛 + 범례 + 최대 비중. ds_rules §3-4가 도넛을 앱 전체 두 곳(여기, 주식
// 섹터 비중)으로 제한하므로 다른 카드에서 도넛을 새로 만들지 말 것.

import { Card } from '../../../components/primitives/Card/Card'
import { DonutChart } from '../../../components/primitives/DonutChart/DonutChart'
import { buildAllocationSegments, pickTopAllocation } from '../../../data/dashboardView'
import { useGetDashboardAllocation } from '@/services/dashboard'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState } from './shared'

export function AllocationCard() {
  const allocationQuery = useGetDashboardAllocation()
  const allocationSegments = buildAllocationSegments(allocationQuery.allocation)
  const topAllocation = pickTopAllocation(allocationSegments)
  const hasAllocationData = allocationSegments.length > 0

  return (
    <Card style={{ padding: 24 }} aria-busy={allocationQuery.isPending}>
      <div style={{ ...CARD_TITLE_STYLE, marginBottom: 14 }}>자산 구성 비율</div>
      {allocationQuery.isPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
      ) : allocationQuery.error ? (
        <div style={ERROR_TEXT_STYLE}>{allocationQuery.error.message}</div>
      ) : !hasAllocationData ? (
        <EmptyState text="계좌를 추가하면 자산 구성 비율을 볼 수 있어요." />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, flex: 1 }}>
            <DonutChart segments={allocationSegments} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, flex: 1, whiteSpace: 'nowrap' }}>
              {allocationSegments
                .filter((seg) => seg.showLegend)
                .map((seg) => (
                  <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 4, background: seg.color }} />
                    <span style={{ color: 'var(--text-mid)', flex: 1 }}>{seg.label}</span>
                    <b>{seg.percent}%</b>
                  </div>
                ))}
            </div>
          </div>
          {topAllocation && (
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
              최대 비중 <b style={{ color: 'var(--text-strong)' }}>{topAllocation.label} {topAllocation.percent}%</b>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
