// 대시보드 레이아웃(A · B · C) 설정 — 이 기기에만 저장되는 순수 편의 설정.
//
// 서버 설정(UserSettingsRes)에 대응 필드가 없어 localStorage에만 둔다(docs/state-management.md의
// "서버 정본의 캐시나 순수 편의 힌트" 조건 중 후자). 다른 기기에서는 기본값 A로 보인다 — 서버 필드가
// 생기면 theme.ts처럼 "서버 정본 + localStorage 캐시" 구조로 바꾸면 된다.
// 키는 다른 localStorage 키와 같은 `monit.` 접두어, 접근 실패는 전부 삼킨다(theme.ts와 동일).

export type DashboardLayout = 'A' | 'B' | 'C'

const DASHBOARD_LAYOUT_STORAGE_KEY = 'monit.dashboardLayout'

const VALID_DASHBOARD_LAYOUTS: readonly DashboardLayout[] = ['A', 'B', 'C']

/** 설정 화면·안내 문구가 공유하는 레이아웃 이름. 캔버스(디자인 시안)의 아트보드 제목과 같다. */
export const DASHBOARD_LAYOUT_LABELS: Record<DashboardLayout, string> = {
  A: '기본',
  B: '추이 캔버스',
  C: '이번 달 흐름',
}

/** 저장된 값이 없거나 세 값 밖이면(과거 버전, 수동 조작) 기본 레이아웃 `'A'`로 폴백한다. */
export function readStoredDashboardLayout(): DashboardLayout {
  try {
    const stored = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
    if (stored && (VALID_DASHBOARD_LAYOUTS as string[]).includes(stored)) {
      return stored as DashboardLayout
    }
    return 'A'
  } catch {
    return 'A'
  }
}

export function storeDashboardLayout(layout: DashboardLayout): void {
  try {
    window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, layout)
  } catch {
    // 저장 실패면 이번 세션 동안만 AppState로 반영되고 다음 부팅 때 A로 돌아간다 — 치명적이지 않다.
  }
}
