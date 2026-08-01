// Source: secret/Asset Manager v14.dc.html L1455-1515 (modalEditAccount) — transcribed verbatim.
// z-index 90, width 480px, maxHeight 90vh, padding "42px 30px" (NOT the default 30px — confirmed
// per-instance). Note inputs use defaultValue (uncontrolled), matching source's own uncontrolled inputs.

import type { FormEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useDropdown } from '../../../state/selectors/dropdown'

function filterAmountInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  const v = target.value.replace(/[^0-9]/g, '')
  target.value = v ? Number(v).toLocaleString('ko-KR') : ''
}

const BANK_OPTIONS = ['신한은행', '카카오뱅크', '미래에셋증권', '업비트', '기타']

export function EditAccountModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const editingAccount = state.editAccount as { name: string; inst: string; amtFmt: string } | null
  const ddEditAcctInst = useDropdown('editAcctInst', BANK_OPTIONS, editingAccount?.inst || '신한은행')

  if (state.modalOpen !== 'editAccount' || !editingAccount) return null

  return (
    <Modal onClose={closeModal} zIndex={90} width={480} panelStyle={{ padding: '42px 30px', maxHeight: '90vh' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="edit" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 수정</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{editingAccount.name}</div>
          </div>
        </div>
        <button
          onClick={closeModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>계좌 이름</div>
          <input
            type="text" defaultValue={editingAccount.name}
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>금융기관</div>
            <Dropdown dd={ddEditAcctInst} maxHeight={160} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>현재 잔액</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" defaultValue={editingAccount.amtFmt} onInput={filterAmountInput}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={closeModal}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          변경사항 저장
        </button>
      </div>
    </Modal>
  )
}
