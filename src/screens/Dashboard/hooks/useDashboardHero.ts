// 총자산 히어로 판정 — GET /dashboard/summary + GET /dashboard/allocation을 합쳐 "계좌 없음 /
// 스냅샷 없음 / 정상"을 가른다. 총자산 딥 카드·올해 자산 현황·리포트 배너·(C안) 총자산 요약 카드가
// 같은 판정을 공유하므로 훅으로 뺐다. React Query가 같은 쿼리를 합치므로 여러 카드가 불러도 요청은
// 한 번이다.

import { buildDashboardHero, sumAllocationKrw } from '../../../data/dashboardView'
import { useAppState } from '../../../state/AppStateContext'
import { useViewScope } from '../../../utils/viewScope'
import { useGetDashboardAllocation, useGetDashboardSummary } from '@/services/dashboard'

export function useDashboardHero() {
  // '개인 | 우리집'(가족·커플 공유 v17) — 히어로·리포트 배너·올해 현황이 같은 범위를 쓴다
  const { scope } = useViewScope()
  const { setState } = useAppState()
  const summaryQuery = useGetDashboardSummary({ scope })
  const allocationQuery = useGetDashboardAllocation({ scope })
  // summary(스냅샷 기반)가 0이면 "계좌 없음"과 "계좌 등록 첫날이라 스냅샷이 아직 없음"을 구분할 수
  // 없다 — allocation(실시간 집계) 합계로 보완해서 판정한다.
  // allocation이 아직 로딩 중일 때 곧바로 판정해버리면 "빈 상태" → "실제 데이터"로 바뀌는 깜빡임이
  // 생기므로, summary가 0인 동안은 allocation이 정착(settle)할 때까지 히어로 판정을 보류한다
  // (리포트 배너가 hero 자체로 자신을 게이트하는 것과 같은 이유).
  const summaryIsZero = summaryQuery.data?.totalAssetKrw === 0
  const heroBlockedByAllocation = summaryIsZero && allocationQuery.isPending
  // summary가 0인데 allocation 조회 자체가 실패하면 "계좌가 없어서 0"인지 "있는데 못 가져와서
  // 0"인지 알 수 없다 — 빈 상태로 잘못 단정하지 말고 에러로 보여준다(도넛 카드와 같은 에러
  // 메시지 소스라 화면 안에서 모순된 상태가 뜨지 않는다).
  const heroAllocationErrored = summaryIsZero && !!allocationQuery.error
  const hero =
    summaryQuery.data && !heroBlockedByAllocation
      ? buildDashboardHero(summaryQuery.data, sumAllocationKrw(allocationQuery.allocation))
      : null

  // 빈 상태의 안내·버튼 — '우리집'은 계좌 추가가 아니라 공유할 계좌 고르기다
  const emptyCta =
    scope === 'SHARED'
      ? {
          text: '아직 함께 보는 계좌가 없어요. 공유 계좌 관리에서 함께 볼 계좌를 골라주세요',
          label: '공유 계좌 관리',
          icon: 'checklist',
          onClick: () => setState({ quickAddOpen: false, openModal: 'familyShare', shareFlowStep: 'home' }),
        }
      : {
          text: '계좌를 추가하고 총자산을 한눈에 확인해보세요',
          label: '계좌 추가',
          icon: 'add',
          onClick: () => setState({ quickAddOpen: false, openModal: 'addAccount' }),
        }

  return {
    scope,
    emptyCta,
    summaryQuery,
    allocationQuery,
    hero,
    /** summary 로딩 중이거나 allocation 정착 대기 중 — 카드는 '—'를 보여준다. */
    isHeroPending: summaryQuery.isPending || heroBlockedByAllocation,
    /** summary 에러 또는 (summary 0 + allocation 에러). 카드는 이 메시지를 그대로 보여준다. */
    heroError: summaryQuery.error ?? (heroAllocationErrored ? allocationQuery.error : null),
  }
}
