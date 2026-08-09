// Source: secret/Asset Manager v14.dc.html L2112-2143 (modalInstitutions) + L3976-3983
// (institutionsAll) — read-only list transcribed verbatim, then extended with 추가/수정/삭제 (원본
// 프로토타입엔 없던 CRUD — 이 저장소 자체 요구사항). z-index 80, width 440px, maxHeight 86vh. Uses the
// BankIcon primitive (tokenKey lookup) instead of duplicating each glyph's raw SVG path.
//
// 목록은 GET /assets/distribution?groupBy=INSTITUTION(금액)과 GET /institutions(아이콘 키)를
// institutionId로 조인해 만든다 — "관리" 목적이라 보유 자산이 0인(distribution에 안 잡히는) 기관도
// 전부 보여준다(금액 없는 기관은 0원으로 표기).
//
// icon 필드는 서버가 어떤 값 집합을 받는지 스펙에 없어 자유 입력을 막고, 프론트가 아는
// src/design/bank-institutions.ts의 tokenKey 중에서만 고르게 한다. color는 그 파일에 매핑되는 hex
// 값이 없어(마스터 테이블은 CSS 커스텀 프로퍼티로만 존재) 보내지 않는다 — 백엔드와 확인이 필요한
// 부분(보고 참고).

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { fmt } from '../../../utils/format'
import { INSTITUTION_TYPE_LABELS, INSTITUTION_TYPE_ORDER } from '../../../data/assetsView'
import { BANK_INSTITUTIONS } from '../../../design/bank-institutions'
import { ApiError } from '@/services/api'
import { useGetAssetDistributionByInstitution } from '@/services/asset'
import { useDeleteInstitution, useGetInstitutions, usePatchInstitution, usePostInstitution } from '@/services/institution'
import type { CreateInstitutionRequest } from '@/services/institution'
import type { InstitutionForm } from '../../../state/types'

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 13px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

export function InstitutionsModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'institutions'
  const form = state.institutionForm

  const distribution = useGetAssetDistributionByInstitution({ enabled: isOpen })
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const postInstitution = usePostInstitution()
  const patchInstitution = usePatchInstitution()
  const deleteInstitution = useDeleteInstitution()
  const [nameInvalid, setNameInvalid] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  if (!isOpen) return null

  const closeModal = () => {
    setDeleteConfirmId(null)
    setState({ modalOpen: null, institutionForm: null })
  }

  const institutions = institutionsQuery.data ?? []
  const rows = institutions
    .map((inst) => {
      const distRow = distribution.groups.find((g) => g.institutionId === inst.id)
      return {
        institutionId: inst.id,
        name: inst.name,
        type: inst.type,
        tokenKey: inst.icon ?? '',
        totalValueKrw: distRow?.totalValueKrw ?? 0,
        hasActiveAccounts: (distRow?.accounts.length ?? 0) > 0,
      }
    })
    .sort((a, b) => b.totalValueKrw - a.totalValueKrw)

  const openAdd = () => {
    setNameInvalid(false)
    setDeleteConfirmId(null)
    postInstitution.reset()
    patchInstitution.reset()
    setState({ institutionForm: { id: null, name: '', type: 'BANK', icon: null } })
  }
  const openEdit = (row: (typeof rows)[number]) => {
    setNameInvalid(false)
    setDeleteConfirmId(null)
    postInstitution.reset()
    patchInstitution.reset()
    setState({ institutionForm: { id: row.institutionId, name: row.name, type: row.type, icon: row.tokenKey || null } })
  }
  const backToList = () => {
    setNameInvalid(false)
    setState({ institutionForm: null })
  }

  const patchForm = (patch: Partial<InstitutionForm>) =>
    setState((st) => ({ institutionForm: st.institutionForm ? { ...st.institutionForm, ...patch } : st.institutionForm }))

  // 서버가 아이콘 제거를 지원하지 않는다 — PATCH에서 icon 키를 생략해도, icon: null을 명시해도
  // 기존 아이콘이 그대로 유지된다(실제 서버로 확인). 그래서 이미 아이콘이 있는 기관을 수정할 때는
  // "선택 안 함"이 동작하는 것처럼 보이면 안 된다(저장은 성공하는데 아이콘은 그대로라 사용자가 오해함).
  const editingInstitutionHasIcon =
    form?.id != null && !!institutions.find((i) => i.id === form.id)?.icon

  const submitError = postInstitution.error ?? patchInstitution.error
  const isDuplicateName = submitError instanceof ApiError && submitError.code === 'INSTITUTION_DUPLICATE_NAME'
  const isSubmitting = postInstitution.isPending || patchInstitution.isPending

  const handleSubmit = () => {
    if (!form) return
    if (!form.name.trim()) {
      setNameInvalid(true)
      return
    }
    setNameInvalid(false)

    const body: CreateInstitutionRequest = {
      name: form.name.trim(),
      type: form.type,
      ...(form.icon ? { icon: form.icon } : {}),
    }

    if (form.id === null) {
      postInstitution.mutate(body, { onSuccess: backToList })
    } else {
      patchInstitution.mutate({ id: form.id, body }, { onSuccess: backToList })
    }
  }

  const openDeleteConfirm = (institutionId: number) => {
    deleteInstitution.reset()
    setDeleteConfirmId(institutionId)
  }
  const handleDelete = (institutionId: number) => {
    deleteInstitution.mutate(institutionId, { onSuccess: () => setDeleteConfirmId(null) })
  }
  const isInstitutionInUse =
    deleteInstitution.error instanceof ApiError && deleteInstitution.error.code === 'INSTITUTION_HAS_ACTIVE_ACCOUNTS'

  return (
    <Modal onClose={closeModal} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {form === null ? (
        <>
          <ModalHeader icon="account_balance" title="금융기관 관리" onClose={closeModal} />
          {distribution.isPending || institutionsQuery.isPending ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : distribution.error || institutionsQuery.error ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>
              {(distribution.error ?? institutionsQuery.error)?.message}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.length === 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 금융기관이 없어요.</div>
                )}
                {rows.map((inst) => (
                  <div key={inst.institutionId}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <BankIcon tokenKey={inst.tokenKey} size={32} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inst.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.02em', textAlign: 'right' }}>
                          {inst.totalValueKrw > 0 ? (
                            <>
                              {fmt(inst.totalValueKrw)}
                              <span style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 600 }}>원</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 600 }}>0원</span>
                          )}
                        </div>
                        <button
                          onClick={() => openEdit(inst)}
                          title="기관 수정"
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Icon name="edit" size={14} color="var(--text-mid)" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(inst.institutionId)}
                          title={inst.hasActiveAccounts ? '이 기관에 계좌가 남아 있어요' : '기관 삭제'}
                          disabled={inst.hasActiveAccounts}
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inst.hasActiveAccounts ? 'not-allowed' : 'pointer', opacity: inst.hasActiveAccounts ? 0.45 : 1 }}
                        >
                          <Icon name="delete" size={14} color="var(--exp-text)" />
                        </button>
                      </div>
                    </div>
                    {!inst.hasActiveAccounts && deleteConfirmId === inst.institutionId && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--fill-subtle)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>'{inst.name}' 기관을 삭제할까요?</div>
                        {deleteInstitution.error && (
                          <div style={{ fontSize: 11.5, color: 'var(--down)' }}>
                            {isInstitutionInUse ? '이 기관에 계좌가 남아 있어요' : deleteInstitution.error.message}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleDelete(inst.institutionId)}
                            disabled={deleteInstitution.isPending}
                            aria-busy={deleteInstitution.isPending}
                            className="qbtn"
                            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: deleteInstitution.isPending ? 'default' : 'pointer', opacity: deleteInstitution.isPending ? 0.7 : 1 }}
                          >
                            {deleteInstitution.isPending ? '삭제 중…' : '삭제할게요'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="qbtn"
                            style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={openAdd}
                className="qbtn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 13, borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginTop: 14, transition: 'transform .12s', fontFamily: 'inherit' }}
              >
                <Icon name="add" size={16} />
                기관 추가
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
            <button
              onClick={backToList}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="arrow_back" size={19} color="var(--text-mid)" />
            </button>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{form.id === null ? '기관 추가' : '기관 수정'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={LABEL_STYLE}>기관 이름</div>
              <input
                type="text" placeholder="예: 토스뱅크"
                value={form.name}
                onChange={(e) => {
                  patchForm({ name: e.target.value })
                  if (nameInvalid) setNameInvalid(false)
                }}
                style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
              />
              {nameInvalid && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>기관 이름을 입력해주세요</div>}
              {isDuplicateName && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>이미 등록된 기관 이름이에요</div>}
            </div>
            <div>
              <div style={LABEL_STYLE}>기관 유형</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INSTITUTION_TYPE_ORDER.map((t) => (
                  <button key={t} className="mini-hov" onClick={() => patchForm({ type: t })} style={chipStyle(form.type === t)}>
                    {INSTITUTION_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={LABEL_STYLE}>아이콘 (선택)</div>
              {editingInstitutionHasIcon && (
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 8 }}>
                  다른 아이콘으로 바꿀 수는 있지만, 아이콘 제거는 아직 지원되지 않아요.
                </div>
              )}
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 10, maxHeight: 170, overflow: 'auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    onClick={() => patchForm({ icon: null })}
                    disabled={editingInstitutionHasIcon}
                    title={editingInstitutionHasIcon ? '아이콘 제거는 아직 지원되지 않아요' : '아이콘 선택 안 함'}
                    className="mini-hov"
                    style={{
                      width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: editingInstitutionHasIcon ? 'default' : 'pointer',
                      opacity: editingInstitutionHasIcon ? 0.4 : 1,
                      background: 'var(--fill-subtle)', border: form.icon === null ? '2px solid var(--accent)' : '0.5px solid var(--border)',
                    }}
                  >
                    <Icon name="close" size={16} color="var(--text-weak)" />
                  </button>
                  {BANK_INSTITUTIONS.map((b) => (
                    <button
                      key={b.tokenKey}
                      onClick={() => patchForm({ icon: b.tokenKey })}
                      title={b.name}
                      className="mini-hov"
                      style={{ padding: 0, border: form.icon === b.tokenKey ? '2px solid var(--accent)' : 'none', borderRadius: 10, cursor: 'pointer', background: 'transparent', lineHeight: 0 }}
                    >
                      <BankIcon tokenKey={b.tokenKey} size={36} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {submitError && !isDuplicateName && (
              <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{submitError.message}</div>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="qbtn"
              style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isSubmitting ? 'default' : 'pointer', opacity: isSubmitting ? 0.7 : 1, transition: 'transform .12s' }}
            >
              {isSubmitting ? '저장 중…' : form.id === null ? '기관 추가' : '변경사항 저장'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
