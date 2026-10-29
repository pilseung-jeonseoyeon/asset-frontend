// 상단 '개인 | {공유 화면 이름}' 전환(가족·커플 공유 v17 시안). 대시보드 · 자산 · 주식 · 가계부에서만 보인다.
// 연결 전에는 두 번째 칸이 '공유'이고, 누르면 안내 팝오버([구성원 초대] → 설정 › 가족 · 커플 공유의 초대 코드)가 뜬다.
// 범위 판정·저장은 utils/viewScope.ts. 데스크톱은 머리글 오른쪽, 모바일은 머리글 아래 한 줄(Header가 배치).

import type { CSSProperties, MouseEvent } from 'react'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'
import { useViewScope } from '../../utils/viewScope'

function tabStyle(active: boolean, full: boolean): CSSProperties {
  return {
    padding: '8px 16px', minHeight: 34, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: full ? undefined : 140, flex: full ? 1 : undefined,
    background: active ? 'var(--seg-active)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)',
  }
}

export function ScopeSegment({ fullWidth = false }: { fullWidth?: boolean }) {
  const { state, setState } = useAppState()
  const { scope, linked, sharedTabLabel, setScope } = useViewScope()
  const stop = (e: MouseEvent) => e.stopPropagation()

  const onShared = () => {
    if (linked) setScope('SHARED')
    else setState((prev) => ({ scopeHintOpen: !prev.scopeHintOpen, quickAddOpen: false, notificationOpen: false }))
  }

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : undefined }}>
      <div
        role="tablist"
        aria-label="보기 범위"
        style={{ display: 'flex', alignItems: 'center', height: 42, boxSizing: 'border-box', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2 }}
      >
        <button type="button" role="tab" aria-selected={scope === 'PERSONAL'} onClick={() => setScope('PERSONAL')} style={tabStyle(scope === 'PERSONAL', fullWidth)}>
          개인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'SHARED'}
          aria-expanded={linked ? undefined : state.scopeHintOpen}
          onClick={onShared}
          title={sharedTabLabel}
          style={tabStyle(scope === 'SHARED', fullWidth)}
        >
          {sharedTabLabel}
        </button>
      </div>
      {state.scopeHintOpen && !linked && (
        <div
          onClick={stop}
          role="dialog"
          aria-label="함께 보는 공유 화면"
          style={{
            position: 'absolute', top: 50, right: 0, width: 290, maxWidth: 'calc(100vw - 32px)', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 18, zIndex: 60, boxSizing: 'border-box',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="group" size={18} />
          </span>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>함께 보는 공유 화면</div>
          <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6, marginTop: 6 }}>
            구성원을 초대하고 공유할 계좌를 고르면, 이 탭에서 두 사람이 공유한 계좌를 합산해서 보여드려요. 탭 이름은 '우리집'이나 상대 이름처럼 원하는 이름으로 정할 수 있어요.
          </div>
          <button
            type="button"
            className="qbtn"
            onClick={() => setState({ scopeHintOpen: false, openModal: 'familyShare', shareFlowStep: 'invite' })}
            style={{ marginTop: 14, width: '100%', padding: 11, minHeight: 44, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <Icon name="person_add" size={16} />
            구성원 초대
          </button>
        </div>
      )}
    </div>
  )
}
