// Source: secret/Asset Manager v14.dc.html L3309-3399 (modalCustom) — transcribed verbatim.
// z-index 80, width 540px, maxHeight 86vh. D-Day toggle has no onClick in source (non-functional).
// ddMonthStart reads/writes the dedicated `monthStartDay` state field directly (NOT the generic
// dd-keyed dropdown pattern useDropdown wraps) — implemented inline to match L3345-3357 exactly.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { assetGoals } from '../../../data/mockDashboard'

const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}
const TOGGLE_ON_STYLE: CSSProperties = { width: 42, height: 24, background: 'var(--accent)', borderRadius: 8, position: 'relative', cursor: 'pointer' }
const TOGGLE_KNOB_STYLE: CSSProperties = { position: 'absolute', top: 2, right: 2, width: 20, height: 20, background: 'var(--surface)', borderRadius: 999 }

const MONTH_START_DAYS = Array.from({ length: 31 }, (_, i) => i + 1 + '일')

export function CustomModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'custom') return null

  const ddMonthStart = {
    value: state.monthStartDay,
    open: state.openDropdown === 'monthStart',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'monthStart' ? null : 'monthStart' })),
    options: MONTH_START_DAYS.map((d) => ({ name: d, pick: () => setState({ monthStartDay: d, openDropdown: null }) })),
  }

  return (
    <Modal onClose={closeModal} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="dashboard_customize" title="자산 · 가계부 맞춤 설정" onClose={closeModal} />
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
              목표 수정
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {assetGoals.map((ag) => (
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>D-Day 알림</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>예적금 만기 30일 전</div>
          </div>
          <div style={TOGGLE_ON_STYLE}>
            <span style={TOGGLE_KNOB_STYLE} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
