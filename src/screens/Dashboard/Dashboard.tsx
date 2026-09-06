// 대시보드 화면. 설정 → 일반의 "대시보드 레이아웃"(AppState.dashboardLayout, 이 기기 localStorage에만
// 저장)에 따라 카드 배치 세 가지 중 하나를 그린다.
// - A 기본: 총자산 딥 카드 → 목표 → 올해 자산 현황(추이) → 자산 구성 → 보관처
// - B 추이 캔버스: 총자산과 추이 그래프를 딥 카드 하나로 합쳐 화면 폭 전체로
// - C 이번 달 흐름: 이번 달 수입·지출·저축이 대표 카드, 총자산은 오른쪽 흰 카드로
// 카드 컴포넌트는 cards/*, 배치는 layouts/*, 공유 계산은 hooks/*. 서버 통신은 각 카드가 자기 훅을
// 직접 부르고(React Query가 같은 쿼리를 합친다), 뷰모델 변환은 src/data/dashboardView.ts.
// 디자인 시안: claude.ai 캔버스 "Monit 대시보드 레이아웃"(2026-09-06).

import { useAppState } from '../../state/AppStateContext'
import { DashboardLayoutA } from './layouts/DashboardLayoutA'
import { DashboardLayoutB } from './layouts/DashboardLayoutB'
import { DashboardLayoutC } from './layouts/DashboardLayoutC'

export function Dashboard() {
  const { state } = useAppState()
  switch (state.dashboardLayout) {
    case 'B':
      return <DashboardLayoutB />
    case 'C':
      return <DashboardLayoutC />
    default:
      return <DashboardLayoutA />
  }
}
