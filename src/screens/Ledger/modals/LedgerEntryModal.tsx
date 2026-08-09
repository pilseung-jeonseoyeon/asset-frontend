// Source: secret/Asset Manager v14.dc.html L1605-1771 (modalLedgerEntry) — layout transcribed verbatim,
// then wired to POST/PUT/DELETE /transactions (contents were previously read-only — see git history).
// z-index 80, width 480px, maxHeight 86vh (confirmed per-instance, NOT the 90vh some other modals use).
//
// 계좌 매핑(secret/API-SPEC.md §6): 서버는 계좌를 accountId 하나로만 다룬다("거래가 발생한 계좌") —
// TRANSFER·SAVING만 예외로 transferAccountId(상대 계좌)를 추가로 받는다. 그래서
//   - INCOME/EXPENSE: "계좌" 필드(entryAccountId) = accountId. 출금계좌 필드는 없다.
//   - SAVING: "출금계좌"(entryWithdrawAccountId) = accountId, "저축계좌"(entryAccountId) = transferAccountId.
//   - TRANSFER: "출금계좌"(entryWithdrawAccountId) = accountId, "입금계좌"(entryAccountId) = transferAccountId.
// SAVING도 TRANSFER와 동일하게 출금 계좌(−amount)·상대 계좌(+amount) 두 계좌를 받는다 — 상대 계좌가
// 없으면 출금만 반영되어 총자산이 줄어들기 때문에 서버가 필수로 요구한다.
//
// PUT은 accountId를 받지 않는다(UpdateTransactionRequest에 필드 자체가 없음 — 수정 불가). 그래서 편집
// 중에는 "이 거래가 발생한 계좌" 필드(출금계좌가 없는 유형이면 계좌, 있으면 출금계좌)를 읽기 전용으로
// 바꾼다. 상대 계좌(transferAccountId, SAVING의 저축계좌·TRANSFER의 입금계좌)는 PUT에도 있어 편집
// 중에도 그대로 바꿀 수 있다. 같은 이유로 거래 유형(수입/지출/저축/이체) 탭도 편집 중에는 숨긴다 —
// 유형이 바뀌면 "발생한 계좌"의 의미 자체가 바뀌는데 그 계좌는 애초에 수정 대상이 아니기 때문이다.
//
// 하드코딩 "투자 수익/원금 회수" 블록(구 showInvestBreakdown)은 대응 API가 없어 제거했다(주석 없이
// 지우면 히스토리 추적이 어려워 여기 남긴다 — ds_rules 10-4의 "투자 실현 수익" 분리 기록은 매도
// 체결(트레이드) 쪽에서 다룰 몫이라 이 모달의 범위가 아니다).

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { SegmentedTab } from '../../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../../state/AppStateContext'
import { useEntityDropdown, type DropdownState } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { isoDateToDisplay, pickedToISODate, toISODate } from '../../../utils/date'
import { fmt, parseAmount } from '../../../utils/format'
import { ENTRY_TYPE_TO_CATEGORY_KIND, ENTRY_TYPE_TO_TX_TYPE, findSubcategoryById } from '../../../data/ledgerView'
import type { EntryType } from '../../../state/types'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import type { AccountResponse } from '@/services/account'
import { useGetCategories } from '@/services/category'
import { useDeleteTransaction, usePostTransaction, usePutTransaction } from '@/services/transaction'
import type { CreateTransactionRequest, UpdateTransactionRequest } from '@/services/transaction'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

const CONTENT_PLACEHOLDER: Record<EntryType, string> = {
  income: '급여, 상여, 이자 등',
  expense: '어디에 썼는지 적어주세요',
  saving: '적금 자동이체, 목돈 이체 등',
  transfer: '증권계좌 출금, 계좌 간 이동 등',
}

/** PUT이 받지 않는 계좌(accountId) 필드를 편집 중 읽기 전용으로 보여준다. */
function LockedAccountField({ accountId, accounts }: { accountId: number | null; accounts: AccountResponse[] }) {
  const name = accounts.find((a) => a.id === accountId)?.name ?? '—'
  return (
    <div>
      <div style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, color: 'var(--text-weak)' }}>{name}</div>
      <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>계좌는 수정할 수 없어요. 바꾸려면 삭제 후 다시 등록해주세요.</div>
    </div>
  )
}

export function LedgerEntryModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'ledgerEntry'
  const isEditing = state.editingTxId !== null
  const entryType = state.entryType
  const isTransfer = entryType === 'transfer'
  const isSaving = entryType === 'saving'
  // SAVING·TRANSFER 둘 다 출금 계좌(accountId) + 상대 계좌(transferAccountId) 두 개를 받는다.
  const needsTransferAccount = isTransfer || isSaving
  const categoryKind = isTransfer ? undefined : ENTRY_TYPE_TO_CATEGORY_KIND[entryType]

  const categoriesQuery = useGetCategories(categoryKind, { enabled: isOpen && !!categoryKind })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const postTx = usePostTransaction()
  const putTx = usePutTransaction()
  const deleteTx = useDeleteTransaction()

  const [amountInvalid, setAmountInvalid] = useState(false)
  const [descInvalid, setDescInvalid] = useState(false)
  const [sameAccountInvalid, setSameAccountInvalid] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const effectiveWithdrawAccountId = state.entryWithdrawAccountId ?? accounts[0]?.id ?? null
  const ddWithdrawAcct = useEntityDropdown(
    'withdrawAcct', accounts, (a) => a.id, (a) => a.name,
    effectiveWithdrawAccountId,
    (id) => { setState({ entryWithdrawAccountId: id }); setSameAccountInvalid(false) },
  )
  const effectiveEntryAccountId = state.entryAccountId ?? accounts[0]?.id ?? null
  const ddLedgerEntryAcct = useEntityDropdown(
    'ledgerEntryAcct', accounts, (a) => a.id, (a) => a.name,
    effectiveEntryAccountId,
    (id) => { setState({ entryAccountId: id }); setSameAccountInvalid(false) },
  )
  const entryDateDefault = isoDateToDisplay(toISODate(new Date()))
  const entryDateDisplay = state.entryDateOverride || entryDateDefault
  const [entryNavY, entryNavM] = entryDateDisplay.split('.').map(Number)
  const ddEntryDate = useDatePicker('entry', entryDateDisplay, { y: entryNavY, m: entryNavM })

  const activeMutation = isEditing ? putTx : postTx
  const saveError = activeMutation.error
  const saveErrorCode = saveError instanceof ApiError ? saveError.code : null

  // ACCOUNT_NOT_FOUND/SUBCATEGORY_NOT_FOUND(404)는 다른 곳에서 계좌·소분류가 이미 지워졌다는 뜻이라,
  // 드롭다운 소스를 다시 불러와 더 이상 존재하지 않는 선택지가 화면에서 사라지게 한다. mutate()의
  // onError로 처리한다(요청이 실제로 실패한 시점에만 한 번 실행되는 이벤트 콜백이라, effect처럼 query
  // 객체 참조 변화로 반복 실행될 위험이 없다).
  const handleMutationError = (err: unknown) => {
    if (!(err instanceof ApiError)) return
    if (err.code === 'ACCOUNT_NOT_FOUND') void accountsQuery.refetch()
    if (err.code === 'SUBCATEGORY_NOT_FOUND') void categoriesQuery.refetch()
  }

  if (!isOpen) return null

  const categories = categoriesQuery.categories
  const selected = findSubcategoryById(categories, state.entrySubcategoryId)
  const effectiveCategory = selected?.category ?? categories[0] ?? null
  const effectiveSubcategory = selected?.subcategory ?? effectiveCategory?.subcategories[0] ?? null
  const subOptions = effectiveCategory?.subcategories ?? []
  // 화면엔 항상 "첫 대분류·첫 소분류"가 기본 선택으로 보이지만(사용자가 한 번도 안 건드렸을 수 있음),
  // 실제 제출값은 state.entrySubcategoryId가 null이어도 이 유효값으로 채운다 — 그대로 두면 화면엔
  // 카테고리가 선택된 것처럼 보이는데 실제로는 null이 전송돼 SUBCATEGORY_REQUIRED가 난다.
  const submitSubcategoryId = state.entrySubcategoryId ?? effectiveSubcategory?.id ?? null

  const ddEntryCatMajor: DropdownState = {
    value: effectiveCategory?.name ?? '',
    open: state.openDropdown === 'entryCatMajor',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'entryCatMajor' ? null : 'entryCatMajor' })),
    options: categories.map((c) => ({
      name: c.name,
      pick: () => setState({ entrySubcategoryId: c.subcategories[0]?.id ?? null, openDropdown: null }),
    })),
  }
  const ddEntryCatSub: DropdownState = {
    value: effectiveSubcategory?.name ?? '',
    open: state.openDropdown === 'entryCatSub',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'entryCatSub' ? null : 'entryCatSub' })),
    options: subOptions.map((s) => ({
      name: s.name,
      pick: () => setState({ entrySubcategoryId: s.id, openDropdown: null }),
    })),
  }

  const entryModalIcon = entryType === 'income' ? 'payments' : entryType === 'saving' ? 'savings' : isTransfer ? 'sync_alt' : 'edit_note'
  const entryTitle = isEditing
    ? '내역 수정'
    : state.entryTabsVisible
      ? '가계부 입력'
      : entryType === 'income' ? '수입 입력' : entryType === 'saving' ? '저축 입력' : isTransfer ? '이체 입력' : '지출 입력'
  const entryCatVisible = !isTransfer
  const entryShowWithdraw = needsTransferAccount
  const ledgerEntryAcctLabel = isSaving ? '저축계좌' : isTransfer ? '입금계좌' : '계좌'
  const entrySaveLabel = isEditing
    ? '변경사항 저장'
    : entryType === 'income' ? '수입 저장' : entryType === 'saving' ? '저축 저장' : isTransfer ? '이체 저장' : '지출 저장'

  const setEntryType = (t: EntryType) => {
    setState({ entryType: t, entrySubcategoryId: null, entryWithdrawAccountId: null })
    setSameAccountInvalid(false)
  }

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      editingTxId: null,
      entrySubcategoryId: null,
      entryAccountId: null,
      entryWithdrawAccountId: null,
      entryAmount: 0,
      entryDescription: '',
      entryDateOverride: null,
      dpPicked: { ...st.dpPicked, entry: undefined },
      // dpNav도 함께 지운다 — 안 지우면 지난 세션에 넘겨둔 달이 남아 다음에 열 때 엉뚱한 달이 펼쳐진다.
      dpNav: { ...st.dpNav, entry: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 확인/검증 상태와
    // mutation 에러를 직접 지우지 않으면 다음에 열었을 때 지난 세션의 실패·확인창이 그대로 보인다.
    setAmountInvalid(false)
    setDescInvalid(false)
    setSameAccountInvalid(false)
    setDeleteConfirmOpen(false)
    postTx.reset()
    putTx.reset()
    deleteTx.reset()
  }

  const handleSave = () => {
    const description = state.entryDescription.trim()
    let hasError = false
    if (!description) {
      setDescInvalid(true)
      hasError = true
    } else {
      setDescInvalid(false)
    }
    if (state.entryAmount <= 0) {
      setAmountInvalid(true)
      hasError = true
    } else {
      setAmountInvalid(false)
    }
    if (hasError) return

    const picked = state.dpPicked['entry'] as { y: number; m: number; d: number } | undefined
    const transactionDate = picked ? pickedToISODate(picked) : entryDateDisplay.replaceAll('.', '-')
    const type = ENTRY_TYPE_TO_TX_TYPE[entryType]

    // PUT은 전체 교체다. 이 모달이 편집하지 않는 필드(메모·외화)를 다시 실어 보내지 않으면
    // 금액만 고쳐 저장해도 원래 값이 지워진다. 값이 없던 거래는 키 자체를 넣지 않는다.
    const preserved = state.entryPreserved
    const keep = isEditing && preserved
      ? {
          ...(preserved.memo !== null ? { memo: preserved.memo } : {}),
          ...(preserved.nativeAmount !== null ? { nativeAmount: preserved.nativeAmount } : {}),
          ...(preserved.nativeCurrency !== null ? { nativeCurrency: preserved.nativeCurrency } : {}),
        }
      : {}

    if (isTransfer) {
      const accountId = effectiveWithdrawAccountId
      const transferAccountId = effectiveEntryAccountId
      if (!accountId || !transferAccountId) return
      // 두 계좌가 같으면 출금과 입금이 같은 계좌에 겹쳐 기록돼 아무것도 바뀌지 않는 거래가 남는다.
      // 두 드롭다운 모두 값이 없으면 accounts[0]으로 채워지므로, 계좌가 하나뿐이거나 아직 아무것도
      // 고르지 않은 상태에서 그대로 저장하면 실제로 이 조합이 만들어진다. 서버에는 이를 막는 에러
      // 코드가 없어(API-SPEC §6.2 에러 표) 조용히 통과하므로 여기서 막는다.
      if (accountId === transferAccountId) {
        setSameAccountInvalid(true)
        return
      }
      setSameAccountInvalid(false)
      if (isEditing) {
        const body: UpdateTransactionRequest = { type, transferAccountId, amount: state.entryAmount, transactionDate, description, ...keep }
        putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: resetAndClose, onError: handleMutationError })
      } else {
        const body: CreateTransactionRequest = { type, accountId, transferAccountId, amount: state.entryAmount, transactionDate, description }
        postTx.mutate(body, { onSuccess: resetAndClose, onError: handleMutationError })
      }
      return
    }

    if (isSaving) {
      // 저축은 이체와 마찬가지로 출금 계좌(accountId) + 상대 계좌(transferAccountId) 둘 다 필요하고,
      // 소분류(subcategoryId)도 여전히 필수다.
      const accountId = effectiveWithdrawAccountId
      const transferAccountId = effectiveEntryAccountId
      if (!accountId || !transferAccountId || !submitSubcategoryId) return
      // 자기 자신에게 저축하면 출금만 반영되고 상대 계좌에는 아무 변화가 없어 총자산이 그대로 줄어든다
      // — 서버에 보내기 전에 막는다.
      if (accountId === transferAccountId) {
        setSameAccountInvalid(true)
        return
      }
      setSameAccountInvalid(false)
      if (isEditing) {
        const body: UpdateTransactionRequest = { type, subcategoryId: submitSubcategoryId, transferAccountId, amount: state.entryAmount, transactionDate, description, ...keep }
        putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: resetAndClose, onError: handleMutationError })
      } else {
        const body: CreateTransactionRequest = { type, accountId, subcategoryId: submitSubcategoryId, transferAccountId, amount: state.entryAmount, transactionDate, description }
        postTx.mutate(body, { onSuccess: resetAndClose, onError: handleMutationError })
      }
      return
    }

    const accountId = effectiveEntryAccountId
    if (!accountId || !submitSubcategoryId) return
    if (isEditing) {
      const body: UpdateTransactionRequest = { type, subcategoryId: submitSubcategoryId, amount: state.entryAmount, transactionDate, description, ...keep }
      putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: resetAndClose, onError: handleMutationError })
    } else {
      const body: CreateTransactionRequest = { type, accountId, subcategoryId: submitSubcategoryId, amount: state.entryAmount, transactionDate, description }
      postTx.mutate(body, { onSuccess: resetAndClose, onError: handleMutationError })
    }
  }

  const handleDelete = () => {
    if (state.editingTxId === null) return
    deleteTx.mutate(state.editingTxId, { onSuccess: resetAndClose })
  }

  const isBusy = postTx.isPending || putTx.isPending || deleteTx.isPending
  const noCategoryAvailable = entryCatVisible && !categoriesQuery.isPending && !categoriesQuery.error && categories.length === 0
  // 계좌가 하나도 없으면(신규 사용자 등) 저장 버튼을 눌러도 accountId를 채울 수 없다 — 눌러도 아무 일도
  // 안 일어나는 "죽은 클릭"을 만들지 않도록 아예 비활성화한다.
  const noAccountAvailable = !accountsQuery.isPending && !accountsQuery.error && accounts.length === 0
  // 이체·저축은 서로 다른 두 계좌가 필요하다. 계좌가 하나뿐이면 두 드롭다운이 같은 계좌로
  // 폴백되어 저장할 때마다 "같은 계좌예요" 에러만 반복되는 막다른 골목이 된다 — 진짜 원인은
  // 계좌가 부족한 것이므로 저장을 막고 그 사실을 그대로 안내한다.
  const notEnoughAccounts =
    needsTransferAccount && !accountsQuery.isPending && !accountsQuery.error && accounts.length === 1
  const canSave = !isBusy && !noCategoryAvailable && !noAccountAvailable && !notEnoughAccounts

  const categoryErrorMessage =
    saveErrorCode === 'SUBCATEGORY_REQUIRED' || saveErrorCode === 'SUBCATEGORY_NOT_ALLOWED' || saveErrorCode === 'SUBCATEGORY_NOT_FOUND'
      ? saveError?.message
      : null
  const transferAccountErrorMessage =
    saveErrorCode === 'TRANSFER_ACCOUNT_REQUIRED' || saveErrorCode === 'TRANSFER_ACCOUNT_NOT_ALLOWED' ? saveError?.message : null
  const transactionNotFoundMessage = saveErrorCode === 'TRANSACTION_NOT_FOUND' ? saveError?.message : null
  const genericErrorMessage =
    saveError && !categoryErrorMessage && !transferAccountErrorMessage && !transactionNotFoundMessage ? saveError.message : null

  const deleteErrorMessage = deleteTx.error?.message ?? null

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={entryModalIcon} size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{entryTitle}</div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {transactionNotFoundMessage && <div style={{ ...ERROR_STYLE, marginBottom: 14, marginTop: -8 }}>{transactionNotFoundMessage}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {state.entryTabsVisible && !isEditing && (
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
            <SegmentedTab active={entryType === 'income'} onClick={() => setEntryType('income')} style={{ flex: 1 }}>수입</SegmentedTab>
            <SegmentedTab active={entryType === 'expense'} onClick={() => setEntryType('expense')} style={{ flex: 1 }}>지출</SegmentedTab>
            <SegmentedTab active={entryType === 'saving'} onClick={() => setEntryType('saving')} style={{ flex: 1 }}>저축</SegmentedTab>
            <SegmentedTab active={isTransfer} onClick={() => setEntryType('transfer')} style={{ flex: 1 }}>이체</SegmentedTab>
          </div>
        )}

        <div>
          <div style={LABEL_STYLE}>금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" placeholder="0"
              value={state.entryAmount ? fmt(state.entryAmount) : ''}
              onChange={(e) => {
                setState({ entryAmount: parseAmount(e.target.value) })
                if (amountInvalid) setAmountInvalid(false)
              }}
              style={{ border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
          {amountInvalid && <div style={ERROR_STYLE}>금액을 입력해주세요</div>}
        </div>

        <div>
          <div style={LABEL_STYLE}>내용</div>
          <input
            type="text" placeholder={CONTENT_PLACEHOLDER[entryType]}
            value={state.entryDescription}
            onChange={(e) => {
              setState({ entryDescription: e.target.value })
              if (descInvalid) setDescInvalid(false)
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
          {descInvalid && <div style={ERROR_STYLE}>내용을 입력해주세요</div>}
        </div>

        {entryCatVisible && (
          <div>
            <div style={LABEL_STYLE}>카테고리</div>
            {categoriesQuery.isPending ? (
              <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : categoriesQuery.error ? (
              <div style={ERROR_STYLE}>{categoriesQuery.error.message}</div>
            ) : categories.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 카테고리가 없어요. 설정에서 먼저 소분류를 추가해주세요.</div>
            ) : (
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Dropdown dd={ddEntryCatMajor} maxHeight={200} />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Dropdown dd={ddEntryCatSub} maxHeight={200} />
                </div>
              </div>
            )}
            {categoryErrorMessage && <div style={ERROR_STYLE}>{categoryErrorMessage}</div>}
          </div>
        )}

        {entryShowWithdraw && (
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>출금계좌</div>
            {isEditing ? <LockedAccountField accountId={effectiveWithdrawAccountId} accounts={accounts} /> : <Dropdown dd={ddWithdrawAcct} maxHeight={180} />}
            {notEnoughAccounts ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginTop: 6 }}>
                계좌가 하나뿐이라 등록할 수 없어요. 서로 다른 두 계좌가 필요해요.
              </div>
            ) : (
              sameAccountInvalid && <div style={ERROR_STYLE}>출금 계좌와 {ledgerEntryAcctLabel}가 같아요. 다른 계좌를 선택해주세요.</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>{ledgerEntryAcctLabel}</div>
            {isEditing && !needsTransferAccount ? (
              <LockedAccountField accountId={effectiveEntryAccountId} accounts={accounts} />
            ) : (
              <Dropdown
                dd={ddLedgerEntryAcct}
                maxHeight={180}
                footer={
                  <>
                    <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                    <button
                      className="mini-hov"
                      onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'ledgerEntry' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Icon name="add" size={15} />
                      계좌 추가
                    </button>
                  </>
                }
              />
            )}
            {transferAccountErrorMessage && <div style={ERROR_STYLE}>{transferAccountErrorMessage}</div>}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>날짜</div>
            <DatePicker dp={ddEntryDate} />
          </div>
        </div>

        {genericErrorMessage && <div style={ERROR_STYLE}>{genericErrorMessage}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={activeMutation.isPending}
            className="qbtn"
            style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.7, transition: 'transform .12s' }}
          >
            {activeMutation.isPending ? '저장 중…' : entrySaveLabel}
          </button>
          {isEditing && !deleteConfirmOpen && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isBusy}
              className="qbtn"
              style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
            >
              삭제
            </button>
          )}
        </div>

        {isEditing && deleteConfirmOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>정말 삭제할까요?</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>삭제한 내역은 되돌릴 수 없어요.</div>
            {deleteErrorMessage && <div style={ERROR_STYLE}>{deleteErrorMessage}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={isBusy}
                aria-busy={deleteTx.isPending}
                className="qbtn"
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
              >
                {deleteTx.isPending ? '삭제 중…' : '삭제할게요'}
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isBusy}
                className="qbtn"
                style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
