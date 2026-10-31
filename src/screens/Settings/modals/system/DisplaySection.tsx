// 시스템 관리의 '화면' 묶음: 테마 · 대시보드 레이아웃(옛 '일반 및 디스플레이'에서 옮김, 2026-10-31).
// - 테마: AppState 낙관적 반영 + localStorage 캐시(부팅 FOUC 방지, src/utils/theme.ts) + 서버 저장.
//   실패 롤백은 이 화면이 하지 않는다 — pickTheme 안 주석 참고.
// - 대시보드 레이아웃(A · B · C): 서버 필드가 없어 이 기기 localStorage 전용(src/utils/dashboardLayout.ts) — '이 기기에만'.
// 모바일(<=767px): 라이트/다크/시스템 토글은 데스크톱 패딩(~24px)이 docs/mobile.md §5의 44px 터치 타깃에 못 미쳐
// 모바일 변형만 세로로 키운다(데스크톱 패딩은 그대로) — themeButton 참고.
// mutation 인스턴스가 이 컴포넌트 안에 있어 창을 닫으면(언마운트) 지난 실패 메시지도 함께 사라진다.

import type { CSSProperties } from 'react'
import { useAppState } from '../../../../state/AppStateContext'
import { DASHBOARD_LAYOUT_LABELS, storeDashboardLayout } from '../../../../utils/dashboardLayout'
import { storeTheme, toThemeType } from '../../../../utils/theme'
import { useIsMobile } from '../../../../utils/useMediaQuery'
import { useGetUserSettings, usePatchUserSettings } from '@/services/user'
import type { DashboardLayout } from '../../../../utils/dashboardLayout'
import type { ThemeSetting } from '../../../../utils/theme'
import { DESCRIPTION_STYLE, DEVICE_ONLY_BADGE_STYLE, DEVICE_ONLY_LABEL, ERROR_STYLE, LAST_ROW_STYLE, NAME_STYLE, ROW_STYLE } from './systemStyles'

function themeButton(active: boolean, isMobile: boolean, disabled: boolean): CSSProperties {
  return {
    fontSize: 11.5, fontWeight: 700,
    padding: isMobile ? '11px 10px' : '5px 10px',
    // 패딩+폰트만으로는 44px에 못 미친다(11px*2 + 11.5px 라인박스 ≈ 35~36px) — minHeight로
    // 직접 확보한다. display:flex로 센터링해 늘어난 높이만큼 텍스트가 위로 쏠리지 않게 한다.
    minHeight: isMobile ? 44 : undefined,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--seg-active)' : 'transparent',
    color: active ? 'var(--text-strong)' : 'var(--text-weak)',
    opacity: disabled ? 0.45 : 1,
    boxShadow: 'none',
  }
}

const TOGGLE_TRACK_STYLE: CSSProperties = { display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 3, gap: 2, flex: 'none' }
const DASHBOARD_LAYOUT_ORDER: DashboardLayout[] = ['A', 'B', 'C']

export function DisplaySection() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const { data: settingsData, isPending: isSettingsPending } = useGetUserSettings()
  const patchTheme = usePatchUserSettings()

  // 설정을 못 받아온 구간(!settingsData: 최초 로딩 또는 조회 실패)에서는 테마 버튼도 막는다.
  // pickTheme은 무조건 AppState·localStorage를 먼저 바꾸는데, 이 구간엔 캐시가 비어 있어
  // usePatchUserSettings의 onMutate가 스냅샷을 못 찍고, 그래서 실패해도 onError가 롤백할 대상이
  // 없다 — 저장도 안 되고 되돌아가지도 않는 상태가 된다. 대신 창 위쪽 배너의 "다시 시도"로 복구한다.
  const themeDisabled = !settingsData || isSettingsPending || patchTheme.isPending

  const pickTheme = (next: ThemeSetting) => {
    setState({ theme: next }) // 즉시 반영 — 서버 응답을 기다리면 눌러도 화면이 안 바뀌는 것처럼 보인다.
    storeTheme(next)
    patchTheme.mutate({ theme: toThemeType(next) })
    // 실패 시 되돌리기를 여기서 하지 않는다: usePatchUserSettings의 onError가 React Query 캐시를
    // 이전 값으로 되돌리면, useSyncUserTheme(AuthenticatedApp에 마운트)이 "서버 값이 바뀌었다"고
    // 감지해 AppState·localStorage를 자동으로 원래대로 복원한다. 여기서 또 롤백 코드를 두면 같은
    // 로직이 두 곳으로 갈라져 나중에 한쪽만 고치는 사고가 난다 — 아래 인라인 에러만 보여준다.
  }

  const pickDashboardLayout = (next: DashboardLayout) => {
    setState({ dashboardLayout: next })
    storeDashboardLayout(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>테마 설정</div>
          <div style={DESCRIPTION_STYLE}>라이트 · 다크 · 시스템</div>
          {patchTheme.error && <div style={ERROR_STYLE}>{patchTheme.error.message}</div>}
        </div>
        <div style={TOGGLE_TRACK_STYLE}>
          <button disabled={themeDisabled} aria-pressed={state.theme === 'light'} onClick={() => pickTheme('light')} style={themeButton(state.theme === 'light', isMobile, themeDisabled)}>라이트</button>
          <button disabled={themeDisabled} aria-pressed={state.theme === 'dark'} onClick={() => pickTheme('dark')} style={themeButton(state.theme === 'dark', isMobile, themeDisabled)}>다크</button>
          <button disabled={themeDisabled} aria-pressed={state.theme === 'system'} onClick={() => pickTheme('system')} style={themeButton(state.theme === 'system', isMobile, themeDisabled)}>시스템</button>
        </div>
      </div>
      {/* 서버 설정에 필드가 없어 이 기기 localStorage에만 저장한다. 그래서 테마와 달리 서버 조회 실패와 무관하게
          항상 누를 수 있고, 누르는 즉시 AppState에 반영돼 대시보드로 돌아가면 바로 바뀌어 있다. */}
      <div style={LAST_ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>
            대시보드 레이아웃
            <span style={DEVICE_ONLY_BADGE_STYLE}>{DEVICE_ONLY_LABEL}</span>
          </div>
          <div style={DESCRIPTION_STYLE}>
            {DASHBOARD_LAYOUT_ORDER.map((layout) => `${layout} ${DASHBOARD_LAYOUT_LABELS[layout]}`).join(' · ')}
          </div>
        </div>
        <div style={TOGGLE_TRACK_STYLE}>
          {DASHBOARD_LAYOUT_ORDER.map((layout) => (
            <button
              key={layout}
              onClick={() => pickDashboardLayout(layout)}
              aria-pressed={state.dashboardLayout === layout}
              title={DASHBOARD_LAYOUT_LABELS[layout]}
              style={{ ...themeButton(state.dashboardLayout === layout, isMobile, false), minWidth: isMobile ? 44 : 34 }}
            >
              {layout}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
