// Source: secret/Asset Manager v14.dc.html L454-456 (root hasOpenSelect scrim, z-index 70),
// L701-761 (outer flex shell: sidebar + main), L840 onward (per-screen sc-if routing, isDash/isAsset/
// isStock/isLedger/isSet).
//
// Split out of AppShell.tsx as its own lazy-loaded chunk (see AppShell.tsx) — everything that only
// an authenticated visitor ever needs (nav, header, all 5 screens, all 17 always-mounted modals).
// A first-time or logged-out visitor never downloads this file.
//
// Mobile shell (<=767px, docs/mobile.md §2): SidebarNav is swapped for the fixed BottomTabNav and
// `main` padding drops to leave room for it.
//
// Routing: the 5 menu screens are real URLs (see docs/architecture.md "라우팅"). NAV_ITEMS
// (navItems.ts) is the single source of paths shared with SidebarNav/BottomTabNav; SCREEN_COMPONENTS
// below just maps each item's `screen` key to the component it renders. `/` and any unknown path
// redirect (replace, so no history junk) to the first NAV_ITEMS entry (dashboard).

import type { ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppState } from '../../state/AppStateContext'
import { useIsMobile } from '../../utils/useMediaQuery'
import { SidebarNav } from './SidebarNav'
import { BottomTabNav } from './BottomTabNav'
import { Header } from './Header'
import { NAV_ITEMS } from './navItems'
import { useSyncUserTheme } from './useSyncUserTheme'
import type { Screen } from '../../state/types'
import { AccountModal } from './modals/AccountModal'
import { Dashboard } from '../../screens/Dashboard/Dashboard'
import { Stocks } from '../../screens/Stocks/Stocks'
import { Ledger } from '../../screens/Ledger/Ledger'
import { LedgerEntryModal } from '../../screens/Ledger/modals/LedgerEntryModal'
import { FixedExpenseModal } from '../../screens/Ledger/modals/FixedExpenseModal'
import { Settings } from '../../screens/Settings/Settings'
import { GeneralModal } from '../../screens/Settings/modals/GeneralModal'
import { DataModal } from '../../screens/Settings/modals/DataModal'
import { CustomModal } from '../../screens/Settings/modals/CustomModal'
import { CategorySettingsModal } from '../../screens/Settings/modals/CategorySettingsModal'
import { Assets } from '../../screens/Assets/Assets'
import { QuickStockModal } from '../../screens/Assets/modals/QuickStockModal'
import { ExchangeAddModal } from '../../screens/Assets/modals/ExchangeAddModal'
import { AddAccountModal } from '../../screens/Assets/modals/AddAccountModal'
import { EditAccountModal } from '../../screens/Assets/modals/EditAccountModal'
import { AssetCategoryModal } from '../../screens/Assets/modals/AssetCategoryModal'
import { AddGoalModal } from '../../screens/Assets/modals/AddGoalModal'
import { InstitutionsModal } from '../../screens/Assets/modals/InstitutionsModal'
import { ReportOverlay } from '../../screens/Assets/modals/ReportOverlay'
import { AccountDetailModal } from '../../screens/Assets/modals/AccountDetailModal'
import { CategoryDetailModal } from '../../screens/Ledger/modals/CategoryDetailModal'

const SCREEN_COMPONENTS: Record<Screen, ComponentType> = {
  dashboard: Dashboard,
  asset: Assets,
  stock: Stocks,
  ledger: Ledger,
  settings: Settings,
}

export function AuthenticatedApp() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  // 이 컴포넌트는 AppShell 게이팅상 인증된 상태에서만 마운트되므로(기존 401 회피 규칙 유지),
  // 서버 사용자 설정의 theme을 AppState로 미러링해도 안전하다. 부수 효과로 CustomModal 등에서
  // 서버 설정이 필요한 다른 행(월 시작일 등)도 이 시점에 미리 페치되어 잠깐의 기본값 깜빡임이 준다.
  useSyncUserTheme()

  return (
    <>
      {state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
      )}
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--canvas)' }}>
        {!isMobile && <SidebarNav />}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile ? '18px 16px calc(64px + env(safe-area-inset-bottom) + 20px)' : '30px 40px 56px',
          }}
        >
          <Header />
          <Routes>
            <Route path="/" element={<Navigate to={NAV_ITEMS[0].path} replace />} />
            {NAV_ITEMS.map((item) => {
              const ScreenComponent = SCREEN_COMPONENTS[item.screen]
              return <Route key={item.screen} path={item.path} element={<ScreenComponent />} />
            })}
            <Route path="*" element={<Navigate to={NAV_ITEMS[0].path} replace />} />
          </Routes>
        </main>
      </div>
      {isMobile && <BottomTabNav />}
      {/* All 14 modalXxx blocks in dc.html are top-level siblings gated only by s.modalOpen — NOT
          nested inside their "owning" screen's sc-if block (confirmed: modalLedgerEntry's markup sits
          inside the Assets line-range, L1605, yet opens from the Header on any screen). So every modal
          mounts here regardless of the current route, same as AccountModal. */}
      <AccountModal />
      <LedgerEntryModal />
      <FixedExpenseModal />
      <GeneralModal />
      <DataModal />
      <CustomModal />
      <CategorySettingsModal />
      <QuickStockModal />
      <ExchangeAddModal />
      <AddAccountModal />
      <EditAccountModal />
      <AssetCategoryModal />
      <AddGoalModal />
      <InstitutionsModal />
      <ReportOverlay />
      <AccountDetailModal />
      <CategoryDetailModal />
    </>
  )
}
