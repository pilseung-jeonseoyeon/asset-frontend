// Source: secret/Asset Manager v14.dc.html L2307-2366 (계좌 상세 드릴다운 모달, hasSelectedAccount) —
// transcribed verbatim. Gated by `state.accountDetail !== null` (a dedicated state field), NOT
// `state.modalOpen` — same non-modalXxx pattern as AssetCategoryModal. z-index 80, width 560px,
// maxHeight 86vh.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { accounts } from '../../../data/mockAccounts'
import { fmt } from '../../../utils/format'

export function AccountDetailModal() {
  const { state, setState } = useAppState()
  const selectedAccount = accounts.find((a) => a.id === state.accountDetail) || null

  if (!selectedAccount) return null

  const closeAccount = () => setState({ accountDetail: null })

  return (
    <Modal onClose={closeAccount} zIndex={80} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: selectedAccount.iconBg, color: selectedAccount.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={selectedAccount.icon} size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{selectedAccount.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{selectedAccount.sub}</div>
          </div>
        </div>
        <button
          onClick={closeAccount}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 4 }}>현재 잔액</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{fmt(selectedAccount.balance)}원</div>
        </div>
        {selectedAccount.badge && (
          <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 12px', borderRadius: 10, whiteSpace: 'nowrap', background: selectedAccount.badge.bg, color: selectedAccount.badge.fg }}>
            원금 대비 {selectedAccount.badge.text}
          </span>
        )}
      </div>

      <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 8 }}>최근 6개월 추이</div>
        <svg viewBox="0 0 100 44" style={{ width: '100%', height: 56, display: 'block' }} preserveAspectRatio="none">
          <path d={selectedAccount.trend} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>최근 거래내역</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedAccount.tx.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.date}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.desc}</div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: t.tagBg, color: t.tagColor }}>{t.tag}</span>
            <div style={{ fontSize: 13.5, fontWeight: 700, width: 110, textAlign: 'right', color: t.positive ? 'var(--inc-text)' : 'var(--exp-text)' }}>{t.amount}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
