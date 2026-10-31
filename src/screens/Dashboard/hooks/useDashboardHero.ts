// 총자산 히어로 판정 — GET /dashboard/summary로 "계좌 없음 / 0원 / 정상"을 가른다. 총자산 딥 카드·올해 자산
// 현황·리포트 배너·(C안) 총자산 요약 카드가 같은 판정을 공유하므로 훅으로 뺐다. React Query가 같은 쿼리를
// 합치므로 여러 카드가 불러도 요청은 한 번이다. allocation은 (C안) 요약 카드의 구성 막대용으로 같이 돌려준다.

import { buildDashboardHero } from '../../../data/dashboardView'
import { useAppState } from '../../../state/AppStateContext'
import { useViewScope } from '../../../utils/viewScope'
import { useGetDashboardAllocation, useGetDashboardSummary } from '@/services/dashboard'

export function useDashboardHero() {
  // '개인 | 우리집'(가족·커플 공유 v17) — 히어로·리포트 배너·올해 현황이 같은 범위를 쓴다
  const { scope } = useViewScope()
  const { setState } = useAppState()
  const summaryQuery = useGetDashboardSummary({ scope })
  const allocationQuery = useGetDashboardAllocation({ scope })
  // summary 는 실시간 계산이고 계좌 유무(hasAccounts)도 함께 준다 — allocation 을 기다려 보완할 필요가 없다
  const hero = summaryQuery.data ? buildDashboardHero(summaryQuery.data) : null

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
    /** summary 로딩 중 — 카드는 '—'를 보여준다. */
    isHeroPending: summaryQuery.isPending,
    /** summary 에러. 카드는 이 메시지를 그대로 보여준다. */
    heroError: summaryQuery.error,
  }
}
