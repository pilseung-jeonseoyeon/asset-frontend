// Source: secret/Asset Manager v14.dc.html L3251-3306 (modalData) — transcribed verbatim.
// z-index 80, width 540px, maxHeight 86vh. None of the 4 action buttons have an onClick in the source —
// purely visual/non-functional, ported as-is.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'

interface DataAction {
  icon: string
  title: string
  desc: string
  danger?: boolean
}

const ACTIONS: DataAction[] = [
  { icon: 'download', title: '엑셀 · CSV 가져오기', desc: '타 가계부 기록 한번에 이관' },
  { icon: 'upload', title: '전체 내역 내보내기', desc: 'XLSX · CSV 형식' },
  { icon: 'cloud_sync', title: '로컬 DB 백업 · 복원', desc: '최근 백업 2026.06.28' },
  { icon: 'delete_forever', title: '데이터 초기화', desc: '모든 기록 영구 삭제', danger: true },
]

const ROW_BASE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'transform .12s',
}

export function DataModal() {
  const { state } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'data') return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="database" title="데이터 관리 및 백업" onClose={closeModal} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACTIONS.map((a) => (
          <button
            key={a.title}
            className="qbtn"
            style={{
              ...ROW_BASE_STYLE,
              border: a.danger ? '0.5px solid var(--down-chip)' : '0.5px solid var(--border)',
              background: a.danger ? 'var(--down-chip)' : 'var(--surface)',
            }}
          >
            <span
              style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                background: a.danger ? 'var(--down-chip)' : 'var(--accent-soft)',
                color: a.danger ? 'var(--down)' : 'var(--accent)',
              }}
            >
              <Icon name={a.icon} size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: a.danger ? 'var(--down)' : undefined }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{a.desc}</div>
            </div>
            <Icon name="chevron_right" size={18} color="var(--text-weak)" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
