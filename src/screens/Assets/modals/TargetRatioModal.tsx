// Source: secret/Asset Manager v14.dc.html L1559-1602 (modalTargetRatio) — transcribed verbatim.
// z-index 80, width 540px, maxHeight 86vh. Note: `openTargetRatio` (L4508) is never referenced by any
// button in the markup (confirmed via grep) — this modal is real source code but has no reachable UI
// trigger anywhere in the prototype. Built as-is; no button invented to open it.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'

interface RatioRow {
  name: string
  current: number
  target: number
  color: string
}

const RATIO_ROWS: RatioRow[] = [
  { name: '현금', current: 13, target: 15, color: 'var(--accent)' },
  { name: '예적금', current: 24, target: 20, color: 'var(--accent)' },
  { name: '국내주식', current: 22, target: 25, color: 'var(--accent)' },
  { name: '해외주식', current: 18, target: 20, color: 'var(--accent)' },
  { name: '가상자산', current: 11, target: 10, color: 'var(--accent)' },
  { name: '연금·기타', current: 12, target: 10, color: 'var(--accent)' },
]

export function TargetRatioModal() {
  const { state } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'targetRatio') return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="tune" title="포트폴리오 목표 비율 설정" onClose={closeModal} />
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 14 }}>합계가 100%가 되도록 목표 비율을 입력하세요</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {RATIO_ROWS.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)' }}>
            <div style={{ width: 72, fontSize: 13, fontWeight: 700, flex: 'none' }}>{r.name}</div>
            <div style={{ flex: 1, height: 7, background: 'var(--track)', borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${r.current}%`, background: r.color, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 58, textAlign: 'right', flex: 'none' }}>현재 {r.current}%</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '0.5px solid var(--border)', borderRadius: 10, padding: '7px 10px', flex: 'none' }}>
              <input
                defaultValue={r.target}
                style={{ width: 26, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textAlign: 'right', color: 'var(--text-strong)' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>%</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '7px 12px', borderRadius: 8 }}>
          <Icon name="check_circle" size={16} />
          합계 100%
        </span>
        <button
          onClick={closeModal}
          className="qbtn"
          style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          목표 비율 저장
        </button>
      </div>
    </Modal>
  )
}
