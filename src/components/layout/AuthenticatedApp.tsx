// Source: secret/Asset Manager v14.dc.html L454-456 (root hasOpenSelect scrim, z-index 70),
// L701-761 (outer flex shell: sidebar + main), L840 onward (per-screen sc-if routing, isDash/isAsset/
// isStock/isLedger/isSet).
//
// Split out of AppShell.tsx as its own lazy-loaded chunk (see AppShell.tsx) — everything that only
// an authenticated visitor ever needs (nav, header, all 5 screens, all 19 always-mounted modals).
// A first-time or logged-out visitor never downloads this file.
//
// TradeEditModal/ExchangeHistoryModal (added 2026-08-17) have no dc.html source — the original
// prototype never had a trades/exchanges history screen. They exist because GET/PUT/DELETE
// /trades and /exchanges were already implemented server-side and had unused React Query hooks
// (docs/backend-request.md 4-1, 4-4) with no UI entry point at all.
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
import { ModalErrorBoundary } from './ModalErrorBoundary'
import { NAV_ITEMS } from './navItems'
import { useSyncUserTheme } from './useSyncUserTheme'
import type { AppState, Screen } from '../../state/types'
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
import { TradeEditModal } from '../../screens/Stocks/modals/TradeEditModal'
import { ExchangeHistoryModal } from '../../screens/Stocks/modals/ExchangeHistoryModal'
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

  // 모달 대부분은 state.modalOpen 하나로 열림을 판단하므로(파일 하단 ModalErrorBoundary 사용부
  // 참고) 이 하나의 리셋으로 충분하다. assetCat/accountDetail/reportOpen 전용 필드를 쓰는 세 모달만
  // 각자의 필드로 개별 리셋한다.
  //
  // 어떤 필드를 닫든 openDropdown도 항상 함께 지운다 — 이 저장소의 모든 모달(EditAccountModal,
  // AddAccountModal, QuickStockModal 등 최소 11개)이 자기 자신을 닫을 때 지키는 관례이자, 위
  // openDropdown 스크림(z-index 70, 화면 전체를 덮는 전역 클릭 캐처)이 모달과 별개로 계속 열려
  // 있으면 안 되기 때문이다. 19곳 각각이 이 규칙을 따로 기억하지 않도록 여기 한 곳에서만 강제한다.
  const resetModalState = (patch: Partial<AppState>) => () => setState({ ...patch, openDropdown: null })
  const closeModalOpen = resetModalState({ modalOpen: null })

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
          mounts here regardless of the current route, same as AccountModal.

          Each modal is wrapped in its own ModalErrorBoundary instance so a render crash in one modal
          only replaces that modal's own spot — the sidebar/header/current screen and every other modal
          stay interactive. onReset tells the boundary how to flip this specific modal back to "closed"
          in AppState; most modals key off state.modalOpen (closeModalOpen), and the three that use a
          dedicated field (assetCat/accountDetail/reportOpen) get their own reset via resetModalState.

          zIndex must match the literal each modal itself passes to its own <Modal>/scrim (§7-1) so the
          fallback replaces that modal at the same layer instead of a fixed value that could sit on top
          of (and hide) a still-healthy modal stacked above a crashed one (the AssetCategoryModal z80 /
          AddAccountModal·EditAccountModal·AccountDetailModal z90 two-tier pattern).

          title is the human-readable name shown in the fallback ("○○ 화면을 표시할 수 없어요"),
          copied from that modal's own header text. Modals whose title changes with form state (entry
          type, buy/sell, edit-vs-add) use the single most representative label instead of trying to
          reproduce the exact sub-state at crash time. */}
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="계정 및 프로필">
        <AccountModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="가계부 입력">
        <LedgerEntryModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="고정 지출 · 구독 추가">
        <FixedExpenseModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="일반 및 디스플레이">
        <GeneralModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="데이터 관리 및 백업">
        <DataModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="자산 · 가계부 맞춤 설정">
        <CustomModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="카테고리 설정">
        <CategorySettingsModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="주식 매수">
        <QuickStockModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="환전 추가">
        <ExchangeAddModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="매매 내역 수정">
        <TradeEditModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="환전 내역">
        <ExchangeHistoryModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={90} title="계좌 추가">
        <AddAccountModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={90} title="계좌 수정">
        <EditAccountModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={resetModalState({ assetCat: null })} zIndex={80} title="자산 카테고리 상세">
        <AssetCategoryModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="자산 목표 설정">
        <AddGoalModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="자산 보관처">
        <InstitutionsModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={resetModalState({ reportOpen: false })} zIndex={90} title="월간 리포트">
        <ReportOverlay />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={resetModalState({ accountDetail: null })} zIndex={90} title="계좌 상세">
        <AccountDetailModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="카테고리 상세">
        <CategoryDetailModal />
      </ModalErrorBoundary>
    </>
  )
}
