// 일반 설정 모달. z-index 80, 너비 540px, maxHeight 86vh.
// CustomModal.tsx가 월 시작일을 다루는 것과 같은 방식으로 GET/PATCH /users/me/settings에 연결돼 있다.
// - 테마: AppState 낙관적 반영 + localStorage 캐시(부팅 FOUC 방지, src/utils/theme.ts) + 서버 저장.
// 실패 롤백은 이 화면이 하지 않는다 — pickTheme 안 주석 참고.
// - 기준 통화: 서버 값을 읽기 전용으로 보여준다. USD를 골라도 대시보드 등 모든 응답이 원화 고정
// 필드(totalAssetKrw 등)라 화면 금액이 하나도 바뀌지 않으므로(다통화 표기 미지원, 백엔드 요청
// 항목), 드롭다운 대신 '대시보드 레이아웃' 행이 이미 쓰는 '추후 업데이트' 배지를 붙인다.
//
// '환율 자동 갱신' 행은 화면에서 뺐다(켜고 끄는 의미가 없다는 사용자 판단). 서버 설정 필드
// (UserSettingsRes.fxAutoRefresh)와 PATCH 계약은 그대로 있으니 다시 노출하려면 행 하나만 되살리면
// 된다. 프론트는 환율을 직접 다루지 않는다(CLAUDE.md).
//
// 모바일(<=767px): 라이트/다크/시스템 토글은 데스크톱 패딩(~24px)이 docs/mobile.md §5의 44px 터치
// 타깃에 못 미쳐 모바일 변형만 세로로 키운다(데스크톱 패딩은 그대로) — themeBtn 참고.

import type { CSSProperties } from 'react'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { storeTheme, toThemeType } from '../../../utils/theme'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useGetUserSettings, usePatchUserSettings } from '@/services/user'
import type { ThemeSetting } from '../../../utils/theme'
import type { Currency } from '@/services/common.type'

function themeBtn(active: boolean, isMobile: boolean, disabled: boolean): CSSProperties {
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

const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}

const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 4 }
// CustomModal.tsx의 "불러오는 중…" 캡션과 동일한 규격 — 로딩과 (여기서는 없는) 빈 상태를
// 구분해서, 조회가 아직 안 끝난 것뿐인데 실패로 오인하지 않게 한다.
const LOADING_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }

// settingsError를 행마다 반복해서 보여주면(테마·기준 통화 등) 같은 실패
// 문장이 한 화면에 3번 쌓인다 — 조회 상태(로딩/에러)는 모달 상단에 한 번만 보여준다. LoginForm.tsx의
// "비밀번호를 잊으셨나요?" 링크와 동일한 텍스트 버튼 규격(배경 없음, --accent, 12px/700)을 재사용한다.
const RETRY_BTN_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 700,
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8,
}
// 기준 통화 행의 값 pill. 서버 응답이 없으면 '—'로 둔다 — "서버 응답에 없는 값은 화면에 그리지
// 않는다"는 이 저장소 원칙.
const VALUE_PILL_STYLE: CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8,
}

const CURRENCY_LABELS: Record<Currency, string> = { KRW: 'KRW ₩', USD: 'USD $' }

export function GeneralModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const isMobile = useIsMobile()

  const isOpen = state.modalOpen === 'general'
  const {
    data: settingsData,
    isPending: isSettingsPending,
    error: settingsError,
    refetch: refetchSettings,
  } = useGetUserSettings({ enabled: isOpen })
  // 행마다 독립된 mutation 인스턴스를 쓴다 — 하나를 공유하면 mutate() 호출마다 이전 mutation의
  // 관찰자가 떨어져 나가, 두 행을 겹쳐 조작했을 때 먼저 보낸 행의 실패 메시지가 영영 표시되지
  // 않는다(지금은 저장하는 행이 테마 하나뿐이라 인스턴스도 하나지만, 저장하는 행을
  // 다시 늘릴 때는 공유하지 말고 인스턴스를 하나 더 만들 것.
  const patchTheme = usePatchUserSettings()

  if (!isOpen) return null

  // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. mutation 에러를 지우지
  // 않으면 다음에 열 때 이전 세션의 실패 메시지가 그대로 남는다(CategorySettingsModal.tsx의
  // closeAndReset과 동일한 패턴) — 두 mutation 모두 reset한다.
  const closeAndReset = () => {
    patchTheme.reset()
    closeModal()
  }

  // 설정을 못 받아온 구간(!settingsData: 최초 로딩 또는 조회 실패)에서는 테마 버튼도 막는다.
  // pickTheme은 무조건 AppState·localStorage를 먼저 바꾸는데, 이 구간엔 캐시가 비어 있어
  // usePatchUserSettings의 onMutate가 스냅샷을 못 찍고, 그래서 실패해도 onError가 롤백할 대상이
  // 없다 — 저장도 안 되고 되돌아가지도 않는 상태가 된다.
  // 2차 리뷰에서 "조회 실패 시에도 테마 버튼은 활성화하자"는 제안이 있었지만 채택하지 않았다 —
  // 그러면 위 이유대로 롤백 대상 없이 "저장도 안 되고 되돌아가지도 않는" 상태가 된다. 대신 상단
  // 배너의 "다시 시도"로 즉시 복구할 수 있게 했다.
  const controlsDisabled = !settingsData || isSettingsPending
  const themeDisabled = controlsDisabled || patchTheme.isPending

  const pickTheme = (next: ThemeSetting) => {
    setState({ theme: next }) // 즉시 반영 — 서버 응답을 기다리면 눌러도 화면이 안 바뀌는 것처럼 보인다.
    storeTheme(next)
    patchTheme.mutate({ theme: toThemeType(next) })
    // 실패 시 되돌리기를 여기서 하지 않는다: usePatchUserSettings의 onError가 React Query 캐시를
    // 이전 값으로 되돌리면, useSyncUserTheme(AuthenticatedApp에 마운트)이 "서버 값이 바뀌었다"고
    // 감지해 AppState·localStorage를 자동으로 원래대로 복원한다. 여기서 또 롤백 코드를 두면 같은
    // 로직이 두 곳으로 갈라져 나중에 한쪽만 고치는 사고가 난다 — 아래 인라인 에러만 보여준다.
  }

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="tune" title="일반 및 디스플레이" onClose={closeAndReset} />
      {/* 조회 상태는 여기 한 곳에서만 보여준다 — 아래 행들은 저장(mutation) 실패만 각자 표시한다. */}
      {isSettingsPending && (
        <div aria-busy style={{ ...LOADING_STYLE, marginTop: 0, padding: '0 0 12px' }}>불러오는 중…</div>
      )}
      {settingsError && (
        <div style={{ ...ERROR_STYLE, marginTop: 0, padding: '0 0 12px', display: 'flex', alignItems: 'center' }}>
          설정을 불러오지 못했어요: {settingsError.message}
          <button type="button" onClick={() => void refetchSettings()} style={RETRY_BTN_STYLE}>다시 시도</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>테마 설정</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>라이트 · 다크 · 시스템</div>
            {patchTheme.error && <div style={ERROR_STYLE}>{patchTheme.error.message}</div>}
          </div>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 3, gap: 2 }}>
            <button disabled={themeDisabled} onClick={() => pickTheme('light')} style={themeBtn(state.theme === 'light', isMobile, themeDisabled)}>라이트</button>
            <button disabled={themeDisabled} onClick={() => pickTheme('dark')} style={themeBtn(state.theme === 'dark', isMobile, themeDisabled)}>다크</button>
            <button disabled={themeDisabled} onClick={() => pickTheme('system')} style={themeBtn(state.theme === 'system', isMobile, themeDisabled)}>시스템</button>
          </div>
        </div>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>기준 통화</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>원화 환산 기준</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={VALUE_PILL_STYLE}>
              {settingsData ? CURRENCY_LABELS[settingsData.baseCurrency] : '—'}
            </span>
            {/* 다른 통화를 골라도 대시보드 등 모든 응답이 원화 단일 필드라 화면이 하나도 안
                바뀐다 — 통화 전환을 실제로 구현하려면 백엔드가 응답에 적용 환율을 함께 내려줘야
                한다. 그때까지는 대시보드 레이아웃 행과 동일한 "추후 업데이트" 배지로 표시한다. */}
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: 8 }}>
              추후 업데이트
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>대시보드 레이아웃</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>A · B · C 중 기본값</div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: 8 }}>
            추후 업데이트
          </span>
        </div>
      </div>
    </Modal>
  )
}
