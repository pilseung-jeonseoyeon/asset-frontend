// Source: secret/Asset Manager v14.dc.html L1455-1515 (modalEditAccount) — layout transcribed verbatim,
// then wired to GET/PATCH/DELETE /accounts/{id} (previously uncontrolled/no-op — see git history).
// z-index 90, width 480px, maxHeight 90vh, padding "42px 30px" (NOT the default 30px — confirmed
// per-instance).
//
// GET /accounts/{id}(AccountResponse)에는 institutionId/interestRate/openedAt이 없다(institutionName만
// 내려온다) — institutionId는 GET /institutions 목록과 이름으로 조인해 역추적한다(기관명은 서버가
// DB 유니크로 보장하므로 안전한 조인). interestRate는 조회 자체가 불가능해 이 폼에서는 노출하지 않는다
// (현재 값을 모르는 채로 덮어쓰게 하는 건 사고 위험이 크다 — 백엔드에 GET 응답 보강이 필요한 항목).

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { fmt } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate } from '../../../utils/date'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER } from '../../../data/assetsView'
import { ApiError } from '@/services/api'
import { useGetInstitutions } from '@/services/institution'
import { useDeleteAccount, useGetAccount, usePatchAccount } from '@/services/account'
import type { UpdateAccountRequest } from '@/services/account'

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

export function EditAccountModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const accountId = state.editAccount
  const isOpen = state.modalOpen === 'editAccount' && accountId !== null
  const form = state.accountForm
  // AddAccountModal과 동일한 이유(좁은 폭에서 Dropdown 팝오버가 잘림)로 모바일에서 세로로 쌓는다.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const patchAccount = usePatchAccount()
  const deleteAccount = useDeleteAccount()
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  const account = accountQuery.data

  // 아래 두 훅(useEntityDropdown/useDatePicker)은 Rules of Hooks 때문에 조건부 return보다 먼저,
  // 매 렌더 동일한 순서로 호출해야 한다 — 폼 동기화 여부와 무관하게 항상 호출한다.
  const ddInstitution = useEntityDropdown(
    'editAcctInst',
    institutions,
    (i) => i.id,
    (i) => i.name,
    form.institutionId,
    (id) => setState((st) => ({ accountForm: { ...st.accountForm, institutionId: id } })),
  )
  const ddInstitutionDisplay = { ...ddInstitution, value: ddInstitution.value || '선택 안 함' }

  const dpMaturity = useDatePicker(
    'editAccountMaturity',
    form.maturityDate ? isoDateToDisplay(form.maturityDate) : '선택 안 함',
    isoDateToNav(form.maturityDate),
  )

  // 폼 초기값 채우기(예외적으로 허용 — docs/state-management.md "서버 데이터를 AppState로 복사하지
  // 말 것. 단, 폼 초기값을 채우는 것은 예외").
  //
  // 렌더 도중에 setState를 부르면 안 된다. 여기서의 setState는 상위 AppStateProvider의 useReducer를
  // dispatch하는 것이라 "Cannot update a component while rendering a different component" 경고가 나고
  // React가 루트 전체를 버리고 다시 렌더한다(실측 확인). 그래서 커밋 이후에 도는 useEffect로 옮겼다.
  //
  // 기관 목록이 아직 도착하지 않았으면 조인을 미룬다 — 빈 배열에서 이름을 찾으면 institutionId가
  // null로 굳어버리고, 그 시점에 form.id가 맞춰져 다시 조인할 기회가 사라진다.
  const patchReset = patchAccount.reset
  const deleteReset = deleteAccount.reset
  const institutionList = institutionsQuery.data
  const isInstitutionsReady = institutionsQuery.isSuccess

  useEffect(() => {
    if (!isOpen || !account || !isInstitutionsReady) return
    if (form.id === account.id) return

    const matchedInstitution = institutionList?.find((i) => i.name === account.institutionName)
    setState((st) => ({
      accountForm: {
        id: account.id,
        institutionId: matchedInstitution?.id ?? null,
        name: account.name,
        type: account.type,
        currency: account.currency,
        initialBalanceKrw: 0,
        interestRate: null,
        openedAt: null,
        maturityDate: account.maturityDate,
        isLiquid: account.isLiquid,
      },
      dpPicked: { ...st.dpPicked, editAccountMaturity: undefined },
      dpNav: { ...st.dpNav, editAccountMaturity: undefined },
      openDropdown: null,
    }))
    // 편집 대상이 바뀌었으니 이전 계좌의 해지 확인 상태와 실패 메시지를 물려주지 않는다.
    setCloseConfirmOpen(false)
    patchReset()
    deleteReset()
  }, [
    isOpen,
    account,
    isInstitutionsReady,
    institutionList,
    form.id,
    setState,
    patchReset,
    deleteReset,
  ])

  if (!isOpen) return null

  // 폼이 아직 이 계좌로 채워지기 전에는 이전 계좌 값이 보이지 않도록 로딩으로 취급한다.
  const isFormReady = !!account && form.id === account.id

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      editAccount: null,
      accountForm: BLANK_ACCOUNT_FORM,
      dpPicked: { ...st.dpPicked, editAccountMaturity: undefined },
      dpNav: { ...st.dpNav, editAccountMaturity: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다.
    // 로컬 확인 상태와 mutation 에러를 직접 지우지 않으면 다음에 연 계좌로 새어나간다.
    setCloseConfirmOpen(false)
    patchAccount.reset()
    deleteAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((st) => ({ accountForm: { ...st.accountForm, ...patch } }))

  const handleSave = () => {
    if (!account || !form.name.trim()) return

    const maturityPicked = state.dpPicked['editAccountMaturity'] as { y: number; m: number; d: number } | undefined
    const maturityDate = maturityPicked ? pickedToISODate(maturityPicked) : (form.maturityDate ?? undefined)

    const body: UpdateAccountRequest = {
      name: form.name.trim(),
      type: form.type,
      isLiquid: form.isLiquid,
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
      ...(maturityDate ? { maturityDate } : {}),
    }

    patchAccount.mutate({ id: account.id, body }, { onSuccess: resetAndClose })
  }

  const handleDelete = () => {
    if (!account) return
    deleteAccount.mutate(account.id, { onSuccess: resetAndClose })
  }

  const isAlreadyClosed = deleteAccount.error instanceof ApiError && deleteAccount.error.code === 'ACCOUNT_ALREADY_CLOSED'
  // 저장과 해지가 동시에 날아가면 응답 순서에 따라 최종 상태를 예측할 수 없다 — 서로를 잠근다.
  const isBusy = patchAccount.isPending || deleteAccount.isPending

  return (
    <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ padding: '42px 30px', maxHeight: '90vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="edit" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 수정</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{account?.name ?? '—'}</div>
          </div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {accountQuery.error ? (
        <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{accountQuery.error.message}</div>
      ) : !isFormReady || !account ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={LABEL_STYLE}>자산 유형</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ACCOUNT_TYPE_ORDER.map((t) => (
                <button key={t} className="mini-hov" onClick={() => patchForm({ type: t })} style={chipStyle(form.type === t)}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={LABEL_STYLE}>계좌 이름</div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={fieldRowStyle}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={LABEL_STYLE}>금융기관 (선택)</div>
              {institutions.length === 0 ? (
                <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                  등록된 금융기관이 없어요
                </div>
              ) : (
                <Dropdown dd={ddInstitutionDisplay} maxHeight={160} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>현재 잔액</div>
              {/* AccountResponse.balanceKrw는 통화와 무관하게 항상 원화 환산 정수다(account.type.ts
                  참고) — 같은 계좌를 보여주는 AccountDetailModal.tsx도 항상 원화로 렌더한다(정합성
                  확인됨). 여기서만 USD 계좌에 `$`를 붙이면 원화 금액을 달러로 오인시킨다. */}
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, color: 'var(--text-weak)' }}>
                {fmt(account.balanceKrw)}원
              </div>
            </div>
          </div>
          <div>
            <div style={LABEL_STYLE}>유동성 여부</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {([{ label: '유동성 있음', val: true }, { label: '유동성 없음', val: false }] as const).map((n) => (
                <button key={n.label} className="mini-hov" onClick={() => patchForm({ isLiquid: n.val })} style={chipStyle(form.isLiquid === n.val)}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>만기일 (선택)</div>
            <DatePicker dp={dpMaturity} />
          </div>

          {patchAccount.error && (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{patchAccount.error.message}</div>
          )}
          <button
            onClick={handleSave}
            disabled={isBusy}
            aria-busy={patchAccount.isPending}
            className="qbtn"
            style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1, transition: 'transform .12s' }}
          >
            {patchAccount.isPending ? '저장 중…' : '변경사항 저장'}
          </button>

          <div style={{ borderTop: '0.5px solid var(--track)', paddingTop: 16 }}>
            {!closeConfirmOpen ? (
              <button
                onClick={() => setCloseConfirmOpen(true)}
                className="mini-hov"
                style={{ width: '100%', padding: 12, borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                계좌 해지
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>정말 해지할까요?</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>
                  해지한 계좌는 자산 구성 계산에서 제외돼요. 이 작업은 되돌릴 수 없어요.
                </div>
                {deleteAccount.error && (
                  <div style={{ fontSize: 11.5, color: 'var(--down)' }}>
                    {isAlreadyClosed ? '이미 해지된 계좌예요' : deleteAccount.error.message}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleDelete}
                    disabled={isBusy}
                    aria-busy={deleteAccount.isPending}
                    className="qbtn"
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
                  >
                    {deleteAccount.isPending ? '해지 중…' : '해지할게요'}
                  </button>
                  <button
                    onClick={() => setCloseConfirmOpen(false)}
                    className="qbtn"
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
