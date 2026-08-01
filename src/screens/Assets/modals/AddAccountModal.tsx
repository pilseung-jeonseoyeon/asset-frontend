// Source: secret/Asset Manager v14.dc.html L1379-1452 (modalAddAccount) — transcribed verbatim.
// z-index 90 (NOT 80 — confirmed per-instance, this modal can be opened from within another modal via
// openAddAccountFrom{Entry,Stock,Recur}, hence the higher stacking). closeAddAccount returns to
// `addAccountReturnTo` (whatever modal opened this one) instead of just closing (L4513).

import type { CSSProperties, FormEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { useAppState } from '../../../state/AppStateContext'
import { useDropdown } from '../../../state/selectors/dropdown'

function filterAmountInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  const v = target.value.replace(/[^0-9]/g, '')
  target.value = v ? Number(v).toLocaleString('ko-KR') : ''
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const BANK_OPTIONS = ['신한은행', '카카오뱅크', '미래에셋증권', '업비트', '기타']
const ASSET_TYPE_NAMES = ['현금', '예적금', '국내주식', '해외주식', '가상자산', '연금·기타']

export function AddAccountModal() {
  const { state, setState } = useAppState()
  const ddAddAcctInst = useDropdown('addAcctInst', BANK_OPTIONS, '신한은행')

  if (state.modalOpen !== 'addAccount') return null

  const closeAddAccount = () => setState((st) => ({ modalOpen: st.addAccountReturnTo, addAccountReturnTo: null }))

  return (
    <Modal onClose={closeAddAccount} zIndex={90} width={480} panelStyle={{ maxHeight: '90vh' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="account_balance" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 추가</div>
        </div>
        <button
          onClick={closeAddAccount}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>자산 유형</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ASSET_TYPE_NAMES.map((n) => (
              <button key={n} className="mini-hov" onClick={() => setState({ assetTypeSel: n })} style={chipStyle(state.assetTypeSel === n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>계좌 이름</div>
          <input
            type="text" placeholder="예: 파킹통장"
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>금융기관</div>
            <Dropdown dd={ddAddAcctInst} maxHeight={220} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>현재 잔액</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
              <input
                type="text" placeholder="0" onInput={filterAmountInput}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>유동성 여부</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['유동성 있음', '유동성 없음'] as const).map((n) => {
              const val = n === '유동성 있음' ? 'liquid' : 'locked'
              return (
                <button key={n} className="mini-hov" onClick={() => setState({ liquiditySel: val })} style={chipStyle(state.liquiditySel === val)}>
                  {n}
                </button>
              )
            })}
          </div>
        </div>
        <button
          onClick={closeAddAccount}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          계좌 추가
        </button>
      </div>
    </Modal>
  )
}
