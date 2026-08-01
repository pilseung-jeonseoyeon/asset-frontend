// Source: secret/Asset Manager v14.dc.html L3187-3248 (modalGeneral) — transcribed verbatim.
// z-index 80, width 540px, maxHeight 86vh. "기준 통화" row and both toggle switches have NO onClick in
// the source (no handler, no state binding) — purely decorative/non-functional, ported as-is (not made
// interactive) per extraction discipline.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'

function themeBtn(active: boolean): CSSProperties {
  return {
    fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 8,
    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--seg-active)' : 'transparent',
    color: active ? 'var(--text-strong)' : 'var(--text-weak)',
    boxShadow: 'none',
  }
}

const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}

const TOGGLE_ON_STYLE: CSSProperties = { width: 42, height: 24, background: 'var(--accent)', borderRadius: 8, position: 'relative', cursor: 'pointer' }
const TOGGLE_KNOB_STYLE: CSSProperties = { position: 'absolute', top: 2, right: 2, width: 20, height: 20, background: 'var(--surface)', borderRadius: 999 }

export function GeneralModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'general') return null

  return (
    <Modal onClose={closeModal} zIndex={80} width={540} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="tune" title="일반 및 디스플레이" onClose={closeModal} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>테마 설정</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>라이트 · 다크 · 시스템</div>
          </div>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 3, gap: 2 }}>
            <button onClick={() => setState({ theme: 'light' })} style={themeBtn(state.theme === 'light')}>라이트</button>
            <button onClick={() => setState({ theme: 'dark' })} style={themeBtn(state.theme === 'dark')}>다크</button>
            <button onClick={() => setState({ theme: 'system' })} style={themeBtn(state.theme === 'system')}>시스템</button>
          </div>
        </div>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>기준 통화</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>원화 환산 기준</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8, cursor: 'pointer' }}>
            KRW ₩
            <Icon name="expand_more" size={16} color="var(--text-weak)" />
          </div>
        </div>
        <div style={ROW_STYLE}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>환율 자동 갱신</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>매일 09:00 기준</div>
          </div>
          <div style={TOGGLE_ON_STYLE}>
            <span style={TOGGLE_KNOB_STYLE} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>대시보드 레이아웃</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>A · B · C 중 기본값</div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: 8 }}>
            추후 업데이트
          </span>
        </div>
      </div>
    </Modal>
  )
}
