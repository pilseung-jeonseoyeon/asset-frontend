// Source: secret/Asset Manager v14.dc.html L2112-2143 (modalInstitutions) + L3976-3983
// (institutionsAll — matches the Dashboard "주요 자산 보관처" 4 items plus 키움증권/토스증권) —
// transcribed verbatim. z-index 80, width 440px, maxHeight 86vh. Uses the BankIcon primitive
// (tokenKey lookup) instead of duplicating each glyph's raw SVG path — same rendered output.

import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'

const INSTITUTIONS_ALL = [
  { tokenKey: 'mirae', name: '미래에셋증권', amountFmt: '411,210,000' },
  { tokenKey: 'kakaobank', name: '카카오뱅크', amountFmt: '175,800,000' },
  { tokenKey: 'shinhan', name: '신한은행', amountFmt: '157,080,000' },
  { tokenKey: 'upbit', name: '업비트', amountFmt: '141,295,000' },
  { tokenKey: 'kiwoom', name: '키움증권', amountFmt: '87,590,000' },
  { tokenKey: 'tosssec', name: '토스증권', amountFmt: '15,000,000' },
]

export function InstitutionsModal() {
  const { state } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'institutions') return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="account_balance" title="주요 자산 보관처" onClose={closeModal} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {INSTITUTIONS_ALL.map((inst) => (
          <div
            key={inst.tokenKey}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BankIcon tokenKey={inst.tokenKey} size={32} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{inst.name}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.02em' }}>
              {inst.amountFmt}
              <span style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 600 }}>원</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
