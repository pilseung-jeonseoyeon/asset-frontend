// Source: secret/Asset Manager v14.dc.html L1517-1556 (자산 카테고리 계좌 목록 모달) — transcribed
// verbatim. Gated by `state.assetCat !== null` (a dedicated state field), NOT `state.modalOpen` like
// the other 13 modalXxx — matches source's own `hasAssetCat`/`closeAssetCat` pattern (L4491-4492).
// z-index 80, width 500px, maxHeight 86vh.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { assetCats } from '../../../data/mockAssets'

export function AssetCategoryModal() {
  const { state, setState } = useAppState()
  const selectedAssetCat = assetCats.find((c) => c.id === state.assetCat) || null

  if (!selectedAssetCat) return null

  const closeAssetCat = () => setState({ assetCat: null })

  return (
    <Modal onClose={closeAssetCat} zIndex={80} width={500} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--track)', color: selectedAssetCat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={selectedAssetCat.icon} size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{selectedAssetCat.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
              총 {selectedAssetCat.totalFmt}원 · 계좌 {selectedAssetCat.count}개
            </div>
          </div>
        </div>
        <button
          onClick={closeAssetCat}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedAssetCat.accounts.map((ca) => (
          <div
            key={ca.name + ca.inst}
            className="mini-hov"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ca.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{ca.inst}</div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{ca.amtFmt}원</div>
            <button
              onClick={() => setState((st) => ({ editAccount: { name: ca.name, inst: ca.inst, amtFmt: ca.amtFmt }, modalOpen: 'editAccount', dd: { ...st.dd, editAcctInst: ca.inst } }))}
              title="계좌 수정"
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}
            >
              <Icon name="edit" size={16} color="var(--text-mid)" />
            </button>
          </div>
        ))}
        <button
          className="qbtn"
          onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: null })}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginTop: 14, transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          계좌 추가
        </button>
      </div>
    </Modal>
  )
}
