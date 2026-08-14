// Source: secret/Asset Manager v14.dc.html L704-758 (SIDEBAR nav definitions) — extracted out of
// SidebarNav.tsx so both the desktop SidebarNav, the mobile BottomTabNav (docs/mobile.md §3) and the
// route table (AuthenticatedApp.tsx) share one definition instead of duplicating the item list/paths.

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
