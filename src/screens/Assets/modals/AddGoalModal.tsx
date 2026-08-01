// Source: secret/Asset Manager v14.dc.html L1990-2069 (modalAddGoal) — transcribed verbatim.
// z-index 80, width 440px, maxHeight 86vh. closeGoalModal returns to `addGoalReturnTo` (whatever
// screen/modal opened it — Dashboard passes null, Settings' CustomModal passes 'custom'), same
// return-to pattern as closeAddAccount.

import type { FormEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useDatePicker } from '../../../state/selectors/datePicker'

function filterAmountInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  const v = target.value.replace(/[^0-9]/g, '')
  target.value = v ? Number(v).toLocaleString('ko-KR') : ''
}

export function AddGoalModal() {
  const { state, setState } = useAppState()
  const ddGoalDate = useDatePicker('goal', '2026.12.31', { y: 2026, m: 12 })

  if (state.modalOpen !== 'addGoal') return null

  const closeGoalModal = () => setState((st) => ({ modalOpen: st.addGoalReturnTo, addGoalReturnTo: null }))

  return (
    <Modal onClose={closeGoalModal} zIndex={80} width={440}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="flag" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>자산 목표 설정</div>
        </div>
        <button
          onClick={closeGoalModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>연간 목표 자산</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" defaultValue="1,302,500,000" onInput={filterAmountInput}
              style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>목표 시점</div>
          <DatePicker dp={ddGoalDate} />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>월평균 수입</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" defaultValue="8,500,000" onInput={filterAmountInput}
              style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>가계부 최근 3개월 평균이 자동 입력돼요 · 직접 수정할 수 있어요</div>
        </div>
        <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            <span>월 필요 저축액</span>
            <span>3,000,000원</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
            <span>월 지출 가능액</span>
            <span>5,500,000원</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 8 }}>투자 수익은 반영하지 않은 계산이에요</div>
        </div>
        <button
          onClick={closeGoalModal}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          목표 저장
        </button>
      </div>
    </Modal>
  )
}
