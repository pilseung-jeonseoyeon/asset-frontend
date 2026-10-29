// 상단 '개인 | {공유 화면 이름}' 범위(가족·커플 공유 v17) — 화면이 어느 범위의 숫자를 볼지 정하는 곳은 여기 하나다.
//
// 고른 값(AppState.viewScope)은 이 기기 localStorage(monit.viewScope)에 기억하는 순수 편의 설정이다
// (docs/state-management.md). 실제 범위는 연결 여부와 합쳐 정한다 — 연결이 없거나 아직 공유 상태를 모르면
// 늘 'PERSONAL'이다. 그래서 '우리집'을 고른 채 상대가 연결을 끊어도 화면은 저절로 '개인'으로 돌아온다.
// 범위에 따라 값이 달라지는 데이터 훅에는 { scope }를 넘기고, 그 훅은 queryKey에 scope를 넣는다(queryKeys.ts 규칙 3-1).

import { useAppState } from '../state/AppStateContext'
import { useGetShareStatus } from '@/services/share'
import type { ViewScope } from '@/services/common.type'

const VIEW_SCOPE_STORAGE_KEY = 'monit.viewScope'

/** 공유 화면 이름이 비었을 때(서버 기본값과 같은 글자) */
export const DEFAULT_SPACE_NAME = '우리집'

export function readStoredViewScope(): ViewScope {
  try {
    return window.localStorage.getItem(VIEW_SCOPE_STORAGE_KEY) === 'SHARED' ? 'SHARED' : 'PERSONAL'
  } catch {
    return 'PERSONAL'
  }
}

function storeViewScope(scope: ViewScope): void {
  try {
    window.localStorage.setItem(VIEW_SCOPE_STORAGE_KEY, scope)
  } catch {
    // 저장 실패면 이번 세션 동안만 유지된다 — 다음 부팅에 '개인'으로 보일 뿐이다
  }
}

export interface ViewScopeInfo {
  /** 지금 화면이 쓰는 범위 */
  scope: ViewScope
  /** 공유 연결 중인지 */
  linked: boolean
  /** 상단 두 번째 탭 이름 — 연결 중이면 공유 화면 이름, 아니면 '공유' */
  sharedTabLabel: string
  spaceName: string
  partnerName: string | null
  partnerUserId: string | null
  setScope: (scope: ViewScope) => void
}

export function useViewScope(): ViewScopeInfo {
  const { state, setState } = useAppState()
  const { shareStatus } = useGetShareStatus()
  const linked = shareStatus?.status === 'LINKED'
  const spaceName = shareStatus?.spaceName ?? DEFAULT_SPACE_NAME
  return {
    scope: linked && state.viewScope === 'SHARED' ? 'SHARED' : 'PERSONAL',
    linked,
    sharedTabLabel: linked ? spaceName : '공유',
    spaceName,
    partnerName: shareStatus?.partner?.name ?? null,
    partnerUserId: shareStatus?.partner?.userId ?? null,
    setScope: (scope) => {
      storeViewScope(scope)
      setState({ viewScope: scope, scopeHintOpen: false })
    },
  }
}
