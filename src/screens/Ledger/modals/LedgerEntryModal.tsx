// 가계부 거래 등록/수정 모달. POST/PUT/DELETE /transactions에 연결돼 있다.
// z-index 80, 너비 480px, maxHeight 86vh(다른 모달이 쓰는 90vh가 아니다).
//
// **계좌 매핑**: 서버는 계좌를 accountId 하나로만 다룬다('거래가 발생한 계좌') — TRANSFER·SAVING만
// 예외로 transferAccountId(상대 계좌)를 추가로 받는다. 그래서
// - INCOME/EXPENSE: '계좌' 필드(entryAccountId) = accountId. 출금계좌 필드는 없다.
// - SAVING: '출금계좌'(entryWithdrawAccountId) = accountId, '저축계좌'(entryAccountId) = transferAccountId.
// - TRANSFER: '출금계좌'(entryWithdrawAccountId) = accountId, '입금계좌'(entryAccountId) = transferAccountId.
// SAVING도 TRANSFER와 똑같이 두 계좌를 받는다 — 상대 계좌가 없으면 출금만 반영되어 총자산이 줄어들기
// 때문에 서버가 필수로 요구한다.
//
// PUT의 accountId는 수정 가능하다 — 편집 중에도 '이 거래가 발생한 계좌' 필드(출금계좌가 없는 유형이면
// 계좌, 있으면 출금계좌)를 일반 드롭다운으로 보여준다. 다만 거래 유형(수입/지출/저축/이체) 탭은
// 편집 중 숨긴다 — 유형이 바뀌면 소분류·상대 계좌의 필수/금지 규칙이 통째로 바뀌는데, 이 모달은
// 유형 전환에 맞춰 소분류·상대 계좌 선택을 초기화하는 흐름을 갖고 있지 않다(등록 시 setEntryType의
// 리셋 로직을 편집 중 그대로 재사용하면 이전 유형의 선택값이 남는다).
//
// 최근 내역 추천: 신규 등록 중 '내용'을 2글자 이상 치면 최근 6개월 거래에서 비슷한 제목을 찾아 칩을
// 최대 3개까지 입력칸 아래에 보여준다. 칩을 누르면 제목·금액·소분류·계좌(저축·이체는 출금/상대 계좌)를
// 한 번에 채운다 — 자동으로 채우지는 않는다. 목록은 모달이 열릴 때 한 번 받고(React Query 캐시, 거래를
// 등록하면 transaction 키가 무효화되어 다음에 열 때 반영), 제목 비교는 ledgerView의
// buildEntrySuggestions가 한다(서버에 제목 검색이 없다). 수정 모드에서는 보여주지 않는다 — 이미 값이
// 다 차 있고, 엉뚱한 칩을 눌러 기존 거래가 덮어써지는 사고를 막는다.

import { useState, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { SegmentedTab } from '../../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../../state/AppStateContext'
import { useEntityDropdown, type DropdownState } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { isoDateToDisplay, pickedToISODate, recentMonthsRange, toISODate } from '../../../utils/date'
import { formatNumber, parseAmount } from '../../../utils/format'
import { captureEntryDraft } from '../../../state/selectors/entryDraft'
import { ENTRY_TYPE_TO_CATEGORY_KIND, ENTRY_TYPE_TO_TX_TYPE, buildEntrySuggestions, findSubcategoryById } from '../../../data/ledgerView'
import type { EntrySuggestion } from '../../../data/ledgerView'
import type { AppState, EntryType } from '../../../state/types'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useGetCategories } from '@/services/category'
import { useDeleteTransaction, useGetTransactions, usePostTransaction, usePutTransaction } from '@/services/transaction'
import type { CreateTransactionRequest, UpdateTransactionRequest } from '@/services/transaction'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
// 추천 칩 — 보조 톤 알약. minHeight 44는 docs/mobile.md의 터치 영역 최소 규격.
const SUGGESTION_CHIP_STYLE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 44, padding: '0 12px', borderRadius: 999,
  border: '0.5px solid var(--border)', background: 'var(--surface)', fontSize: 11.5, fontWeight: 600,
  color: 'var(--text-mid)', fontFamily: 'inherit', cursor: 'pointer', maxWidth: '100%',
}
const SUGGESTION_DESC_STYLE: CSSProperties = {
  fontWeight: 700, color: 'var(--text-strong)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
// 추천 후보로 받아 둘 최근 거래 범위. 개인 가계부 규모에서 6개월·500건이면 자주 쓰는 제목은 다 들어온다.
const SUGGESTION_MONTHS_BACK = 6
const SUGGESTION_FETCH_SIZE = 500

const CONTENT_PLACEHOLDER: Record<EntryType, string> = {
  income: '급여, 상여, 이자 등',
  expense: '어디에 썼는지 적어주세요',
  saving: '적금 자동이체, 목돈 이체 등',
  transfer: '증권계좌 출금, 계좌 간 이동 등',
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
  // 추천 후보. 신규 등록일 때만 받는다(수정 모드엔 추천을 안 보여주므로 요청도 안 한다).
  const suggestionsEnabled = isOpen && !isEditing
  const recentTxQuery = useGetTransactions(
    { ...recentMonthsRange(SUGGESTION_MONTHS_BACK), page: 1, size: SUGGESTION_FETCH_SIZE },
    { enabled: suggestionsEnabled },
  )

  const [amountInvalid, setAmountInvalid] = useState(false)
  // 칩을 누른 뒤에는 제목을 다시 고칠 때까지 칩을 숨긴다 — 방금 채운 값과 같은 칩이 계속 떠 있으면
  // "아직 안 채워진 건가?" 하고 헷갈린다.
  const [suggestionApplied, setSuggestionApplied] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [descInvalid, setDescInvalid] = useState(false)
  const [sameAccountInvalid, setSameAccountInvalid] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const effectiveWithdrawAccountId = state.entryWithdrawAccountId ?? accounts[0]?.id ?? null
  const ddWithdrawAcct = useEntityDropdown(
    'withdrawAcct', accounts, (a) => a.id, (a) => a.name,
    effectiveWithdrawAccountId,
    (id) => { setState({ entryWithdrawAccountId: id }); setSameAccountInvalid(false) },
  )
  // 저축·이체는 출금 계좌와 상대 계좌가 반드시 달라야 한다. 둘 다 기본값을 accounts[0]으로 잡으면
  // 폼을 열자마자 같은 계좌로 충돌해 첫 저장이 항상 "같은 계좌예요" 에러로 막힌다 — 상대 계좌 기본값은
  // 출금 계좌와 다른 첫 계좌로 잡는다(계좌가 하나뿐이면 notEnoughAccounts가 이미 저장 자체를 막는다).
  const entryAccountFallbackId = needsTransferAccount
    ? (accounts.find((a) => a.id !== effectiveWithdrawAccountId)?.id ?? accounts[0]?.id ?? null)
    : (accounts[0]?.id ?? null)
  const effectiveEntryAccountId = state.entryAccountId ?? entryAccountFallbackId
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

  const entryCatVisible = !isTransfer
  const suggestions: EntrySuggestion[] =
    suggestionsEnabled && !suggestionApplied
      ? buildEntrySuggestions(recentTxQuery.data?.content ?? [], accounts, state.entryDescription, ENTRY_TYPE_TO_TX_TYPE[entryType])
      : []

  // 칩 적용: 제목·금액은 항상 채우고, 소분류·계좌는 지금도 존재하는 것만 채운다(그 사이 지워졌을 수 있다 —
  // 없는 id를 넣으면 드롭다운은 첫 항목을 보여주는데 제출값은 사라진 id가 되어 SUBCATEGORY_NOT_FOUND가 난다).
  const applySuggestion = (s: EntrySuggestion) => {
    const hasAccount = (id: number | null) => id !== null && accounts.some((a) => a.id === id)
    // 금액은 채우지 않는다(사용자 요청). 같은 이름의 거래라도 금액은 매번 다른데
    // 지난 금액이 미리 들어가 있으면 그대로 저장돼 틀린 금액이 기록되는 사고가 난다.
    // 매번 다시 고르기 번거로운 카테고리·계좌만 채우고, 금액은 사용자가 직접 입력하게 둔다.
    const patch: Partial<AppState> = { entryDescription: s.description }
    if (entryCatVisible && s.subcategoryId !== null && findSubcategoryById(categories, s.subcategoryId)) {
      patch.entrySubcategoryId = s.subcategoryId
    }
    if (needsTransferAccount) {
      // 저축·이체: 거래의 accountId가 출금 계좌, transferAccountId가 상대(저축·입금) 계좌다(파일 상단 주석).
      if (hasAccount(s.accountId)) patch.entryWithdrawAccountId = s.accountId
      if (hasAccount(s.transferAccountId)) patch.entryAccountId = s.transferAccountId
    } else if (hasAccount(s.accountId)) {
      patch.entryAccountId = s.accountId
    }
    setState(patch)
    setSuggestionApplied(true)
    setDescInvalid(false)
    // 칩은 금액을 채우지 않으므로 다음에 할 일은 늘 금액 입력이다. 그런데 칩은 '내용' 아래에 뜨고
    // 금액칸은 그 위라, 그냥 두면 사용자가 손가락을 위로 거슬러 올라가야 한다. 이미 금액을 적어둔
    // 상태라면 포커스를 뺏지 않는다(금액부터 친 사용자도 있다).
    if (state.entryAmount === 0) amountInputRef.current?.focus()
    setSameAccountInvalid(false)
  }

  const ddEntryCatMajor: DropdownState = {
    value: effectiveCategory?.name ?? '',
    open: state.openDropdown === 'entryCatMajor',
    toggle: () => setState((prev) => ({ openDropdown: prev.openDropdown === 'entryCatMajor' ? null : 'entryCatMajor' })),
    options: categories.map((c) => ({
      name: c.name,
      pick: () => setState({ entrySubcategoryId: c.subcategories[0]?.id ?? null, openDropdown: null }),
    })),
  }
  const ddEntryCatSub: DropdownState = {
    value: effectiveSubcategory?.name ?? '',
    open: state.openDropdown === 'entryCatSub',
    toggle: () => setState((prev) => ({ openDropdown: prev.openDropdown === 'entryCatSub' ? null : 'entryCatSub' })),
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
  const entryShowWithdraw = needsTransferAccount
  const ledgerEntryAcctLabel = isSaving ? '저축계좌' : isTransfer ? '입금계좌' : '계좌'
  const entrySaveLabel = isEditing
    ? '변경사항 저장'
    : entryType === 'income' ? '수입 저장' : entryType === 'saving' ? '저축 저장' : isTransfer ? '이체 저장' : '지출 저장'

  /** 복원 배너의 "새로 작성" — 보관 중이던 초안을 버리고 빈 폼으로 되돌린다(거래유형·날짜는 유지). */
  const startFreshEntry = () => {
    setState({
      entryDraft: null,
      entryDraftRestored: false,
      entryAmount: 0,
      entryDescription: '',
      entryMemo: '',
      entrySubcategoryId: null,
      entryAccountId: null,
      entryWithdrawAccountId: null,
    })
    setAmountInvalid(false)
    setDescInvalid(false)
    setSameAccountInvalid(false)
    setSuggestionApplied(false)
  }

  const setEntryType = (t: EntryType) => {
    // 거래유형을 바꾸면 보관 중이던 초안은 버린다(사용자 결정) — 지금 폼에 남아 있는
    // 내용이 곧 새 유형의 내용이 되므로, 다른 유형의 옛 초안이 되살아나면 안 된다.
    setState({ entryType: t, entrySubcategoryId: null, entryWithdrawAccountId: null, entryDraft: null, entryDraftRestored: false })
    setSameAccountInvalid(false)
  }

  /**
   * 모달을 닫는다.
   * @param keepDraft 저장하지 않고 닫는 경우(X·Esc·배경 클릭·아래로 스와이프) true — 적던 내용을
   * 초안으로 보관했다가 다음에 같은 거래유형으로 열 때 되살린다(state/selectors/entryDraft.ts).
   * 저장·삭제에 성공해서 닫는 경우에는 false — 이미 서버에 반영됐으니 초안이 남으면 안 된다.
   * **수정 세션(editingTxId)은 keepDraft여도 초안을 남기지 않는다** — 다시 열 때 서버 값을
   * 새로 채우는 게 맞고, 남기면 다음 "새 거래"에 남의 거래 내용이 튀어나온다.
   */
  const closeModal = (keepDraft: boolean) => {
    setState((prev) => ({
      // 수정 세션(editingTxId)은 어느 경로로 닫히든 초안을 만들지도, 기존 초안을 지우지도 않는다.
      // 남의 거래를 잠깐 고치고 저장했다고 해서 내가 쓰다 만 새 거래 초안이 날아가면 안 된다.
      entryDraft:
        prev.editingTxId !== null ? prev.entryDraft
        : keepDraft ? captureEntryDraft(prev)
        : null,
      entryDraftRestored: false,
      modalOpen: null,
      editingTxId: null,
      entrySubcategoryId: null,
      entryAccountId: null,
      entryWithdrawAccountId: null,
      entryAmount: 0,
      entryDescription: '',
      entryMemo: '',
      entryDateOverride: null,
      datePickerPicked: { ...prev.datePickerPicked, entry: undefined },
      // dpNav도 함께 지운다 — 안 지우면 지난 세션에 넘겨둔 달이 남아 다음에 열 때 엉뚱한 달이 펼쳐진다.
      datePickerNav: { ...prev.datePickerNav, entry: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 확인/검증 상태와
    // mutation 에러를 직접 지우지 않으면 다음에 열었을 때 지난 세션의 실패·확인창이 그대로 보인다.
    setAmountInvalid(false)
    setDescInvalid(false)
    setSameAccountInvalid(false)
    setDeleteConfirmOpen(false)
    setSuggestionApplied(false)
    postTx.reset()
    putTx.reset()
    deleteTx.reset()
  }

  /** 저장하지 않고 닫기(X·Esc·배경 클릭·스와이프). Modal의 onClose가 인자를 넘기지 않으므로 감싼다. */
  const closeKeepingDraft = () => closeModal(true)
  /** 저장·삭제 성공 후 닫기 — 초안을 남기지 않는다. */
  const closeDiscardingDraft = () => closeModal(false)

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

    const picked = state.datePickerPicked['entry'] as { y: number; m: number; d: number } | undefined
    const transactionDate = picked ? pickedToISODate(picked) : entryDateDisplay.replaceAll('.', '-')
    const type = ENTRY_TYPE_TO_TX_TYPE[entryType]

    // PUT은 전체 교체다. 이 모달이 편집하지 않는 필드(외화 nativeAmount/nativeCurrency)를 다시
    // 실어 보내지 않으면 금액만 고쳐 저장해도 원래 값이 null로 지워진다. 값이 없던 거래는 키 자체를
    // 넣지 않는다. memo는 이제 이 모달이 직접 편집하므로(entryMemo) 여기서 보존할 필요가 없다 —
    // 아래 memo와 별도로 합친다.
    const preserved = state.entryPreserved
    const memo = state.entryMemo.trim()
    const keep = {
      ...(memo ? { memo } : {}),
      ...(isEditing && preserved?.nativeAmount !== null && preserved?.nativeAmount !== undefined ? { nativeAmount: preserved.nativeAmount } : {}),
      ...(isEditing && preserved?.nativeCurrency !== null && preserved?.nativeCurrency !== undefined ? { nativeCurrency: preserved.nativeCurrency } : {}),
    }

    if (isTransfer) {
      const accountId = effectiveWithdrawAccountId
      const transferAccountId = effectiveEntryAccountId
      if (!accountId || !transferAccountId) return
      // 두 계좌가 같으면 출금과 입금이 같은 계좌에 겹쳐 기록돼 아무것도 바뀌지 않는 거래가 남는다.
      // 두 드롭다운 모두 값이 없으면 accounts[0]으로 채워지므로, 계좌가 하나뿐이거나 아직 아무것도
      // 고르지 않은 상태에서 그대로 저장하면 실제로 이 조합이 만들어진다. 서버에는 이를 막는 에러
      // 코드가 없어 조용히 통과하므로 여기서 막는다.
      if (accountId === transferAccountId) {
        setSameAccountInvalid(true)
        return
      }
      setSameAccountInvalid(false)
      const body: CreateTransactionRequest | UpdateTransactionRequest = { type, accountId, transferAccountId, amount: state.entryAmount, transactionDate, description, ...keep }
      if (isEditing) {
        putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
      } else {
        postTx.mutate(body, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
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
      const body: CreateTransactionRequest | UpdateTransactionRequest = { type, accountId, subcategoryId: submitSubcategoryId, transferAccountId, amount: state.entryAmount, transactionDate, description, ...keep }
      if (isEditing) {
        putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
      } else {
        postTx.mutate(body, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
      }
      return
    }

    const accountId = effectiveEntryAccountId
    if (!accountId || !submitSubcategoryId) return
    const body: CreateTransactionRequest | UpdateTransactionRequest = { type, accountId, subcategoryId: submitSubcategoryId, amount: state.entryAmount, transactionDate, description, ...keep }
    if (isEditing) {
      putTx.mutate({ id: state.editingTxId as number, body }, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
    } else {
      postTx.mutate(body, { onSuccess: closeDiscardingDraft, onError: handleMutationError })
    }
  }

  const handleDelete = () => {
    if (state.editingTxId === null) return
    deleteTx.mutate(state.editingTxId, { onSuccess: closeDiscardingDraft })
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
    <Modal onClose={closeKeepingDraft} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
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
          onClick={closeKeepingDraft}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {transactionNotFoundMessage && <div style={{ ...ERROR_STYLE, marginBottom: 14, marginTop: -8 }}>{transactionNotFoundMessage}</div>}

      {/* 초안에서 되살아난 폼이라는 안내. 이게 없으면 며칠 전 실수로 닫아둔 초안의 금액·내용이
          채워진 채 열린 것을 새 거래인 줄 알고 그대로 저장하게 된다.
          "새로 작성"은 초안을 버리고 빈 폼으로 돌린다. */}
      {state.entryDraftRestored && !isEditing && (
        <div
          style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            marginBottom: 14, marginTop: -8, padding: '10px 12px', borderRadius: 10,
            background: 'var(--fill-subtle)', fontSize: 12.5, color: 'var(--text-mid)',
          }}
        >
          <Icon name="history" size={15} />
          <span style={{ fontWeight: 600 }}>이어서 작성 중이던 내용을 불러왔어요</span>
          <button
            type="button"
            onClick={startFreshEntry}
            className="mini-hov"
            style={{
              marginLeft: 'auto', minHeight: 44, padding: '0 12px', borderRadius: 8, border: 'none',
              background: 'var(--track)', color: 'var(--text-strong)', fontSize: 11.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            새로 작성
          </button>
        </div>
      )}

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
              value={state.entryAmount ? formatNumber(state.entryAmount) : ''}
              onChange={(e) => {
                setState({ entryAmount: parseAmount(e.target.value) })
                if (amountInvalid) setAmountInvalid(false)
              }}
              ref={amountInputRef}
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
              if (suggestionApplied) setSuggestionApplied(false)
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
          {descInvalid && <div style={ERROR_STYLE}>내용을 입력해주세요</div>}
          {suggestions.length > 0 && (
            <div role="group" aria-label="최근 내역에서 채우기" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="mini-hov"
                  onClick={() => applySuggestion(s)}
                  title={`${s.description}${s.tag ? ` · ${s.tag}` : ''} — 눌러서 채우기 (금액은 직접 입력)`}
                  style={SUGGESTION_CHIP_STYLE}
                >
                  <span style={SUGGESTION_DESC_STYLE}>{s.description}</span>
                  {s.tag && (
                    <>
                      <span style={{ color: 'var(--text-weak)' }}>·</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{s.tag}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={LABEL_STYLE}>메모 (선택)</div>
          <input
            type="text" placeholder="추가로 남겨둘 메모가 있다면 적어주세요"
            value={state.entryMemo}
            onChange={(e) => setState({ entryMemo: e.target.value })}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
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
            <Dropdown dd={ddWithdrawAcct} maxHeight={180} />
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
            <Dropdown
              dd={ddLedgerEntryAcct}
              maxHeight={180}
              footer={
                <>
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'ledgerEntry', openDropdown: null })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <Icon name="add" size={15} />
                    계좌 추가
                  </button>
                </>
              }
            />
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
