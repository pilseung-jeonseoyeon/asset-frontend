// Source: secret/Asset Manager v14.dc.html L3309-3399 (modalCustom) — transcribed verbatim.
// z-index 80, width 540px, maxHeight 86vh.
// ddMonthStart는 이제 AppState가 아니라 서버 사용자 설정(GET/PATCH /users/me/settings)을 읽고 쓴다.
// 드롭다운 마크업 자체는 L3345-3357 그대로다.
// D-Day 알림 토글은 GeneralModal.tsx의 환율 자동 갱신 행과 완전히 같은 규칙을 따른다: Switch
// 프리미티브 + 독립 mutation 인스턴스 + 설정을 못 받아온 구간엔 스위치 대신 '—' 플레이스홀더.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { Switch } from '../../../components/primitives/Switch/Switch'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useGetUserSettings, usePatchUserSettings } from '@/services/user'
import { useGetGoal } from '@/services/goal'
// 목표 진행률 행은 대시보드 위젯과 완전히 같은 계산식(API-SPEC §5.1 각주의 D-Day·초과 저축액)을
// 쓴다. 두 벌로 두면 한쪽만 고쳤을 때 같은 화면의 두 자리에서 다른 숫자가 나오므로 공용 함수를 쓴다.
import { buildAssetGoals } from '../../../data/dashboardView'

const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 4 }
// GeneralModal.tsx의 기준 통화·환율 자동 갱신 행과 동일한 '값 없음' 플레이스홀더 규격.
const VALUE_PILL_STYLE: CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8,
}

// 서버가 monthStartDay를 1~28로 검증한다(@Min(1)@Max(28)) — 29~31은 달마다 존재하지 않는 날이라
// 선택지에서 제외한다. 원본 프로토타입은 31일까지 보여줬다.
const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

export function CustomModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const isOpen = state.modalOpen === 'custom'
  const { settings, data: settingsData, error: settingsError } = useGetUserSettings({ enabled: isOpen })
  const patchSettings = usePatchUserSettings()
  // GeneralModal.tsx와 같은 이유로 독립 인스턴스를 쓴다 — 월 시작일 저장과 D-Day 토글을 겹쳐서
  // 조작해도 서로의 에러/로딩을 가리지 않는다(리뷰 #3 패턴 재사용).
  const patchDday = usePatchUserSettings()
  const {
    goal,
    isUnset: isGoalUnset,
    error: goalError,
    isPending: isGoalPending,
  } = useGetGoal({}, { enabled: isOpen })

  if (!isOpen) return null

  // GeneralModal.tsx와 완전히 같은 이유: 이 모달도 AppShell에 항상 마운트되어 있어 닫아도
  // 언마운트되지 않는다. reset()이 없으면 저장이 실패한 뒤 모달을 닫았다 다시 열 때 지난 실패
  // 메시지가 그대로 다시 나타난다(리뷰 #9).
  const closeAndReset = () => {
    patchSettings.reset()
    patchDday.reset()
    closeModal()
  }

  // 설정을 못 받아온 구간(최초 로딩·조회 실패)에서는 D-Day 스위치도 막는다 — GeneralModal의
  // controlsDisabled와 동일한 이유(onMutate가 스냅샷을 못 찍어 롤백 대상이 없다).
  const controlsDisabled = !settingsData

  const goalRows = !isGoalUnset && goal ? buildAssetGoals(goal) : []

  const ddMonthStart = {
    value: `${settings.monthStartDay}일`,
    open: state.openDropdown === 'monthStart',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'monthStart' ? null : 'monthStart' })),
    options: MONTH_START_DAYS.map((d) => ({
      name: `${d}일`,
      pick: () => {
        patchSettings.mutate({ monthStartDay: d })
        setState({ openDropdown: null })
      },
    })),
  }

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="dashboard_customize" title="자산 · 가계부 맞춤 설정" onClose={closeAndReset} />
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>카테고리 설정</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>수입 · 저축 · 지출 대분류별 소분류 관리</div>
          </div>
          <button
            className="qbtn"
            onClick={() => setState({ modalOpen: 'categorySettings' })}
            style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '8px 13px', borderRadius: 10, border: 'none', background: 'var(--track)', color: 'var(--text-strong)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s' }}
          >
            관리
            <Icon name="chevron_right" size={16} color="var(--text-mid)" />
          </button>
        </div>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>월 시작일</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>급여일 기준 정산</div>
            {settingsError && (
              <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 4 }}>
                설정을 불러오지 못했어요: {settingsError.message}
              </div>
            )}
            {patchSettings.error && (
              <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 4 }}>
                {patchSettings.error.message}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <div
              onClick={ddMonthStart.toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8, cursor: 'pointer' }}
            >
              {ddMonthStart.value}
              <Icon name="expand_more" size={16} color="var(--text-weak)" />
            </div>
            {ddMonthStart.open && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 6, zIndex: 95, maxHeight: 200, overflow: 'auto', minWidth: 100 }}
              >
                {ddMonthStart.options.map((o) => (
                  <button
                    key={o.name}
                    className="mini-hov"
                    onClick={o.pick}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '15px 0', borderBottom: '0.5px solid var(--track)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>자산 목표</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>총 자산 기준 연간·월간 목표 진행률</div>
            </div>
            <button
              className="qbtn"
              onClick={() => setState({ modalOpen: 'addGoal', addGoalReturnTo: 'custom' })}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s' }}
            >
              <Icon name="edit" size={15} />
              {isGoalUnset ? '목표 설정' : '목표 수정'}
            </button>
          </div>
          {goalError ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>목표를 불러오지 못했어요: {goalError.message}</div>
          ) : isGoalPending ? (
            // 로딩과 "목표 미설정"을 반드시 구분한다 — 목표를 저장하고 돌아오면 쿼리가 무효화되어
            // 다시 로딩 상태가 되는데, 그 순간 "아직 목표를 설정하지 않았어요"가 뜨면 방금 한 저장이
            // 실패한 것처럼 보인다.
            <div aria-busy style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>불러오는 중…</div>
          ) : isGoalUnset ? (
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>
              아직 목표를 설정하지 않았어요. 목표를 설정하면 연간·월간 진행률을 여기서 볼 수 있어요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {goalRows.map((ag) => (
                <div key={ag.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ag.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ag.color }}>{ag.pct}%</div>
                  </div>
                  <div style={{ height: 7, background: 'var(--track)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${ag.barPct}%`, background: ag.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                    {ag.currentFmt} / {ag.targetFmt}원
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{ag.subCaption}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>D-Day 알림</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
              {settingsData ? `예적금 만기 ${settingsData.ddayNotifyDays}일 전` : '예적금 만기 알림'}
            </div>
            {patchDday.error && <div style={ERROR_STYLE}>{patchDday.error.message}</div>}
          </div>
          {settingsData ? (
            <Switch
              label="D-Day 알림"
              checked={settings.ddayNotifyEnabled}
              disabled={controlsDisabled || patchDday.isPending}
              onChange={(next) => patchDday.mutate({ ddayNotifyEnabled: next })}
            />
          ) : (
            <span style={VALUE_PILL_STYLE}>—</span>
          )}
        </div>
      </div>
    </Modal>
  )
}
