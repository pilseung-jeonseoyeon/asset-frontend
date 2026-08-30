// 인증된 사용자만 쓰는 것 전부 — 내비, 헤더, 화면 5개, 항상 마운트되는 모달 전부.
// AppShell.tsx에서 떼어내 lazy 청크로 갈랐다(AppShell.tsx 헤더 참고) — 처음 오거나 로그아웃한
// 방문자는 이 파일을 내려받지 않는다.
//
// 모바일 껍데기(<=767px, docs/mobile.md §2): SidebarNav 대신 고정 BottomTabNav를 쓰고
// `main`의 padding을 줄여 자리를 만든다.
//
// 라우팅: 메뉴 5개는 실제 URL이다(docs/architecture.md '라우팅'). 경로의 정본은 NAV_ITEMS
// (navItems.ts)이고 SidebarNav/BottomTabNav와 공유한다. 아래 SCREEN_COMPONENTS는 각 항목의
// `screen` 키를 렌더할 컴포넌트에 이어줄 뿐이다. `/`와 알 수 없는 경로는 NAV_ITEMS의 첫 항목
// (대시보드)으로 리다이렉트한다(replace — 히스토리에 쓰레기를 남기지 않는다).

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
import { AddHoldingsModal } from '../../screens/Stocks/modals/AddHoldingsModal'
import { ExchangeHistoryModal } from '../../screens/Stocks/modals/ExchangeHistoryModal'
import { AddAccountModal } from '../../screens/Assets/modals/AddAccountModal'
import { EditAccountModal } from '../../screens/Assets/modals/EditAccountModal'
import { AssetCategoryModal } from '../../screens/Assets/modals/AssetCategoryModal'
import { RealEstateSoonModal } from '../../screens/Assets/modals/RealEstateSoonModal'
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
  // 참고) 이 하나의 리셋으로 충분하다. assetClassDetail/accountDetail/reportOpen 전용 필드를 쓰는 세 모달만
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
      {/* 모든 modalXxx는 s.modalOpen만 보고 열리는 최상위 형제다 —
          nested inside their "owning" screen's sc-if block (confirmed: modalLedgerEntry's markup sits
          inside the Assets line-range, L1605, yet opens from the Header on any screen). So every modal
          mounts here regardless of the current route, same as AccountModal.

          Each modal is wrapped in its own ModalErrorBoundary instance so a render crash in one modal
          only replaces that modal's own spot — the sidebar/header/current screen and every other modal
          stay interactive. onReset tells the boundary how to flip this specific modal back to "closed"
          in AppState; most modals key off state.modalOpen (closeModalOpen), and the three that use a
          dedicated field (assetClassDetail/accountDetail/reportOpen) get their own reset via resetModalState.

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
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="보유 종목 추가">
        <AddHoldingsModal />
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
      <ModalErrorBoundary onReset={resetModalState({ assetClassDetail: null })} zIndex={80} title="자산 카테고리 상세">
        <AssetCategoryModal />
      </ModalErrorBoundary>
      <ModalErrorBoundary onReset={closeModalOpen} zIndex={80} title="부동산">
        <RealEstateSoonModal />
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
