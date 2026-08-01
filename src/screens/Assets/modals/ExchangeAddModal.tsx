// Source: secret/Asset Manager v14.dc.html L1315-1376 (modalExchangeAdd) — transcribed verbatim.
// z-index 80, width 440px, maxHeight 86vh. Reuses the same `stockAcct` dropdown key as QuickStockModal
// (shared global dd state, matching source exactly — not a copy/paste bug).

import type { FormEvent } from 'react'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useDropdown } from '../../../state/selectors/dropdown'
import { acctOptions } from '../../../data/mockAccounts'

function filterDecimalInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  let v = target.value.replace(/[^0-9.]/g, '')
  const p = v.split('.')
  v = p[0] + (p.length > 1 ? '.' + p[1].slice(0, 2) : '')
  const [i, d] = v.split('.')
  target.value = (i ? Number(i).toLocaleString('ko-KR') : '') + (d !== undefined ? '.' + d : '')
}

export function ExchangeAddModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const ddStockAcct = useDropdown('stockAcct', acctOptions, '미래에셋 (국내)')

  if (state.modalOpen !== 'exchangeAdd') return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={440}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <ModalHeader icon="currency_exchange" title="환전 추가" onClose={closeModal} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>매수 금액 (USD)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>$</span>
              <input
                type="text" placeholder="0.00" onInput={filterDecimalInput}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>적용 환율</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
              <input
                type="text" placeholder="1,380.00" onInput={filterDecimalInput}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-weak)' }}>원</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>계좌</div>
          <Dropdown dd={ddStockAcct} maxHeight={180} />
        </div>
        <button
          onClick={closeModal}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          환전 기록 저장
        </button>
      </div>
    </Modal>
  )
}
