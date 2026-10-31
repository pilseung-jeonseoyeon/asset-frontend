// 월급 나누기 창(가계부 빠른 입력 줄의 [월급 나누기]) — 월급통장에서 여러 통장으로 한 번에 이체·저축을 적고, 원하면
// 이번 달 월급(수입)도 같이 적는다. 화면 정본: docs/plan/view/월급 나누기 디자인 A·B·C.html의 A안(2026-10-31 확정).
// 계산은 data/salarySplitView.ts, 열고 닫기는 state/selectors/salarySplit.ts, 서버는 create_salary_split(전부 되거나 전부 안 됨).
//
// 흐름: 열면 서버 기억(get_salary_split_plan)으로 한 번 채운다(salarySplitFilled) → 금액을 고칠 때마다 남는 돈 · 보낸 뒤
// 잔액이 바로 바뀐다 → [월급 적고 N곳으로 보내기] → 같은 창이 완료 화면으로 바뀐다. 닫으면 적던 값은 버린다.
// 모바일 시트는 남는 돈 · 보낸 뒤 잔액 · 버튼을 아래에 고정한다 — 아래쪽 통장 금액을 고치는 동안에도 결과가 보이게.
//
// **계좌는 늘 내 계좌다**(가계부 입력과 같은 useGetAccounts({})). 계좌 추가는 드롭다운 안 [계좌 추가]로만 연다 —
// 계좌를 만들고 돌아오면(addAccountReturnTo) 적던 값은 AppState에 그대로 있다.

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { PickRow, RoundCheck, SalarySplitRow, TagButton, type SalarySplitTypeOption } from './SalarySplitRow'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useAppState } from '../../../state/AppStateContext'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { SALARY_SPLIT_DATE_KEY, closeSalarySplitUpdater } from '../../../state/selectors/salarySplit'
import type { SalarySplitResult, SalarySplitRow as SalarySplitRowValue } from '../../../state/types'
import { isoDateToDisplay, pickedToISODate, settlementMonthOf, toISODate } from '../../../utils/date'
import { MAX_KRW_AMOUNT, MAX_KRW_AMOUNT_MESSAGE, formatNumber, parseAmount } from '../../../utils/format'
import { useCurrentSettlementMonth } from '../../../utils/useCurrentSettlementMonth'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useViewScope } from '../../../utils/viewScope'
import { accountInstitutionMeta, balanceStartNoteText } from '../../../data/accountView'
import {
  SALARY_SPLIT_MAX_LINES, defaultIncomeSubcategoryIdOf, isSendingRow, krwBalanceOf, monthDayLabelOf, newSalarySplitRow, particleOf, receivingAfterOf,
  salarySplitButtonOf, salarySplitFormOf, salarySplitRequestOf, salarySplitSuggestionsOf, salarySplitTotalsOf, inSettlementMonth,
  subcategoryNameOf,
} from '../../../data/salarySplitView'
import { ApiError } from '@/services/api'
import { useGetAccounts, type AccountResponse } from '@/services/account'
import { useGetCategories } from '@/services/category'
import { useGetInstitutions } from '@/services/institution'
import { useGetSalarySplitPlan, usePostSalarySplit } from '@/services/salarySplit'
import { useGetUserSettings } from '@/services/user'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }
const LABEL_NOTE_STYLE: CSSProperties = { fontSize: 11.5, fontWeight: 500, color: 'var(--text-mid)' }
const NOTE_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.5 }
const WON_UNIT_STYLE: CSSProperties = { fontSize: '0.85em', color: 'var(--text-weak)', fontWeight: 600, marginLeft: 1 }
const PRIMARY_BUTTON_STYLE: CSSProperties = {
  flex: 1, padding: 14, minHeight: 48, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700,
  fontFamily: 'inherit', transition: 'transform .12s',
}

/** 금액 + 작은 '원'. 마이너스는 −(빼기 기호)를 붙이고 --down으로 칠한다(막지는 않는다). */
function Won({ value, size, strong }: { value: number; size?: number; strong?: boolean }) {
  return (
    <b style={{ fontSize: size, fontWeight: strong ? 700 : 600, color: value < 0 ? 'var(--down)' : 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {value < 0 ? '−' : ''}
      {formatNumber(Math.abs(value))}
      <span style={WON_UNIT_STYLE}>원</span>
    </b>
  )
}

/** 기관 아이콘이 없는 계좌 자리. */
function BlankBankIcon({ size }: { size: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size >= 32 ? 10 : 8, background: 'var(--track)', color: 'var(--text-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icon name="account_balance" size={Math.round(size * 0.5)} />
    </span>
  )
}

export function SalarySplitModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const isOpen = state.openModal === 'salarySplit'

  const planQuery = useGetSalarySplitPlan({ enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const institutions = useGetInstitutions({ enabled: isOpen }).data ?? []
  const incomeCategoriesQuery = useGetCategories('INCOME', { enabled: isOpen })
  const savingCategoriesQuery = useGetCategories('SAVING', { enabled: isOpen })
  const incomeCategories = incomeCategoriesQuery.categories
  const savingCategories = savingCategoriesQuery.categories
  const settingsQuery = useGetUserSettings({ enabled: isOpen })
  const monthStartDay = settingsQuery.settings.monthStartDay
  const currentMonth = useCurrentSettlementMonth()
  const { scope, setScope } = useViewScope()
  const postSplit = usePostSalarySplit()
  // 1조 원 이상 입력은 받지 않고(이전 값 유지) 안내만 띄운다 — format.ts MAX_KRW_AMOUNT
  const [amountTooLarge, setAmountTooLarge] = useState(false)

  const plan = planQuery.data ?? null
  // 한 달에 여러 번 보내도 된다 — 월급 체크는 이번 정산월에 월급을 이미 적었을 때만 꺼 두고, 보낸 적이 있다는 건 안내만 한다
  const incomeWrittenThisMonth = inSettlementMonth(plan?.lastIncomeOn, currentMonth, monthStartDay)
  const sentThisMonth = inSettlementMonth(plan?.lastSentOn, currentMonth, monthStartDay)
  const ready = planQuery.isSuccess && accountsQuery.isSuccess && settingsQuery.isSuccess

  // 기억으로 한 번만 채운다. 응답이 늦게 와도 그사이 사용자가 고친 값을 덮지 않게 salarySplitFilled로 막는다.
  const accountsData = accountsQuery.data
  useEffect(() => {
    if (!isOpen || state.salarySplitFilled || !ready) return
    const form = salarySplitFormOf(plan, accountsData ?? [], incomeWrittenThisMonth)
    setState({
      salarySplitFilled: true,
      salarySplitSourceId: form.sourceId,
      salarySplitIncomeOn: form.incomeOn,
      salarySplitIncomeSubcategoryId: form.incomeSubcategoryId,
      salarySplitSalary: form.salary,
      salarySplitRows: form.rows,
    })
  }, [isOpen, state.salarySplitFilled, ready, plan, accountsData, incomeWrittenThisMonth, setState])

  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const leadingOf = (account: AccountResponse | undefined, size: number): ReactNode => {
    const meta = account ? accountInstitutionMeta(account, institutions) : null
    return meta ? <BankIcon tokenKey={meta.tokenKey} size={size} /> : <BlankBankIcon size={size} />
  }
  const rows = state.salarySplitRows
  const sourceId = state.salarySplitSourceId
  const source = sourceId !== null ? accountById.get(sourceId) : undefined
  const sourceBalance = krwBalanceOf(source)
  const errorAccountIds = new Set(state.salarySplitErrorAccounts.map((a) => a.id))
  const nameOf = (accountId: number) =>
    accountById.get(accountId)?.name ?? state.salarySplitErrorAccounts.find((a) => a.id === accountId)?.name ?? '해지된 통장'

  // 수입 소분류: 고른 것이 지금도 있으면 그것, 아니면 기본값(월급 › 월급)
  const storedIncomeSubcategoryValid =
    state.salarySplitIncomeSubcategoryId !== null && subcategoryNameOf(incomeCategories, state.salarySplitIncomeSubcategoryId) !== null
  const incomeSubcategoryId = storedIncomeSubcategoryValid ? state.salarySplitIncomeSubcategoryId : defaultIncomeSubcategoryIdOf(incomeCategories)
  const incomeSubcategoryName = subcategoryNameOf(incomeCategories, incomeSubcategoryId)

  const todayIso = toISODate(new Date())
  const datePicker = useDatePicker(SALARY_SPLIT_DATE_KEY, isoDateToDisplay(todayIso))
  const pickedDate = state.datePickerPicked[SALARY_SPLIT_DATE_KEY] as { y: number; m: number; d: number } | undefined
  const isoDate = pickedDate ? pickedToISODate(pickedDate) : todayIso

  const totals = salarySplitTotalsOf({ incomeOn: state.salarySplitIncomeOn, salary: state.salarySplitSalary, rows }, sourceBalance)
  const button = salarySplitButtonOf({
    pending: postSplit.isPending,
    hasError: !!postSplit.error,
    sourceId: source ? sourceId : null,
    incomeOn: state.salarySplitIncomeOn,
    salary: state.salarySplitSalary,
    incomeSubcategoryId,
    rows,
    totals,
  })

  // 지난 실패 문구는 값을 고치는 순간 지운다 — 남겨 두면 고친 뒤에도 틀린 것처럼 보인다
  const clearError = () => {
    if (postSplit.error) postSplit.reset()
  }

  const pickSource = (id: number) => {
    clearError()
    setState((prev) => {
      const index = prev.salarySplitRows.findIndex((r) => r.accountId === id)
      if (index < 0) return { salarySplitSourceId: id, salarySplitErrorAccounts: prev.salarySplitErrorAccounts.filter((a) => a.id !== id) }
      return {
        salarySplitSourceId: id,
        salarySplitRows: prev.salarySplitRows.filter((r) => r.accountId !== id),
        salarySplitRemoved: { row: prev.salarySplitRows[index], index, name: nameOf(id), reason: 'source' },
        salarySplitMenu: null,
      }
    })
  }
  const addRow = (id: number) => {
    const account = accountById.get(id)
    if (!account) return
    clearError()
    setState((prev) =>
      prev.salarySplitRows.length >= SALARY_SPLIT_MAX_LINES || prev.salarySplitRows.some((r) => r.accountId === id)
        ? {}
        : { salarySplitRows: [...prev.salarySplitRows, newSalarySplitRow(account, savingCategories)], salarySplitRemoved: null, salarySplitMenu: null },
    )
  }
  const updateRow = (accountId: number, patch: Partial<SalarySplitRowValue>) =>
    setState((prev) => ({ salarySplitRows: prev.salarySplitRows.map((r) => (r.accountId === accountId ? { ...r, ...patch } : r)) }))
  const changeRowAmount = (accountId: number, raw: string) => {
    const next = parseAmount(raw)
    if (next > MAX_KRW_AMOUNT) {
      setAmountTooLarge(true)
      return
    }
    setAmountTooLarge(false)
    clearError()
    updateRow(accountId, { amount: next })
  }
  const toggleRow = (row: SalarySplitRowValue) => {
    clearError()
    setState((prev) => ({
      salarySplitRows: prev.salarySplitRows.map((r) => (r.accountId === row.accountId ? { ...r, on: !r.on } : r)),
      salarySplitErrorAccounts: row.on ? prev.salarySplitErrorAccounts.filter((a) => a.id !== row.accountId) : prev.salarySplitErrorAccounts,
    }))
  }
  const removeRow = (row: SalarySplitRowValue) => {
    clearError()
    setState((prev) => {
      const index = prev.salarySplitRows.findIndex((r) => r.accountId === row.accountId)
      if (index < 0) return {}
      return {
        salarySplitRows: prev.salarySplitRows.filter((r) => r.accountId !== row.accountId),
        salarySplitRemoved: { row: prev.salarySplitRows[index], index, name: nameOf(row.accountId), reason: 'remove' },
        salarySplitErrorAccounts: prev.salarySplitErrorAccounts.filter((a) => a.id !== row.accountId),
        salarySplitMenu: null,
      }
    })
  }
  const undoRemove = () =>
    setState((prev) => {
      const removed = prev.salarySplitRemoved
      if (!removed || removed.reason !== 'remove' || prev.salarySplitRows.some((r) => r.accountId === removed.row.accountId)) return { salarySplitRemoved: null }
      const next = [...prev.salarySplitRows]
      next.splice(Math.min(removed.index, next.length), 0, removed.row)
      return { salarySplitRows: next, salarySplitRemoved: null }
    })
  const toggleMenu = (key: 'income' | number) => setState((prev) => ({ salarySplitMenu: prev.salarySplitMenu === key ? null : key }))
  const pickRowType = (accountId: number, option: SalarySplitTypeOption) => {
    clearError()
    setState((prev) => ({
      salarySplitRows: prev.salarySplitRows.map((r) => (r.accountId === accountId ? { ...r, type: option.type, subcategoryId: option.subcategoryId } : r)),
      salarySplitMenu: null,
    }))
  }
  const changeSalary = (raw: string) => {
    const next = parseAmount(raw)
    if (next > MAX_KRW_AMOUNT) {
      setAmountTooLarge(true)
      return
    }
    setAmountTooLarge(false)
    clearError()
    setState({ salarySplitSalary: next })
  }

  const close = () => {
    if (postSplit.isPending) return   // 보내는 중에는 닫지 않는다(결과를 못 보고 한 번 더 보내는 일을 막는다)
    postSplit.reset()
    setAmountTooLarge(false)
    setState(closeSalarySplitUpdater)
  }

  const handleSend = () => {
    if (!button.enabled || postSplit.isPending || sourceId === null || !source) return
    const body = salarySplitRequestOf({
      sourceId, isoDate, incomeOn: state.salarySplitIncomeOn, salary: state.salarySplitSalary, incomeSubcategoryId, rows,
    })
    // 완료 화면 값은 보내는 순간의 이름·잔액으로 만든다 — 성공하면 목록이 무효화돼 잔액이 바뀐다
    const result: SalarySplitResult = {
      isoDate,
      income: totals.incomeOk && incomeSubcategoryId !== null ? { amount: state.salarySplitSalary, subcategoryName: incomeSubcategoryName ?? '수입' } : null,
      lines: rows.filter(isSendingRow).map((r) => {
        const balance = krwBalanceOf(accountById.get(r.accountId))
        return {
          accountId: r.accountId,
          name: nameOf(r.accountId),
          type: r.type,
          subcategoryName: r.type === 'SAVING' ? subcategoryNameOf(savingCategories, r.subcategoryId) : null,
          amount: r.amount,
          after: balance === null ? null : balance + r.amount,
        }
      }),
      remain: totals.incomeOk ? totals.remain : null,
      sourceName: source.name,
      sourceAfter: totals.sourceAfter,
    }
    const namesAtSend = new Map(accounts.map((a) => [a.id, a.name]))
    const idsAtSend = [sourceId, ...rows.map((r) => r.accountId)]
    postSplit.mutate(body, {
      onSuccess: () => setState({ salarySplitView: 'done', salarySplitResult: result, salarySplitMenu: null, salarySplitRemoved: null, salarySplitErrorAccounts: [] }),
      onError: (err) => {
        if (!(err instanceof ApiError)) return
        if (err.code === 'SUBCATEGORY_NOT_FOUND') {
          void incomeCategoriesQuery.refetch()
          void savingCategoriesQuery.refetch()
        }
        // 다른 곳에서 해지·삭제된 통장이 섞였다 — 목록을 다시 받아 사라진 통장을 짚는다(서버 오류에는 어느 통장인지가 없다)
        if (err.code === 'ACCOUNT_NOT_FOUND' || err.code === 'ACCOUNT_CLOSED') {
          void accountsQuery.refetch().then((fresh) => {
            const open = new Set((fresh.data ?? []).map((a) => a.id))
            const gone = idsAtSend.filter((id) => !open.has(id))
            setState((prev) => ({
              salarySplitErrorAccounts: gone.map((id) => ({ id, name: namesAtSend.get(id) ?? '해지된 통장' })),
              ...(prev.salarySplitSourceId !== null && gone.includes(prev.salarySplitSourceId) ? { salarySplitSourceId: null } : null),
            }))
          })
        }
      },
    })
  }

  const goHistory = () => {
    const result = state.salarySplitResult
    const target = result ? settlementMonthOf(result.isoDate, monthStartDay) : null
    const isCurrent = !target || (target.year === currentMonth.year && target.month === currentMonth.month)
    postSplit.reset()
    // 월급 나누기는 내 통장 거래라 '우리집' 내역에는 (공유 계좌가 아니면) 안 보인다 — 방금 보낸 거래가 보이게 '개인'으로 바꾼다
    if (scope === 'SHARED') setScope('PERSONAL')
    setState((prev) => ({
      ...closeSalarySplitUpdater(prev),
      ledgerTab: 'history',
      ledgerSelectedDate: null,
      ledgerSearch: '',
      ...(isCurrent || !target ? { ledgerCursorFollowsCurrent: true } : { ledgerCursorFollowsCurrent: false, ledgerYear: target.year, ledgerMonth: target.month }),
    }))
  }

  // 드롭다운 두 개 — 월급통장, 받는 통장 추가. 둘 다 펼친 목록 맨 아래 [계좌 추가]
  const sourceDropdown = useEntityDropdown(
    'salarySplitSource', accounts, (a) => a.id, (a) => a.name, source ? sourceId : null, pickSource,
    (a) => `지금 잔액 ${formatNumber(krwBalanceOf(a) ?? 0)}원`, (a) => leadingOf(a, 28),
  )
  const addCandidates = accounts.filter((a) => a.id !== sourceId && !rows.some((r) => r.accountId === a.id))
  const addDropdown = useEntityDropdown(
    'salarySplitAdd', addCandidates, (a) => a.id, (a) => a.name, null, addRow,
    (a) => accountInstitutionMeta(a, institutions)?.institutionName, (a) => leadingOf(a, 28),
  )
  const addAccountFooter = (hasOptions: boolean) => (
    <>
      {hasOptions && <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />}
      {!hasOptions && <div style={{ padding: '8px 10px 4px', fontSize: 12, color: 'var(--text-weak)' }}>고를 수 있는 계좌가 없어요</div>}
      <button
        type="button"
        className="mini-hov"
        onClick={() => setState({ openModal: 'addAccount', addAccountReturnTo: 'salarySplit', openDropdown: null })}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none',
          background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
        }}
      >
        <Icon name="add" size={15} />
        계좌 추가
      </button>
    </>
  )

  if (!isOpen) return null

  const savingTypeOptions: SalarySplitTypeOption[] = [
    { type: 'TRANSFER', subcategoryId: null, label: '이체' },
    ...savingCategories.flatMap((c) => c.subcategories.map((s) => ({ type: 'SAVING' as const, subcategoryId: s.id, label: `저축 · ${s.name}` }))),
  ]
  const incomeOptions = incomeCategories.flatMap((c) => c.subcategories.map((s) => ({ key: String(s.id), label: `수입 · ${s.name}`, tone: 'income' as const })))
  const suggestions = !plan && state.salarySplitFilled && rows.length < SALARY_SPLIT_MAX_LINES ? salarySplitSuggestionsOf(accounts, sourceId, rows) : []
  const sendingAccounts = rows.filter(isSendingRow).map((r) => accountById.get(r.accountId))
  const balanceNote = balanceStartNoteText([source, ...sendingAccounts], isoDate, '가계부')
  const removed = state.salarySplitRemoved

  const errorAccounts = state.salarySplitErrorAccounts
  const errorText = postSplit.error
    ? errorAccounts.length > 0
      ? `보내지 못했어요. ${errorAccounts.map((a) => `‘${a.name}’`).join(', ')}${particleOf(errorAccounts[errorAccounts.length - 1].name, '이가')} 해지되었거나 없어졌어요. 그 통장을 빼거나 다른 통장을 골라 다시 보내 주세요. 아무것도 등록되지 않았어요.`
      : `보내지 못했어요. ${postSplit.error.message} 아무것도 등록되지 않았으니 다시 보내 주세요.`
    : null

  // 창 맨 위 안내(배경 없는 한 줄 — A안)
  const notices: { icon: string; text: ReactNode }[] = []
  if (state.salarySplitFilled) {
    if (!plan) notices.push({ icon: 'info', text: '처음이에요. 월급과 받는 통장을 적어 한 번 보내면, 다음 달부터 그대로 채워 드려요.' })
    else if (incomeWrittenThisMonth && plan.lastIncomeOn) {
      notices.push({
        icon: 'event_repeat',
        text: <>이번 달 월급은 <b style={{ color: 'var(--text-strong)' }}>{monthDayLabelOf(plan.lastIncomeOn)}</b>에 이미 적어서 '수입으로 적기'를 꺼 뒀어요. 보내면 이체·저축만 한 번 더 등록돼요.</>,
      })
    } else if (sentThisMonth && plan.lastSentOn) {
      notices.push({
        icon: 'history',
        text: <>이번 달 <b style={{ color: 'var(--text-strong)' }}>{monthDayLabelOf(plan.lastSentOn)}</b>에도 보냈어요. 지난번 금액을 채워 뒀으니 <b style={{ color: 'var(--text-strong)' }}>확인하고</b> 보내 주세요. 보내면 그때와 별개로 한 번 더 등록돼요.</>,
      })
    } else if (plan.lastSentOn) {
      notices.push({
        icon: 'history',
        text: <>{monthDayLabelOf(plan.lastSentOn)}에 적은 월급과 금액을 그대로 채워 뒀어요. <b style={{ color: 'var(--text-strong)' }}>확인하고</b> 보내기를 눌러 주세요. 자동으로 보내지는 않아요.</>,
      })
    }
    if (plan && plan.droppedCount > 0) notices.push({ icon: 'link_off', text: `해지된 통장 ${plan.droppedCount}곳은 목록에서 뺐어요.` })
  }

  const header = (title: string, sub?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18, ...sheetStickyHeaderStyle(isMobile) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="call_split" size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-weak)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        disabled={postSplit.isPending}
        aria-label="닫기"
        style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: postSplit.isPending ? 'default' : 'pointer', flex: 'none' }}
      >
        <Icon name="close" size={19} color="var(--text-mid)" />
      </button>
    </div>
  )

  // 모바일은 아래에 고정, 웹은 내용 끝에 그대로 둔다. sticky는 스크롤 영역의 패딩 안쪽을 기준으로 멈추므로
  // 시트 패널의 아래 패딩(Modal이 강제하는 20px + 안전 영역)만큼 bottom·margin을 음수로 줘 화면 바닥에 붙인다 —
  // 0이면 그 띠만큼 떠서 아래로 목록이 비쳐 보인다.
  const footStyle: CSSProperties = isMobile
    ? {
        position: 'sticky', bottom: 'calc(-20px - env(safe-area-inset-bottom))', zIndex: 3, background: 'var(--surface)', borderTop: '0.5px solid var(--border)',
        margin: '0 -18px calc(-20px - env(safe-area-inset-bottom))', padding: '10px 18px calc(20px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 10,
      }
    : { display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <Modal onClose={close} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />}

      {state.salarySplitView === 'done' && state.salarySplitResult ? (
        <DoneView
          result={state.salarySplitResult}
          header={header('한번에 이체하기')}
          leadingOf={(id, size) => leadingOf(accountById.get(id), size)}
          onHistory={goHistory}
          onClose={close}
        />
      ) : (
        <>
          {header('한번에 이체하기', '월급을 적고 여러 통장으로 한 번에 보내요')}
          {!state.salarySplitFilled ? (
            <div style={{ padding: '24px 0', textAlign: 'center', ...NOTE_STYLE }}>
              {/* 폼은 기억 · 계좌 · 설정(월 시작일) 셋이 다 와야 채운다 — 하나라도 실패하면 여기서 다시 불러온다 */}
              {planQuery.error || accountsQuery.error || settingsQuery.error ? (
                <>
                  <div style={{ color: 'var(--down)', marginBottom: 10 }}>{(planQuery.error ?? accountsQuery.error ?? settingsQuery.error)?.message}</div>
                  <button
                    type="button"
                    onClick={() => { void planQuery.refetch(); void accountsQuery.refetch(); void settingsQuery.refetch() }}
                    style={{ minHeight: 44, padding: '0 16px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-strong)' }}
                  >
                    다시 불러오기
                  </button>
                </>
              ) : (
                <span aria-busy>불러오는 중…</span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {notices.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notices.map((n) => (
                    <div key={n.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>
                      <Icon name={n.icon} size={15} color="var(--text-mid)" style={{ marginTop: 2 }} />
                      <span>{n.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <div style={LABEL_STYLE}>월급이 들어온 통장</div>
                <Dropdown
                  dropdown={sourceDropdown}
                  maxHeight={220}
                  selectedMeta={source ? `지금 잔액 ${formatNumber(sourceBalance ?? 0)}원` : ''}
                  selectedLeading={source ? leadingOf(source, 24) : undefined}
                  placeholder="통장을 골라 주세요"
                  footer={addAccountFooter(accounts.length > 0)}
                />
              </div>

              {/* 월급 상자 — '수입으로 적기'를 켜면 월급통장에 수입으로 함께 적힌다 */}
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '2px 16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>이번 달 월급</span>
                  <RoundCheck
                    checked={state.salarySplitIncomeOn}
                    label="이번 달 월급도 수입으로 적기"
                    text="수입으로 적기"
                    onChange={() => {
                      clearError()
                      setState({ salarySplitIncomeOn: !state.salarySplitIncomeOn })
                    }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'baseline', gap: 6, cursor: 'text' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="next"
                    placeholder="0"
                    aria-label="이번 달 월급"
                    disabled={!state.salarySplitIncomeOn}
                    value={state.salarySplitSalary ? formatNumber(state.salarySplitSalary) : ''}
                    onChange={(e) => changeSalary(e.target.value)}
                    style={{
                      border: 'none', outline: 'none', background: 'transparent', padding: 0, width: '100%', minWidth: 0, fontSize: 26, fontWeight: 700,
                      fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', color: state.salarySplitIncomeOn ? 'var(--text-strong)' : 'var(--text-weak)',
                    }}
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 24 }}>
                  <TagButton tone="income" label={`수입 · ${incomeSubcategoryName ?? '소분류 고르기'}`} open={state.salarySplitMenu === 'income'} onClick={() => toggleMenu('income')} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>{state.salarySplitIncomeOn ? '이미 적었다면 체크를 풀어요' : '수입은 적지 않아요'}</span>
                </div>
                {state.salarySplitMenu === 'income' && (
                  <PickRow
                    label="수입 소분류"
                    indent={0}
                    options={incomeOptions}
                    isSelected={(key) => key === String(incomeSubcategoryId)}
                    onPick={(key) => setState({ salarySplitIncomeSubcategoryId: Number(key), salarySplitMenu: null })}
                  />
                )}
              </div>

              <div>
                <div style={LABEL_STYLE}>
                  <span>받는 통장</span>
                  <span style={LABEL_NOTE_STYLE}>체크를 풀면 이번 달만 건너뛰어요</span>
                </div>
                {rows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '18px 10px', borderRadius: 10, background: 'var(--fill-subtle)', fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.55 }}>
                    <b style={{ display: 'block', color: 'var(--text-strong)', fontSize: 13.5, marginBottom: 4 }}>아직 나눈 적이 없어요</b>
                    받는 통장을 추가해 주세요. 한 번 보내면 다음 달엔 그대로 채워 드려요.
                  </div>
                ) : (
                  <div>
                    {rows.map((row, index) => (
                      <SalarySplitRow
                        key={row.accountId}
                        row={row}
                        index={index}
                        name={nameOf(row.accountId)}
                        leading={leadingOf(accountById.get(row.accountId), isMobile ? 32 : 34)}
                        subcategoryName={row.type === 'SAVING' ? subcategoryNameOf(savingCategories, row.subcategoryId) : null}
                        after={receivingAfterOf(row, krwBalanceOf(accountById.get(row.accountId)))}
                        failed={errorAccountIds.has(row.accountId)}
                        menuOpen={state.salarySplitMenu === row.accountId}
                        typeOptions={savingTypeOptions}
                        isMobile={isMobile}
                        onToggle={() => toggleRow(row)}
                        onAmountChange={(raw) => changeRowAmount(row.accountId, raw)}
                        onToggleMenu={() => toggleMenu(row.accountId)}
                        onPickType={(option) => pickRowType(row.accountId, option)}
                        onRemove={() => removeRow(row)}
                      />
                    ))}
                  </div>
                )}

                {removed && (
                  <div role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, padding: '0 4px 0 12px', minHeight: 44, borderRadius: 10, background: 'var(--track)', fontSize: 12, color: 'var(--text-mid)' }}>
                    <span>
                      {removed.reason === 'source'
                        ? `‘${removed.name}’${particleOf(removed.name, '은는')} 월급통장으로 골라서 받는 통장에서 뺐어요.`
                        : `‘${removed.name}’${particleOf(removed.name, '을를')} 목록에서 뺐어요. 다음 달에도 안 보여요.`}
                    </span>
                    {removed.reason === 'remove' && (
                      <button type="button" onClick={undoRemove} style={{ border: 'none', background: 'transparent', color: 'var(--text-strong)', fontWeight: 700, fontSize: 12, minHeight: 44, padding: '0 10px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', flex: 'none' }}>
                        되돌리기
                      </button>
                    )}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--track)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8 }}>
                      <Icon name="lightbulb" size={15} />
                      {rows.length > 0 ? '이 통장들도 넣어 볼까요?' : '이 통장들을 넣어 볼까요?'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {suggestions.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => addRow(a.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 12px 0 8px', borderRadius: 999, border: '0.5px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-strong)', fontFamily: 'inherit', maxWidth: '100%' }}
                        >
                          {leadingOf(a, 24)}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                          <Icon name="add" size={16} color="var(--text-mid)" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {rows.length < SALARY_SPLIT_MAX_LINES && (
                  <div style={{ position: 'relative', marginTop: 10 }}>
                    <Dropdown dropdown={addDropdown} maxHeight={220} icon="add" placeholder="받는 통장 추가" footer={addAccountFooter(addCandidates.length > 0)} />
                  </div>
                )}
                {amountTooLarge && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>{MAX_KRW_AMOUNT_MESSAGE}</div>}
              </div>

              {/* 영수증 — 월급 − 보낼 합계 = 남는 돈, 보낸 뒤 월급통장 잔액 */}
              <div style={{ borderRadius: 10, background: 'var(--fill-subtle)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                {state.salarySplitIncomeOn && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-mid)' }}>
                    <span>월급</span>
                    <Won value={state.salarySplitSalary} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-mid)' }}>
                  <span>{state.salarySplitIncomeOn ? '− ' : ''}{totals.count}곳에 보내는 합계</span>
                  <Won value={totals.sum} />
                </div>
                {state.salarySplitIncomeOn && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingTop: 8, marginTop: 2, borderTop: '0.5px dashed var(--text-weak)' }}>
                    <span style={{ color: 'var(--text-strong)', fontWeight: 700 }}>월급에서 남는 돈</span>
                    <Won value={totals.remain} size={18} strong />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, color: 'var(--text-mid)' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>보낸 뒤 {source?.name ?? '월급통장'} 잔액</span>
                  {totals.sourceAfter === null ? <b>—</b> : <Won value={totals.sourceAfter} strong />}
                </div>
                {totals.sourceAfter !== null && totals.sourceAfter < 0 && (
                  <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--down)' }}>잔액이 모자라요 · 그래도 보낼 수 있어요</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4, color: 'var(--text-mid)', fontSize: 11.5 }}>
                  <span>보내는 날짜</span>
                  <div style={{ width: isMobile ? 156 : 172, position: 'relative' }}>
                    <DatePicker dp={datePicker} />
                  </div>
                </div>
                {balanceNote && <div style={NOTE_STYLE}>{balanceNote}</div>}
              </div>

              <div style={footStyle}>
                {errorText && (
                  <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--down-chip)', fontSize: 12, color: 'var(--text-strong)', lineHeight: 1.5 }}>
                    <Icon name="error" size={15} color="var(--down)" style={{ marginTop: 2 }} />
                    <span>{errorText}</span>
                  </div>
                )}
                {isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                    {state.salarySplitIncomeOn && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, color: 'var(--text-mid)' }}>
                        <span>월급에서 남는 돈</span>
                        <Won value={totals.remain} strong />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, color: 'var(--text-mid)' }}>
                      <span>보낸 뒤 월급통장 잔액</span>
                      {totals.sourceAfter === null ? <b>—</b> : <Won value={totals.sourceAfter} size={14} strong />}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!button.enabled}
                  aria-busy={postSplit.isPending}
                  className="qbtn"
                  style={{ ...PRIMARY_BUTTON_STYLE, cursor: button.enabled ? 'pointer' : 'default', opacity: button.enabled ? 1 : 0.7 }}
                >
                  {button.label}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

/** 보낸 뒤 같은 창이 바뀌는 완료 화면. */
function DoneView({ result, header, leadingOf, onHistory, onClose }: {
  result: SalarySplitResult
  header: ReactNode
  leadingOf: (accountId: number, size: number) => ReactNode
  onHistory: () => void
  onClose: () => void
}) {
  const count = result.lines.length
  const recorded = count + (result.income ? 1 : 0)
  const headline = result.income && count > 0 ? `월급을 적고 ${count}곳으로 보냈어요` : result.income ? '월급을 적었어요' : `${count}곳으로 보냈어요`
  const month = Number(result.isoDate.slice(5, 7))
  const lineStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid var(--border)' }
  const staticTag = (label: string, tone: 'transfer' | 'saving' | 'income') => (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 8, fontSize: 11, fontWeight: 700, marginTop: 2,
        background: tone === 'income' ? 'var(--up-chip)' : tone === 'saving' ? 'var(--sav-chip)' : 'var(--track)',
        color: tone === 'income' ? 'var(--inc-text)' : tone === 'saving' ? 'var(--sav-text)' : 'var(--text-mid)',
      }}
    >
      {label}
    </span>
  )
  return (
    <>
      {header}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <span style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--up-chip)', color: 'var(--up)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check_circle" size={30} />
          </span>
          <b style={{ fontSize: 17, fontWeight: 700 }}>{headline}</b>
          <span style={{ fontSize: 12, color: 'var(--text-weak)', lineHeight: 1.5 }}>
            가계부 내역 {monthDayLabelOf(result.isoDate)}에 거래 {recorded}건이 들어갔어요.
            <br />
            다음 달에 열면 이 월급과 금액을 그대로 채워 둘게요.
          </span>
        </div>

        <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '4px 14px' }}>
          {result.income && (
            <div style={lineStyle}>
              <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--up-chip)', color: 'var(--inc-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="payments" size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}>
                {month}월 월급
                <br />
                {staticTag(`수입 · ${result.income.subcategoryName}`, 'income')}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--inc-text)', whiteSpace: 'nowrap' }}>+{formatNumber(result.income.amount)}원</div>
            </div>
          )}
          {result.lines.map((line, index) => (
            <div key={line.accountId} style={{ ...lineStyle, borderBottom: index === result.lines.length - 1 ? 'none' : lineStyle.borderBottom }}>
              {leadingOf(line.accountId, 28)}
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</div>
                {staticTag(line.type === 'SAVING' ? `저축 · ${line.subcategoryName ?? ''}` : '이체', line.type === 'SAVING' ? 'saving' : 'transfer')}
                {line.after !== null && <div style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500, marginTop: 2 }}>보낸 뒤 {formatNumber(line.after)}원</div>}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', color: line.type === 'SAVING' ? 'var(--sav-text)' : 'var(--text-strong)' }}>
                {formatNumber(line.amount)}원
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
          {result.remain !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-mid)' }}>
              <span>월급에서 남는 돈</span>
              <Won value={result.remain} strong />
            </div>
          )}
          {result.sourceAfter !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text-mid)' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>보낸 뒤 {result.sourceName} 잔액</span>
              <Won value={result.sourceAfter} strong />
            </div>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-mid)', textAlign: 'center' }}>잘못 적었다면 가계부 내역에서 한 건씩 고칠 수 있어요.</div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onHistory}
            className="qbtn"
            style={{ flex: 1, padding: 14, minHeight: 48, borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text-strong)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            내역 보기
          </button>
          <button type="button" onClick={onClose} className="qbtn" style={{ ...PRIMARY_BUTTON_STYLE, cursor: 'pointer' }}>
            닫기
          </button>
        </div>
      </div>
    </>
  )
}
