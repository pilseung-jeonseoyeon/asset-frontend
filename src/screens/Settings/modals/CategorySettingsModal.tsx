// Source: secret/Asset Manager v14.dc.html L3402-3470 (modalCategorySettings) — transcribed verbatim.
// z-index 80, width 560px, maxHeight 86vh. catGroups computation from L4156-4197 — 구분(수입/저축/지출)
// and 대분류 are fixed; only 소분류 can be added/removed per major, keyed by `${구분}|${major}` in
// state.addingCatGroup (matches source's own key scheme exactly).

import type { KeyboardEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'

const CAT_META: { key: '수입' | '저축' | '지출'; dot: string; color: string }[] = [
  { key: '수입', dot: 'var(--inc-fill)', color: 'var(--inc-text)' },
  { key: '저축', dot: 'var(--sav-fill)', color: 'var(--sav-text)' },
  { key: '지출', dot: 'var(--exp-fill)', color: 'var(--exp-text)' },
]

export function CategorySettingsModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'categorySettings') return null

  const catGroups = CAT_META.map((m) => ({
    name: m.key,
    dot: m.dot,
    color: m.color,
    count: state.customCats[m.key].length,
    majors: state.customCats[m.key].map((mj, mi) => {
      const akey = m.key + '|' + mj.major
      return {
        major: mj.major,
        adding: state.addingCatGroup === akey,
        notAdding: state.addingCatGroup !== akey,
        startAdd: () => setState({ addingCatGroup: akey }),
        cancelAdd: () => setState({ addingCatGroup: null }),
        onKey: (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value.trim()
            if (v) {
              setState((st) => ({
                customCats: {
                  ...st.customCats,
                  [m.key]: st.customCats[m.key].map((x, xi) => (xi === mi ? { ...x, subs: [...x.subs, v] } : x)),
                },
                addingCatGroup: null,
              }))
            }
          } else if (e.key === 'Escape') {
            setState({ addingCatGroup: null })
          }
        },
        items: mj.subs.map((n, i) => ({
          name: n,
          remove: () =>
            setState((st) => ({
              customCats: {
                ...st.customCats,
                [m.key]: st.customCats[m.key].map((x, xi) => (xi === mi ? { ...x, subs: x.subs.filter((_, j) => j !== i) } : x)),
              },
            })),
        })),
      }
    }),
  }))

  return (
    <Modal onClose={closeModal} zIndex={80} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <button
            onClick={() => setState({ modalOpen: 'custom' })}
            title="뒤로"
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="arrow_back" size={19} color="var(--text-mid)" />
          </button>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>카테고리 설정</div>
        </div>
        <button
          onClick={closeModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 16 }}>
        구분과 대분류는 고정 · 각 대분류에 속한 소분류만 자유롭게 추가·삭제할 수 있어요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {catGroups.map((cg) => (
          <div key={cg.name} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: 4, background: cg.dot, flex: 'none' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: cg.color }}>{cg.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-weak)', background: 'var(--fill-subtle)', padding: '2px 7px', borderRadius: 8 }}>
                구분 고정
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-weak)' }}>대분류 {cg.count}개</span>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '10px 0 6px', borderBottom: '0.5px solid var(--track)', fontSize: 10.5, fontWeight: 700, color: 'var(--text-weak)' }}>
              <div style={{ width: 76, flex: 'none' }}>대분류</div>
              <div style={{ flex: 1 }}>소분류</div>
            </div>
            {cg.majors.map((mj) => (
              <div key={mj.major} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--fill-subtle)' }}>
                <div style={{ width: 76, flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-strong)', paddingTop: 5 }}>{mj.major}</div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mj.items.map((ci) => (
                    <span
                      key={ci.name}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--track)', padding: '5px 10px', borderRadius: 8 }}
                    >
                      {ci.name}
                      <span className="ms" onClick={ci.remove} style={{ fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer' }}>
                        close
                      </span>
                    </span>
                  ))}
                  {mj.adding && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '0.5px solid var(--accent)', borderRadius: 8, padding: '0 8px 0 9px', background: 'var(--surface)' }}>
                      <input
                        autoFocus
                        placeholder="소분류 입력 후 Enter"
                        onKeyDown={mj.onKey}
                        style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-strong)', border: 'none', outline: 'none', fontFamily: 'inherit', width: 104, padding: '5px 0', background: 'transparent' }}
                      />
                      <span className="ms" onClick={mj.cancelAdd} title="취소" style={{ fontSize: 13, color: 'var(--text-weak)', cursor: 'pointer' }}>
                        close
                      </span>
                    </span>
                  )}
                  {mj.notAdding && (
                    <button
                      className="mini-hov"
                      onClick={mj.startAdd}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Icon name="add" size={13} />
                      추가
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
