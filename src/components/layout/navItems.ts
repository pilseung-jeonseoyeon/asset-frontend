// 사이드바(SidebarNav)·모바일 하단탭(BottomTabNav)·라우트 표(AuthenticatedApp)가 한 정의를
// 공유하도록 여기로 뺐다 — 세 곳에 항목 목록과 경로를 복붙하면 한 곳만 고쳐지는 사고가 난다.

import type { Screen } from '../../state/types'

export interface NavItem {
  screen: Screen
  path: string
  icon: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { screen: 'dashboard', path: '/dashboard', icon: 'grid_view', label: '대시보드' },
  { screen: 'asset', path: '/assets', icon: 'account_balance_wallet', label: '자산' },
  { screen: 'stock', path: '/stocks', icon: 'trending_up', label: '주식' },
  { screen: 'ledger', path: '/ledger', icon: 'receipt_long', label: '가계부' },
  { screen: 'settings', path: '/settings', icon: 'settings', label: '설정' },
]
