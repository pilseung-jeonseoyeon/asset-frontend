// Source: secret/Asset Manager v14.dc.html L704-758 (SIDEBAR nav definitions) — extracted out of
// SidebarNav.tsx so both the desktop SidebarNav and the mobile BottomTabNav (docs/mobile.md §3) share
// one definition instead of duplicating the item list.

import type { Screen } from '../../state/types'

export const NAV_ITEMS: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'dashboard', icon: 'grid_view', label: '대시보드' },
  { screen: 'asset', icon: 'account_balance_wallet', label: '자산' },
  { screen: 'stock', icon: 'trending_up', label: '주식' },
  { screen: 'ledger', icon: 'receipt_long', label: '가계부' },
  { screen: 'settings', icon: 'settings', label: '설정' },
]
