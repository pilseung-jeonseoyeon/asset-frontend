// Source: secret/Asset Manager v14.dc.html L1774-1986 (modalFixedExpense) — layout transcribed verbatim,
// then wired to POST/PUT/DELETE /subscriptions (contents were previously read-only — see git history).
// z-index 80, width 460px, maxHeight 86vh.
//
// 반복 주기: 원본 프로토타입은 매주/매월/매년(recurFreq) + 결제요일/결제월·결제일을 입력받았지만, 서버
// CreateSubscriptionReq(secret/API-SPEC.md §8.2)는 paymentDay(1~31, "매월 며칠") 하나만 받는다 — 주간·
// 연간 주기 자체가 서버 모델에 없다. 답변서 C-8에서 매월 전용으로 드롭 확정(frequency 필드 추가 안 함)
// 했으므로, 죽은 state였던 recurFreq/recurYearMonth/recurYearDay는 제거했다. recurPayDay("N일" 문자열)
// 만 그대로 재사용해 paymentDay를 만든다.
//
// 시작일(startedAt): GET /subscriptions 응답에 startedAt이 없어(subscription.type.ts SubscriptionResponse
// 참고) 수정 모달을 열 때 원래 값을 알 수 없다. 모르는 값을 "오늘"로 덮어써 버리면 데이터 손실이라
// EditAccountModal의 interestRate 처리와 같은 이유로 수정 중에는 이 필드를 아예 보여주지 않는다(전송도
// 안 함 — UpdateSubscriptionRequest에서 optional이라 생략하면 서버가 기존 값을 유지한다).

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
import { findSubcategoryById } from '../../../data/ledgerView'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useGetCategories } from '@/services/category'
import { useDeleteSubscription, usePostSubscription, usePutSubscription } from '@/services/subscription'
import type { CreateSubscriptionRequest, UpdateSubscriptionRequest } from '@/services/subscription'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

const PAY_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => `${i + 1}일`)

export function FixedExpenseModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'fixedExpense'
  const isEditing = state.editingRecurId !== null

  const categoriesQuery = useGetCategories('EXPENSE', { enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const postSub = usePostSubscription()
  const putSub = usePutSubscription()
  const deleteSub = useDeleteSubscription()

  const effectiveRecurAccountId = state.recurAccountId ?? accounts[0]?.id ?? null
  const ddRecurPayMethod = useEntityDropdown(
    'recurPayMethod', accounts, (a) => a.id, (a) => a.name,
    effectiveRecurAccountId, (id) => setState({ recurAccountId: id }),
  )
  const recurDateDefault = isoDateToDisplay(toISODate(new Date()))
  const [recurNavY, recurNavM] = recurDateDefault.split('.').map(Number)
  const ddRecurDate = useDatePicker('recur', recurDateDefault, { y: recurNavY, m: recurNavM })

  const [nameInvalid, setNameInvalid] = useState(false)
  const [amountInvalid, setAmountInvalid] = useState(false)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)

  const activeMutation = isEditing ? putSub : postSub
  const saveError = activeMutation.error
  const saveErrorCode = saveError instanceof ApiError ? saveError.code : null

  if (!isOpen) return null

  const categories = categoriesQuery.categories
  const selected = findSubcategoryById(categories, state.recurSubcategoryId)
  const effectiveCategory = selected?.category ?? categories[0] ?? null
  const effectiveSubcategory = selected?.subcategory ?? effectiveCategory?.subcategories[0] ?? null
  const subOptions = effectiveCategory?.subcategories ?? []
  // ds_rules 없음 — 순수 데이터 정합성 문제: 화면엔 첫 대분류·첫 소분류가 기본 선택으로 보이지만
  // 사용자가 한 번도 안 건드렸으면 state.recurSubcategoryId는 여전히 null이라, 그대로 제출하면 서버가
  // "필수값 누락"으로 거부한다 — 화면에 보이는 값을 실제 제출값으로도 채운다.
  const submitSubcategoryId = state.recurSubcategoryId ?? effectiveSubcategory?.id ?? null

  const ddRecurCatMajor: DropdownState = {
    value: effectiveCategory?.name ?? '',
    open: state.openDropdown === 'recurCatMajor',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurCatMajor' ? null : 'recurCatMajor' })),
    options: categories.map((c) => ({
      name: c.name,
      pick: () => setState({ recurSubcategoryId: c.subcategories[0]?.id ?? null, openDropdown: null }),
    })),
  }
  const ddRecurCatSub: DropdownState = {
    value: effectiveSubcategory?.name ?? '',
    open: state.openDropdown === 'recurCatSub',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurCatSub' ? null : 'recurCatSub' })),
    options: subOptions.map((s) => ({
      name: s.name,
      pick: () => setState({ recurSubcategoryId: s.id, openDropdown: null }),
    })),
  }
  const recurPayDayDisplay = state.recurPayDay || '25일'
  const ddRecurPayDay: DropdownState = {
    value: recurPayDayDisplay,
    open: state.openDropdown === 'recurPayDay',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurPayDay' ? null : 'recurPayDay' })),
    options: PAY_DAY_OPTIONS.map((pd) => ({
      name: pd,
      pick: () => setState({ recurPayDay: pd, openDropdown: null }),
    })),
  }
  const paymentDay = parseInt(recurPayDayDisplay, 10) || 25

  const recurModalTitle = isEditing ? (state.recurringType === 'fixed' ? '고정 지출 수정' : '구독 수정') : '고정 지출 · 구독 추가'
  const recurNamePlaceholder = state.recurringType === 'fixed' ? '예: 실손의료보험' : '예: 넷플릭스'
  const recurSaveLabel = isEditing ? '변경사항 저장' : state.recurringType === 'fixed' ? '고정 지출 저장' : '구독 저장'

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      editingRecurId: null,
      recurName: '',
      recurAmount: 0,
      recurSubcategoryId: null,
      recurAccountId: null,
      recurPayDay: '25일',
      dpPicked: { ...st.dpPicked, recur: undefined },
      // dpNav도 함께 지운다 — 안 지우면 지난 세션에 넘겨둔 달이 남아 다음에 열 때 엉뚱한 달이 펼쳐진다.
      dpNav: { ...st.dpNav, recur: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 확인/검증 상태와
    // mutation 에러를 직접 지우지 않으면 다음에 열었을 때 지난 세션의 실패·확인창이 그대로 보인다.
    setNameInvalid(false)
    setAmountInvalid(false)
    setEndConfirmOpen(false)
    postSub.reset()
    putSub.reset()
    deleteSub.reset()
  }

  // ACCOUNT_NOT_FOUND/SUBCATEGORY_NOT_FOUND(404)는 다른 곳에서 계좌·소분류가 이미 지워졌다는 뜻이라,
  // 드롭다운 소스를 다시 불러와 더 이상 존재하지 않는 선택지가 화면에서 사라지게 한다.
  const handleMutationError = (err: unknown) => {
    if (!(err instanceof ApiError)) return
    if (err.code === 'ACCOUNT_NOT_FOUND') void accountsQuery.refetch()
    if (err.code === 'SUBCATEGORY_NOT_FOUND') void categoriesQuery.refetch()
  }

  const handleSave = () => {
    const name = state.recurName.trim()
    let hasError = false
    if (!name) {
      setNameInvalid(true)
      hasError = true
    } else {
      setNameInvalid(false)
    }
    if (state.recurAmount <= 0) {
      setAmountInvalid(true)
      hasError = true
    } else {
      setAmountInvalid(false)
    }
    const accountId = effectiveRecurAccountId
    if (!accountId || !submitSubcategoryId || hasError) return

    if (isEditing) {
      const body: UpdateSubscriptionRequest = {
        name, amount: state.recurAmount, paymentDay, accountId, subcategoryId: submitSubcategoryId,
      }
      putSub.mutate({ id: state.editingRecurId as number, body }, { onSuccess: resetAndClose, onError: handleMutationError })
    } else {
      const picked = state.dpPicked['recur'] as { y: number; m: number; d: number } | undefined
      const startedAt = picked ? pickedToISODate(picked) : undefined
      const body: CreateSubscriptionRequest = {
        name, kind: state.recurringType === 'fixed' ? 'FIXED' : 'SUBSCRIPTION', amount: state.recurAmount,
        paymentDay, accountId, subcategoryId: submitSubcategoryId, ...(startedAt ? { startedAt } : {}),
      }
      postSub.mutate(body, { onSuccess: resetAndClose, onError: handleMutationError })
    }
  }

  const handleEnd = () => {
    if (state.editingRecurId === null) return
    deleteSub.mutate(state.editingRecurId, { onSuccess: resetAndClose })
  }

  const isBusy = postSub.isPending || putSub.isPending || deleteSub.isPending
  const noCategoryAvailable = !categoriesQuery.isPending && !categoriesQuery.error && categories.length === 0
  // 계좌가 하나도 없으면 저장을 눌러도 accountId를 채울 수 없다 — "계좌 추가"로 안내하고 저장은 막는다.
  const noAccountAvailable = !accountsQuery.isPending && !accountsQuery.error && accounts.length === 0
  const canSave = !isBusy && !noCategoryAvailable && !noAccountAvailable

  const categoryErrorMessage = saveErrorCode === 'SUBCATEGORY_NOT_FOUND' ? saveError?.message : null
  const accountErrorMessage = saveErrorCode === 'ACCOUNT_NOT_FOUND' ? saveError?.message : null
  const notFoundMessage = saveErrorCode === 'RECURRING_EXPENSE_NOT_FOUND' ? saveError?.message : null
  const genericErrorMessage = saveError && !categoryErrorMessage && !accountErrorMessage && !notFoundMessage ? saveError.message : null

  const deleteErrorCode = deleteSub.error instanceof ApiError ? deleteSub.error.code : null
  const deleteErrorMessage =
    deleteErrorCode === 'RECURRING_EXPENSE_NOT_FOUND' ? '이미 종료됐거나 존재하지 않는 항목이에요.' : (deleteSub.error?.message ?? null)

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={460} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="event_repeat" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>{recurModalTitle}</div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {notFoundMessage && <div style={{ ...ERROR_STYLE, marginBottom: 14, marginTop: -8 }}>{notFoundMessage}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!isEditing && (
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
            <SegmentedTab active={state.recurringType === 'fixed'} onClick={() => setState({ recurringType: 'fixed' })} style={{ flex: 1 }}>
              고정 지출
            </SegmentedTab>
            <SegmentedTab active={state.recurringType === 'subscription'} onClick={() => setState({ recurringType: 'subscription' })} style={{ flex: 1 }}>
              구독
            </SegmentedTab>
          </div>
        )}

        <div>
          <div style={LABEL_STYLE}>이름</div>
          <input
            type="text" placeholder={recurNamePlaceholder}
            value={state.recurName}
            onChange={(e) => {
              setState({ recurName: e.target.value })
              if (nameInvalid) setNameInvalid(false)
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
          {nameInvalid && <div style={ERROR_STYLE}>이름을 입력해주세요</div>}
        </div>

        <div>
          <div style={LABEL_STYLE}>금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" placeholder="0"
              value={state.recurAmount ? fmt(state.recurAmount) : ''}
              onChange={(e) => {
                setState({ recurAmount: parseAmount(e.target.value) })
                if (amountInvalid) setAmountInvalid(false)
              }}
              style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
          {amountInvalid && <div style={ERROR_STYLE}>금액을 입력해주세요</div>}
        </div>

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
                <Dropdown dd={ddRecurCatMajor} maxHeight={200} />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Dropdown dd={ddRecurCatSub} maxHeight={200} />
              </div>
            </div>
          )}
          {categoryErrorMessage && <div style={ERROR_STYLE}>{categoryErrorMessage}</div>}
        </div>

        <div>
          <div style={LABEL_STYLE}>결제일</div>
          <div style={{ position: 'relative' }}>
            <Dropdown dd={ddRecurPayDay} maxHeight={200} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
            매월 반복돼요(주·년 단위는 아직 지원하지 않아요).
            {/* 답변서 C-7: 서버가 이미 Math.min(paymentDay, 그 달 길이)로 말일 클램프를 구현해뒀고
               이제 @Schema에도 명문화됐다 — 아래 문구는 근거 없는 단언이 아니라 확정된 서버 동작이다.
               monthStartDay(1~28)와 달리 paymentDay가 31까지 허용되는 비대칭도 의도된 설계다:
               paymentDay는 "이벤트(그 달의 결제 시점)"라 말일로 당겨도 의미가 유지되지만,
               monthStartDay는 "정산월 구간의 경계"라 31을 허용하면 인접 정산월 사이에 겹침·구멍이
               생겨 원장이 이중 집계되거나 누락된다. */}
            {paymentDay >= 29 && ' 29~31일은 그 날짜가 없는 달엔 말일에 결제돼요.'}
          </div>
        </div>

        {!isEditing && (
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>시작 날짜 (선택)</div>
            <DatePicker dp={ddRecurDate} />
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>결제수단</div>
          {accounts.length === 0 && !accountsQuery.isPending ? (
            <div style={{ ...FIELD_BORDER_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 계좌가 없어요</span>
              <button
                className="mini-hov"
                onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'fixedExpense' })}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Icon name="add" size={14} />
                계좌 추가
              </button>
            </div>
          ) : (
            <Dropdown
              dd={ddRecurPayMethod}
              maxHeight={220}
              footer={
                <>
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'fixedExpense' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <Icon name="add" size={15} />
                    계좌 추가
                  </button>
                </>
              }
            />
          )}
          {accountErrorMessage && <div style={ERROR_STYLE}>{accountErrorMessage}</div>}
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
            {activeMutation.isPending ? '저장 중…' : recurSaveLabel}
          </button>
          {isEditing && !endConfirmOpen && (
            <button
              onClick={() => setEndConfirmOpen(true)}
              disabled={isBusy}
              className="qbtn"
              style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
            >
              종료
            </button>
          )}
        </div>

        {isEditing && endConfirmOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>정말 종료할까요?</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>종료하면 다음 결제부터 자동으로 거래가 만들어지지 않아요. 이 작업은 되돌릴 수 없어요.</div>
            {deleteErrorMessage && <div style={ERROR_STYLE}>{deleteErrorMessage}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleEnd}
                disabled={isBusy}
                aria-busy={deleteSub.isPending}
                className="qbtn"
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
              >
                {deleteSub.isPending ? '종료 중…' : '종료할게요'}
              </button>
              <button
                onClick={() => setEndConfirmOpen(false)}
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
