// Source: secret/Asset Manager v14.dc.html L454-456 (root hasOpenSelect scrim, z-index 70),
// L701-761 (outer flex shell: sidebar + main), L840 onward (per-screen sc-if routing, isDash/isAsset/
// isStock/isLedger/isSet). Auth gate (isAuthed, L701) is skipped — this port always starts authenticated.
// Screen components are wired in as their own phases complete (see the placeholder note below).

import { useAppState } from '../../state/AppStateContext'
import { SidebarNav } from './SidebarNav'
import { Header } from './Header'
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
import { TargetRatioModal } from '../../screens/Assets/modals/TargetRatioModal'
import { AddGoalModal } from '../../screens/Assets/modals/AddGoalModal'
import { InstitutionsModal } from '../../screens/Assets/modals/InstitutionsModal'
import { ReportOverlay } from '../../screens/Assets/modals/ReportOverlay'
import { AccountDetailModal } from '../../screens/Assets/modals/AccountDetailModal'
import { CategoryDetailModal } from '../../screens/Ledger/modals/CategoryDetailModal'

export function AppShell() {
  const { state, setState } = useAppState()

  return (
    <>
      {state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
      )}
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: 'var(--canvas)' }}>
        <SidebarNav />
        <main style={{ flex: 1, minWidth: 0, padding: '30px 40px 56px' }}>
          <Header />
          {state.screen === 'dashboard' && <Dashboard />}
          {state.screen === 'asset' && <Assets />}
          {state.screen === 'stock' && <Stocks />}
          {state.screen === 'ledger' && <Ledger />}
          {state.screen === 'settings' && <Settings />}
        </main>
      </div>
      {/* All 14 modalXxx blocks in dc.html are top-level siblings gated only by s.modalOpen — NOT
          nested inside their "owning" screen's sc-if block (confirmed: modalLedgerEntry's markup sits
          inside the Assets line-range, L1605, yet opens from the Header on any screen). So every modal
          mounts here regardless of state.screen, same as AccountModal. */}
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
      <TargetRatioModal />
      <AddGoalModal />
      <InstitutionsModal />
      <ReportOverlay />
      <AccountDetailModal />
      <CategoryDetailModal />
    </>
  )
}
