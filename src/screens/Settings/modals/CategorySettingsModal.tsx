// 분류 설정 모달. z-index 80, 너비 560px, maxHeight 86vh.
//
// 대분류는 서버 시드 고정이라 API로 추가/삭제할 수 없다(category.type.ts 주석) — 이 모달에는
// 애초에 '대분류 추가' UI가 없어 별도로 비활성화할 대상이 없다. 소분류만 GET/POST/DELETE
// /categories로 다룬다. 삭제는 참조 무결성을 서버가 막지 않으므로(category.service.ts 주석)
// 클릭 즉시 지우지 않고 인라인 확인을 한 번 거친다.

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { CATEGORY_KIND_LABELS, CATEGORY_KIND_ORDER } from '../../../data/ledgerView'
import { ApiError } from '@/services/api'
import { useDeleteSubcategory, useGetCategories, usePostSubcategory } from '@/services/category'
import type { CategoryKind } from '@/services/common.type'

const KIND_META: Record<CategoryKind, { dot: string; color: string }> = {
  INCOME: { dot: 'var(--inc-fill)', color: 'var(--inc-text)' },
  SAVING: { dot: 'var(--sav-fill)', color: 'var(--sav-text)' },
  EXPENSE: { dot: 'var(--exp-fill)', color: 'var(--exp-text)' },
}

interface DeleteTarget {
  categoryId: number
  subcategoryId: number
  name: string
}

export function CategorySettingsModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const isOpen = state.openModal === 'categorySettings'

  const categoriesQuery = useGetCategories(undefined, { enabled: isOpen })
  const postSubcategory = usePostSubcategory()
  const deleteSubcategory = useDeleteSubcategory()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [addError, setAddError] = useState<{ categoryId: number; message: string } | null>(null)

  if (!isOpen) return null

  const categories = categoriesQuery.categories

  // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 확인 상태와
  // 입력창 상태를 직접 지우지 않으면, 삭제 확인 배너를 띄운 채 닫았을 때 다음에 모달을 열자마자
  // "삭제할게요" 버튼이 이미 떠 있게 된다(소분류 삭제는 되돌릴 수 없어 오조작 위험).
  const closeAndReset = () => {
    setDeleteTarget(null)
    setAddError(null)
    postSubcategory.reset()
    deleteSubcategory.reset()
    setState({ addingCategoryGroup: null })
    closeModal()
  }

  const backToCustom = () => {
    setDeleteTarget(null)
    setAddError(null)
    postSubcategory.reset()
    deleteSubcategory.reset()
    setState({ openModal: 'custom', addingCategoryGroup: null })
  }

  const startAdd = (key: string) => {
    setAddError(null)
    postSubcategory.reset()
    setState({ addingCategoryGroup: key })
  }
  const cancelAdd = () => {
    setAddError(null)
    setState({ addingCategoryGroup: null })
  }
  const submitAdd = (categoryId: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // Modal이 이제 document 레벨에서 Esc를 감지해 모달 전체를 닫는다(Modal.tsx 참고) — 여기서
      // stopPropagation을 안 하면 인라인 추가 입력만 취소하려던 Esc가 그대로 버블링돼 모달까지
      // 닫혀버린다.
      e.stopPropagation()
      cancelAdd()
      return
    }
    if (e.key !== 'Enter') return
    const value = (e.target as HTMLInputElement).value.trim()
    if (!value) return
    setAddError(null)
    postSubcategory.mutate(
      { categoryId, body: { name: value } },
      {
        onSuccess: () => setState({ addingCategoryGroup: null }),
        onError: (error) => {
          const message =
            error instanceof ApiError && error.code === 'SUBCATEGORY_DUPLICATE_NAME'
              ? '이미 있는 소분류 이름이에요'
              : error.message
          setAddError({ categoryId, message })
        },
      },
    )
  }

  const requestDelete = (categoryId: number, subcategoryId: number, name: string) => {
    deleteSubcategory.reset()
    setDeleteTarget({ categoryId, subcategoryId, name })
  }
  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteSubcategory.mutate(
      { categoryId: deleteTarget.categoryId, subcategoryId: deleteTarget.subcategoryId },
      { onSuccess: () => setDeleteTarget(null) },
    )
  }

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <button
            onClick={backToCustom}
            title="뒤로"
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="arrow_back" size={19} color="var(--text-mid)" />
          </button>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>카테고리 설정</div>
        </div>
        <button
          onClick={closeAndReset}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 16 }}>
        구분과 대분류는 고정 · 각 대분류에 속한 소분류만 자유롭게 추가·삭제할 수 있어요
      </div>

      {categoriesQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : categoriesQuery.error ? (
        <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{categoriesQuery.error.message}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {CATEGORY_KIND_ORDER.map((kind) => {
            const meta = KIND_META[kind]
            const majors = categories.filter((c) => c.kind === kind)
            return (
              <div key={kind} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: meta.dot, flex: 'none' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: meta.color }}>{CATEGORY_KIND_LABELS[kind]}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-weak)', background: 'var(--fill-subtle)', padding: '2px 7px', borderRadius: 8 }}>
                    구분 고정
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-weak)' }}>대분류 {majors.length}개</span>
                </div>
                {majors.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-weak)', padding: '10px 0 2px' }}>등록된 대분류가 없어요.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 12, padding: '10px 0 6px', borderBottom: '0.5px solid var(--track)', fontSize: 10.5, fontWeight: 700, color: 'var(--text-weak)' }}>
                      <div style={{ width: 76, flex: 'none' }}>대분류</div>
                      <div style={{ flex: 1 }}>소분류</div>
                    </div>
                    {majors.map((major) => {
                      const addingKey = `${kind}|${major.id}`
                      const adding = state.addingCategoryGroup === addingKey
                      return (
                        <div key={major.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--fill-subtle)' }}>
                          <div style={{ width: 76, flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-strong)', paddingTop: 5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {major.name}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {major.subcategories.map((subcategory) => (
                                <span
                                  key={subcategory.id}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', background: 'var(--track)', padding: '5px 10px', borderRadius: 8 }}
                                >
                                  {subcategory.name}
                                  <span
                                    className="ms"
                                    onClick={() => requestDelete(major.id, subcategory.id, subcategory.name)}
                                    style={{ fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer' }}
                                  >
                                    close
                                  </span>
                                </span>
                              ))}
                              {adding ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '0.5px solid var(--accent)', borderRadius: 8, padding: '0 8px 0 9px', background: 'var(--surface)' }}>
                                  <input
                                    autoFocus
                                    placeholder="소분류 입력 후 Enter"
                                    disabled={postSubcategory.isPending}
                                    onKeyDown={(e) => submitAdd(major.id, e)}
                                    style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-strong)', border: 'none', outline: 'none', fontFamily: 'inherit', width: 104, padding: '5px 0', background: 'transparent' }}
                                  />
                                  <span className="ms" onClick={cancelAdd} title="취소" style={{ fontSize: 13, color: 'var(--text-weak)', cursor: 'pointer' }}>
                                    close
                                  </span>
                                </span>
                              ) : (
                                <button
                                  className="mini-hov"
                                  onClick={() => startAdd(addingKey)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  <Icon name="add" size={13} />
                                  추가
                                </button>
                              )}
                            </div>
                            {adding && addError?.categoryId === major.id && (
                              <div style={{ fontSize: 11, color: 'var(--down)', marginTop: 6 }}>{addError.message}</div>
                            )}
                            {deleteTarget?.categoryId === major.id && (
                              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--fill-subtle)', borderRadius: 8, padding: 10 }}>
                                <div style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>
                                  '{deleteTarget.name}' 소분류를 삭제할까요? 이 소분류를 쓰는 거래·구독이 있어도 함께 삭제돼요.
                                </div>
                                {deleteSubcategory.error && (
                                  <div style={{ fontSize: 11, color: 'var(--down)' }}>{deleteSubcategory.error.message}</div>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={confirmDelete}
                                    disabled={deleteSubcategory.isPending}
                                    aria-busy={deleteSubcategory.isPending}
                                    className="qbtn"
                                    style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: deleteSubcategory.isPending ? 'default' : 'pointer', opacity: deleteSubcategory.isPending ? 0.7 : 1, fontFamily: 'inherit' }}
                                  >
                                    {deleteSubcategory.isPending ? '삭제 중…' : '삭제할게요'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="qbtn"
                                    style={{ flex: 1, padding: 8, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
