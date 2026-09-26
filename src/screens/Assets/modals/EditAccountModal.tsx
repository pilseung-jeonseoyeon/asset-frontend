// 계좌 수정 모달. GET/PATCH/DELETE /accounts/{id}에 연결돼 있다.
// z-index 90, 너비 480px, maxHeight 90vh, padding '42px 30px'(기본 30px이 아니다).
//
// 예적금 계좌는 이자율·개설일·만기일도 고칠 수 있다(2026-09-26 — 이제 GET 응답에 세 값이 모두 오므로
// 현재 값으로 채워 두고 PATCH에 싣는다. PATCH는 null이면 지우고, 생략하면 유지한다).
//
// 금융기관도 이 모달에서 읽기 전용이다(제품 결정 — 계좌 번호가 이미 정해져 있는데 기관이 달라질 일이
// 없다). 서버가 내려준 institutionName을 보여주기만 하고 PATCH body에는 institutionId를 싣지 않는다.
// 기관을 고를 일이 없으므로 이 모달은 GET /institutions를 아예 호출하지 않는다 —
// AccountRes.institutionId가 그대로 내려온다(무기관 계좌는 null). 기관을 잘못 고른 계좌는 해지 후
// 다시 등록하는 것이 제품 흐름이다.
//
// 자산 유형도 읽기 전용이다(제품 결정). 이미 만들어진 계좌의 성격을 수정 화면에서 갈아끼우는 건
// 사용자 기대와 어긋난다. 그래서 선택 UI 대신 현재 값만 보여준다. 라벨은 자산 화면 카드와 같은
// 5분류(assetClassMetaOf)를 쓴다. 계좌를 만들 때는 유형을 골라야 하므로 AddAccountModal의 칩은 그대로 둔다.
//
// **저장 중에는 닫히지 않는다.** handleSave는 계좌 정보 PATCH → 성공 시 잔액 PATCH를 per-call
// onSuccess로 체이닝한다. TanStack Query v5의 MutationObserver.reset()은 진행 중인 mutation에서
// 옵저버를 즉시 떼어내(`#currentMutation?.removeObserver(this)`) 응답이 도착해도 per-call onSuccess가
// 호출되지 않는다. resetAndClose가 그 reset()들을 부르므로, 저장이 끝나기 전에 X나 배경 클릭으로
// 닫으면 이름은 저장되고 잔액 정정 체인만 에러 없이 조용히 사라진다. 그래서 resetAndClose 맨 앞에서
// isBusy를 확인해 진행 중이면 아무것도 하지 않는다 — X 버튼과 Modal의 배경 클릭 모두 이 함수 하나를
// 거치므로 두 경로가 함께 막힌다.
//
// 잔액 입력(balanceKrwInput)은 number | null이다. null은 '입력칸을 비워둔 채(아직 값을 안 씀)'를
// 뜻한다 — 숫자 하나로만 관리하면 사용자가 값을 고치려 칸을 전체 지우는 순간 빈 문자열이 0으로
// 해석되어, 다시 채우기 전에 저장을 누르면 잔액이 실수로 0원 정정된다. 안전 정수 범위를 벗어나는
// 값도 같은 자리에서 막는다.
//
// **GET /accounts/{id}만 응답이 한 겹 감싸져 있다**(AccountDetailResponse) — accountQuery.data는
// 계좌 자체가 아니라 { account, holdingValueKrw, totalValueKrw }다. 이 모달은 계좌 정보만 다루므로
// .account만 꺼내 쓴다(보유 종목 평가액은 계좌 상세 모달이 쓴다).
//
// **잔액 정정은 통화별이다**(2026-09-26 계약 변경 — PATCH .../balance가 { balance, currency }를 받는다).
// 원화 칸은 balances의 원화 줄(예수금)과 비교해 바뀌었을 때만 KRW로, 달러 칸은 달러 줄이 있는 주식·가상자산
// 계좌에서만 보이고 바뀌었을 때만 USD로 보낸다. 예전엔 달러 줄이 있으면 서버가 400으로 거절해 칸을
// 통째로 잠갔지만, 그 제약은 사라졌다. 두 통화를 모두 고치면 원화 → 달러 순서로 하나씩 보낸다.
//
// 달러·원화 예수금은 balances의 통화별 줄에서 그대로 꺼내 함께 보여준다. balanceKrw ÷ 환율로
// 역산하지 않는다 — 환율은 프론트가 다루지 않는다.
// balanceKrw는 두 예수금을 합친 값이라 '예수금 합계 (원화)'로 따로 보여준다 — **보유 종목 평가액은
// 포함하지 않으므로 '평가액'이라고 부르지 않는다**(그 값은 계좌 상세 모달의 총 평가액이다).
// 환차익/환차손은 서버 응답에 없으므로 그리지 않는다.

import { useEffect, useState } from 'react'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { isoDateToDisplay, isoDateToViewingMonth, pickedToISODate, toISODate } from '../../../utils/date'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import {
  MAX_KRW_AMOUNT,
  MAX_KRW_AMOUNT_MESSAGE,
  MAX_USD_AMOUNT,
  MAX_USD_AMOUNT_MESSAGE,
  formatNumber,
  formatUsd,
  sanitizeDecimalInput,
} from '../../../utils/format'
import {
  accountBalanceOf,
  assetClassMetaOf,
  assetClassOfAccountType,
  hasUsdBalance,
} from '../../../data/assetsView'
import { ApiError } from '@/services/api'
import { useDeleteAccount, useGetAccount, usePatchAccount, usePatchAccountBalance } from '@/services/account'
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
  const accountId = state.editingAccountId
  const isOpen = state.openModal === 'editAccount' && accountId !== null
  const form = state.accountForm
  // AddAccountModal과 동일한 이유(좁은 폭에서 Dropdown 팝오버가 잘림)로 모바일에서 세로로 쌓는다.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const patchAccount = usePatchAccount()
  const patchAccountBalance = usePatchAccountBalance()
  const deleteAccount = useDeleteAccount()
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  // 이름 필드도 AddAccountModal의 nameInvalid와 같은 패턴으로 검증한다 — 이름을 비운 채
  // 저장을 누르면 handleSave가 조용히 return해 아무 반응이 없었다.
  const [nameInvalid, setNameInvalid] = useState(false)
  // 잔액은 accountForm이 아니라 별도 로컬 상태로 둔다 — PATCH /accounts/{id}가 아니라 전용 잔액 정정
  // API(PATCH /accounts/{id}/balance)로 나가는 별개의 요청이라 accountForm의 필드가 아니다.
  // number | null인 이유는 파일 상단 주석 참고 — null은 "칸을 비워둔 채", 0은 "실제로 0을 입력함".
  const [balanceKrwInput, setBalanceKrwInput] = useState<number | null>(null)
  // 칸을 비워둔 채 저장을 시도했을 때만 보여준다(타이핑 중간에는 아직 에러가 아니다) — nameInvalid와
  // 같은 톤. 오버플로는 반대로 값이 채워져 있는 채로 너무 크다는 뜻이라 즉시(타이핑 중에도) 알려준다.
  const [balanceEmptyError, setBalanceEmptyError] = useState(false)

  // 상세 응답은 { account, ... } 한 겹 안에 들어 있다(파일 상단 주석) — 이 모달은 계좌 정보만 쓴다.
  const account = accountQuery.data?.account
  // 표시할 자산군은 서버가 내려준 계좌 유형에서 역산한다(이제 1:1이라 접히는 세부 타입이 없다).
  const selectedAssetClass = assetClassOfAccountType(form.type)
  const assetClassMeta = assetClassMetaOf(selectedAssetClass)
  // 잔액 입력 상한 — 1조 원 이상은 입력을 받지 않고 안내만 띄운다(format.ts MAX_KRW_AMOUNT). 16자리를 넘으면
  // JS 숫자가 끝자리를 잃어 입력과 다른 금액이 보이고 서버로 나가기 때문이다.
  const [isBalanceOverflow, setIsBalanceOverflow] = useState(false)
  // 달러 예수금 입력 — 센트가 있어 문자열로 들고 있다가 저장 때 숫자로 바꾼다(AddAccountModal과 같은 이유).
  const [usdInput, setUsdInput] = useState('')
  const [usdOverflow, setUsdOverflow] = useState(false)
  const [interestRateStr, setInterestRateStr] = useState('')
  const dpOpened = useDatePicker(
    'editAccountOpened',
    form.openedAt ? isoDateToDisplay(form.openedAt) : '선택 안 함',
    isoDateToViewingMonth(form.openedAt),
  )
  const dpMaturity = useDatePicker(
    'editAccountMaturity',
    form.maturityDate ? isoDateToDisplay(form.maturityDate) : '선택 안 함',
    isoDateToViewingMonth(form.maturityDate),
  )

  // 달러 줄이 있는 계좌는 원화·달러 예수금을 따로 보여주고 각각 정정한다(파일 상단 주석).
  const hasForeignCurrencyDeposit = !!account && hasUsdBalance(account)
  // USD 정정은 주식·가상자산 계좌만 된다(그 외는 400 FOREIGN_CASH_ACCOUNT_NOT_ALLOWED).
  const canEditUsd = hasForeignCurrencyDeposit && (form.type === 'STOCK' || form.type === 'CRYPTO')
  const usdCash = account ? accountBalanceOf(account, 'USD')?.amount ?? null : null
  const krwCash = account ? accountBalanceOf(account, 'KRW')?.amount ?? 0 : 0
  const isDeposit = form.type === 'DEPOSIT'

  // 폼 초기값 채우기(예외적으로 허용 — docs/state-management.md "서버 데이터를 AppState로 복사하지
  // 말 것. 단, 폼 초기값을 채우는 것은 예외").
  //
  // 렌더 도중에 setState를 부르면 안 된다. 여기서의 setState는 상위 AppStateProvider의 useReducer를
  // dispatch하는 것이라 "Cannot update a component while rendering a different component" 경고가 나고
  // React가 루트 전체를 버리고 다시 렌더한다(실측 확인). 그래서 커밋 이후에 도는 useEffect로 옮겼다.
  //
  const patchReset = patchAccount.reset
  const patchBalanceReset = patchAccountBalance.reset
  const deleteReset = deleteAccount.reset

  useEffect(() => {
    if (!isOpen || !account) return
    if (form.id === account.id) return

    setState((prev) => ({
      accountForm: {
        id: account.id,
        // 읽기 전용이라 이 값으로 PATCH하지는 않는다 — AccountForm 타입을 채우기 위해 서버 값을
        // 그대로 옮겨둘 뿐이다(무기관 계좌는 null).
        institutionId: account.institutionId,
        name: account.name,
        // 서버가 내려준 세부 타입을 그대로 들고 있는다(6분류 프리셋으로 바꾸지 않는다) — 위 selectedAssetClass
        // 주석 참고.
        type: account.type,
        // 초기 잔액·개설일은 이 모달에서 전송하지 않는다 — 아래 값들은 AccountForm 타입을 채우기
        // 위한 자리 채움일 뿐이다.
        initialBalanceKrw: 0,
        initialBalanceUsd: '',
        interestRate: account.interestRate,
        openedAt: account.openedAt,
        maturityDate: account.maturityDate,
        isLiquid: account.isLiquid,
      },
      // 날짜 선택기는 form 값을 기본 표시로 쓰고, 새로 고른 값만 datePickerPicked에 남는다 — 지난 계좌에서
      // 고른 날짜가 새어 들어오지 않게 비운다.
      datePickerPicked: { ...prev.datePickerPicked, editAccountOpened: undefined, editAccountMaturity: undefined },
      datePickerViewingMonth: { ...prev.datePickerViewingMonth, editAccountOpened: undefined, editAccountMaturity: undefined },
      openDropdown: null,
    }))
    setInterestRateStr(account.interestRate != null ? String(account.interestRate) : '')
    const usdLine = accountBalanceOf(account, 'USD')
    setUsdInput(usdLine ? usdLine.amount.toFixed(2) : '')
    setUsdOverflow(false)
    // 잔액 정정 API(PATCH .../balance)로 나가는 별도 값 — 현재 잔액으로 초기화해두면 사용자가 값을
    // 바꾸지 않는 한 handleSave가 이 API를 호출하지 않는다(아래 handleSave의 hasBalanceChange 참고).
    // 원화 칸은 합계(balanceKrw)가 아니라 원화 줄(예수금) 기준이다 — 달러 줄이 있는 계좌에서 합계로
    // 채우면 저장 때 달러 환산분까지 원화로 정정해 버린다.
    setBalanceKrwInput(accountBalanceOf(account, 'KRW')?.amount ?? 0)
    // 편집 대상이 바뀌었으니 이전 계좌의 해지 확인 상태와 실패 메시지를 물려주지 않는다.
    setCloseConfirmOpen(false)
    setNameInvalid(false)
    setBalanceEmptyError(false)
    setIsBalanceOverflow(false)
    patchReset()
    patchBalanceReset()
    deleteReset()
  }, [
    isOpen,
    account,
    form.id,
    setState,
    patchReset,
    patchBalanceReset,
    deleteReset,
  ])


  if (!isOpen) return null

  // 폼이 아직 이 계좌로 채워지기 전에는 이전 계좌 값이 보이지 않도록 로딩으로 취급한다.
  const isFormReady = !!account && form.id === account.id

  // 정보 저장 · 잔액 정정 · 해지가 동시에 날아가면 응답 순서에 따라 최종 상태를 예측할 수 없다 — 서로를
  // 잠근다. resetAndClose도 이 값을 확인해야 하므로(아래) handleDelete보다 앞에서 계산해둔다.
  const isAlreadyClosed = deleteAccount.error instanceof ApiError && deleteAccount.error.code === 'ACCOUNT_ALREADY_CLOSED'
  const isBusy = patchAccount.isPending || patchAccountBalance.isPending || deleteAccount.isPending

  const resetAndClose = () => {
    // 저장/해지 뮤테이션이 진행 중일 때는 닫지 않는다 — 파일 상단 주석의 TanStack Query 옵저버 분리
    // 근거 참고. X 버튼(Modal은 배경 클릭으로 닫히지 않는다)이 이 함수 하나를 거치므로, 여기서 막으면
    // 그 경로가 막힌다. handleSave/handleDelete의 mutate onSuccess가 부르는 resetAndClose는 그 시점엔
    // 이미 isBusy가 false로 떨어진 뒤이므로 정상적으로 닫힌다.
    if (isBusy) return
    setState({
      openModal: null,
      editingAccountId: null,
      accountForm: BLANK_ACCOUNT_FORM,
      openDropdown: null,
    })
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다.
    // 로컬 확인 상태와 mutation 에러를 직접 지우지 않으면 다음에 연 계좌로 새어나간다.
    setCloseConfirmOpen(false)
    setNameInvalid(false)
    setBalanceEmptyError(false)
    setIsBalanceOverflow(false)
    setUsdOverflow(false)
    patchAccount.reset()
    patchAccountBalance.reset()
    deleteAccount.reset()
  }

  // 값을 고치는 순간 지난 저장 실패 문구를 지운다 — 남겨 두면 고친 뒤에도 여전히 틀린 것처럼 보인다.
  const clearSaveErrors = () => {
    if (patchAccount.error) patchAccount.reset()
    if (patchAccountBalance.error) patchAccountBalance.reset()
  }

  const patchForm = (patch: Partial<typeof form>) => {
    clearSaveErrors()
    setState((prev) => ({ accountForm: { ...prev.accountForm, ...patch } }))
  }

  const pickedDate = (key: string) => {
    const picked = state.datePickerPicked[key] as { y: number; m: number; d: number } | undefined
    return picked ? pickedToISODate(picked) : undefined
  }
  const openedAtValue = pickedDate('editAccountOpened') ?? form.openedAt
  const maturityValue = pickedDate('editAccountMaturity') ?? form.maturityDate
  const todayIso = toISODate(new Date())
  const usdValue = usdInput === '' ? null : Number(usdInput)
  const usdChanged = canEditUsd && usdValue !== null && usdCash !== null && Math.round(usdValue * 100) !== Math.round(usdCash * 100)
  const usdDiff = usdChanged && usdValue !== null && usdCash !== null ? (Math.round(usdValue * 100) - Math.round(usdCash * 100)) / 100 : 0

  const handleSave = async () => {
    if (!account) return

    const missingName = !form.name.trim()
    setNameInvalid(missingName)
    if (missingName) return

    // 잔액 칸을 비워 둔 채 저장하면 0원 정정이 되지 않게 막는다(파일 상단 주석).
    if (balanceKrwInput === null) {
      setBalanceEmptyError(true)
      return
    }
    setBalanceEmptyError(false)
    if (!Number.isSafeInteger(balanceKrwInput)) return // 필드 아래 안내로 이미 막혀 있다
    if (canEditUsd && usdValue === null) {
      setBalanceEmptyError(true)
      return
    }

    const body: UpdateAccountRequest = {
      name: form.name.trim(),
      isLiquid: form.isLiquid,
      // type은 보내지 않는다 — 자산 유형은 읽기 전용이라 바뀔 경로가 없고(파일 상단 주석), PATCH는
      // 생략한 필드를 건드리지 않는다.
      // 예적금만 이자율·개설일·만기일을 싣는다(현재 값으로 채워 두었으므로 안 바꿨으면 그대로 저장된다).
      ...(isDeposit
        ? {
            interestRate: interestRateStr === '' ? null : Number(interestRateStr),
            openedAt: openedAtValue ?? null,
            ...(maturityValue ? { maturityDate: maturityValue } : {}),
          }
        : {}),
    }

    const krwChanged = balanceKrwInput !== krwCash

    // 계좌 정보 → 원화 정정 → 달러 정정을 차례로 보낸다(동시에 쏘면 실패했을 때 무엇이 저장됐는지 알 수
    // 없다). 앞 단계가 실패하면 뒤 단계는 보내지 않고, 각 mutation의 error로 어디서 멈췄는지 알린다.
    try {
      await patchAccount.mutateAsync({ id: account.id, body })
      if (krwChanged) {
        await patchAccountBalance.mutateAsync({ id: account.id, body: { balance: balanceKrwInput, currency: 'KRW' } })
      }
      if (usdChanged && usdValue !== null) {
        await patchAccountBalance.mutateAsync({ id: account.id, body: { balance: usdValue, currency: 'USD' } })
      }
      resetAndClose()
    } catch {
      // 에러 문구는 아래 렌더가 patchAccount.error / patchAccountBalance.error로 보여준다.
    }
  }

  const handleDelete = () => {
    if (!account) return
    deleteAccount.mutate(account.id, { onSuccess: resetAndClose })
  }

  return (
    <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ padding: '42px 30px', maxHeight: '90vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, ...sheetStickyHeaderStyle(isMobile) }}>
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
          disabled={isBusy}
          // 저장 중임을 버튼 라벨("저장 중…"/"잔액 반영 중…")로 이미 알리고 있지만, 여기서도 눌러도
          // 반응이 없는 이유를 알 수 있게 커서와 title로 보강한다(resetAndClose 자체는 이미 isBusy를
          // 막아서 방어하지만, disabled로 아예 클릭이 발생하지 않게 하는 편이 더 명확하다).
          title={isBusy ? '저장 처리 중에는 닫을 수 없어요' : undefined}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1 }}
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
            {/* 선택 UI가 아니라 현재 값을 보여주는 읽기 전용 필드다(파일 상단 주석 참고). 접힌 세부
                타입(파킹통장/정기예금 등)이 있으면 자산군 라벨 옆에 함께 적어, 무엇으로 저장돼 있는지
                확인할 수 있게 한다. */}
            <div
              role="group"
              aria-label={`자산 유형(읽기 전용) ${assetClassMeta.label}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={assetClassMeta.icon} size={15} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{assetClassMeta.label}</span>
              <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
              자산 유형은 계좌를 만든 뒤에는 바꿀 수 없어요
            </div>
          </div>
          <div>
            <div style={LABEL_STYLE}>계좌 이름</div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                patchForm({ name: e.target.value })
                if (nameInvalid) setNameInvalid(false)
              }}
              style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
            {nameInvalid && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌 이름을 입력해주세요</div>}
          </div>
          <div style={fieldRowStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={LABEL_STYLE}>금융기관</div>
              {/* 자산 유형과 같은 이유로 읽기 전용이다(파일 상단 주석 참고). 기관을 지정하지 않은
                  계좌(현금 등)는 서버가 institutionName을 null로 내려주므로 '없음'으로 보여준다. */}
              <div
                role="group"
                aria-label={`금융기관(읽기 전용) ${account.institutionName ?? '없음'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: account.institutionName ? 'var(--text-strong)' : 'var(--text-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account.institutionName ?? '없음'}
                </span>
                <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>{hasForeignCurrencyDeposit ? '현재 원화 예수금' : '현재 잔액'}</div>
              {/* PATCH /accounts/{id}/balance(currency=KRW)로 원화 예수금을 정정한다. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={balanceKrwInput === null ? '' : formatNumber(balanceKrwInput)}
                  onChange={(e) => {
                    // 빈 문자열은 0이 아니라 "아직 값을 안 씀"으로 남긴다 — 파일 상단 주석 참고.
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    if (digits && Number(digits) > MAX_KRW_AMOUNT) {
                      setIsBalanceOverflow(true)
                      return
                    }
                    setIsBalanceOverflow(false)
                    setBalanceKrwInput(digits ? Number(digits) : null)
                    if (balanceEmptyError) setBalanceEmptyError(false)
                    clearSaveErrors()
                  }}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              </div>
              {/* 정정하면 서버가 차액만큼 ADJUSTMENT(잔액 조정) 거래를 만들지만 가계부 목록·수지 집계에는
                  나타나지 않는다 — 그래서 '얼마가 달라지는가'만 알린다(0을 하나 더 붙이는 실수를 잡는 안전장치).
                  안내가 없을 때도 한 줄을 비워 둬 입력하는 순간 아래 블록이 튀지 않게 한다. */}
              {isBalanceOverflow ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>{MAX_KRW_AMOUNT_MESSAGE}</div>
              ) : balanceEmptyError && balanceKrwInput === null ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>잔액을 입력해주세요 — 비워두면 저장할 수 없어요</div>
              ) : balanceKrwInput !== null && balanceKrwInput !== krwCash ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600, marginTop: 6 }}>
                  {balanceKrwInput > krwCash
                    ? `+${formatNumber(balanceKrwInput - krwCash)}원 늘어나요`
                    : `−${formatNumber(krwCash - balanceKrwInput)}원 줄어들어요`}
                </div>
              ) : (
                <div aria-hidden style={{ fontSize: 11.5, marginTop: 6, visibility: 'hidden' }}>&nbsp;</div>
              )}
            </div>
          </div>
          {hasForeignCurrencyDeposit && (
            <div>
              <div style={LABEL_STYLE}>현재 달러 예수금</div>
              {canEditUsd ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>$</span>
                  <input
                    type="text" inputMode="decimal" placeholder="0.00"
                    value={usdInput}
                    onChange={(e) => {
                      const next = sanitizeDecimalInput(e.target.value, 2)
                      if (Number(next) > MAX_USD_AMOUNT) {
                        setUsdOverflow(true)
                        return
                      }
                      setUsdOverflow(false)
                      setUsdInput(next)
                      if (balanceEmptyError) setBalanceEmptyError(false)
                      clearSaveErrors()
                    }}
                    style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                  />
                </div>
              ) : (
                <div
                  role="group"
                  aria-label={`현재 달러 예수금(읽기 전용) ${usdCash != null ? formatUsd(usdCash) : '없음'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>{usdCash != null ? formatUsd(usdCash) : '—'}</span>
                  <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
                </div>
              )}
              {usdOverflow ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>{MAX_USD_AMOUNT_MESSAGE}</div>
              ) : balanceEmptyError && canEditUsd && usdInput === '' ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>달러 예수금을 입력해주세요 — 없으면 0을 적어주세요</div>
              ) : usdChanged ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600, marginTop: 6 }}>
                  {usdDiff > 0 ? `+${formatUsd(usdDiff)} 늘어나요` : `${formatUsd(usdDiff)} 줄어들어요`}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>아직 원화로 바꾸지 않고 남겨둔 달러예요</div>
              )}
            </div>
          )}
          {hasForeignCurrencyDeposit && (
            // 원화·달러 예수금(위 두 칸)을 원화로 합친 값 — balanceKrw = balances의 amountKrw 합계다.
            // 달러분은 조회 시점 환율로 환산되므로 매일 달라진다. **보유 종목 평가액은 포함되지 않는다.**
            <div>
              <div style={LABEL_STYLE}>예수금 합계 (원화)</div>
              <div
                role="group"
                aria-label={`예수금 합계(읽기 전용) ₩${formatNumber(account.balanceKrw)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>{formatNumber(account.balanceKrw)}</span>
                <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                달러 예수금을 오늘 환율로 환산해 원화 예수금과 더한 값이라 매일 달라져요. 보유 종목은 빠져 있어요
              </div>
            </div>
          )}
          {isDeposit && (
            <>
              <div>
                <div style={LABEL_STYLE}>이자율 % (선택)</div>
                <input
                  type="text" inputMode="decimal" placeholder="0.00"
                  value={interestRateStr}
                  onChange={(e) => {
                    setInterestRateStr(sanitizeDecimalInput(e.target.value, 2))
                    clearSaveErrors()
                  }}
                  style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
                />
              </div>
              {/* 개설일·만기일은 각각 전체 폭 행 — 좁은 칸에 두면 DatePicker 팝오버가 칸 밖으로 잘린다. */}
              <div style={{ position: 'relative' }}>
                <div style={{ ...LABEL_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  개설일 (선택)
                  {openedAtValue && (
                    <button
                      type="button"
                      className="mini-hov"
                      onClick={() => {
                        clearSaveErrors()
                        setState((prev) => ({
                          accountForm: { ...prev.accountForm, openedAt: null },
                          datePickerPicked: { ...prev.datePickerPicked, editAccountOpened: undefined },
                          openDropdown: null,
                        }))
                      }}
                      style={{ border: 'none', background: 'transparent', padding: '2px 6px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--text-weak)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      지우기
                    </button>
                  )}
                </div>
                <DatePicker dp={dpOpened} />
              </div>
              <div style={{ position: 'relative' }}>
                <div style={LABEL_STYLE}>만기일</div>
                <DatePicker dp={dpMaturity} />
                {maturityValue && maturityValue < todayIso && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-mid)', marginTop: 6 }}>이미 지난 날짜예요 — 만기가 지난 계좌로 저장돼요</div>
                )}
              </div>
            </>
          )}
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
          {patchAccount.error && (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{patchAccount.error.message}</div>
          )}
          {/* patchAccountBalance는 patchAccount가 성공한 뒤에만 이어서 호출되므로(handleSave 참고),
              여기 에러가 떴다는 건 계좌 정보는 이미 저장됐고 잔액 정정만 실패했다는 뜻이다 — 둘 중
              무엇이 반영됐는지 알 수 있게 구분해 알린다. */}
          {patchAccountBalance.error && (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>
              계좌 정보는 저장됐어요. 잔액 정정에는 실패했어요 — {patchAccountBalance.error.message}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={isBusy}
            aria-busy={patchAccount.isPending || patchAccountBalance.isPending}
            className="qbtn"
            style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1, transition: 'transform .12s' }}
          >
            {patchAccount.isPending ? '저장 중…' : patchAccountBalance.isPending ? '잔액 반영 중…' : '변경사항 저장'}
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
