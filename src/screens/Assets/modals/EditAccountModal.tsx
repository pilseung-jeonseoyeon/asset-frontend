// Source: secret/Asset Manager v14.dc.html L1455-1515 (modalEditAccount) — layout transcribed verbatim,
// then wired to GET/PATCH/DELETE /accounts/{id} (previously uncontrolled/no-op — see git history).
// z-index 90, width 480px, maxHeight 90vh, padding "42px 30px" (NOT the default 30px — confirmed
// per-instance).
//
// GET /accounts/{id}(AccountResponse)에는 institutionId/interestRate/openedAt이 없다(institutionName만
// 내려온다) — institutionId는 GET /institutions 목록과 이름으로 조인해 역추적한다(기관명은 서버가
// DB 유니크로 보장하므로 안전한 조인). interestRate는 조회 자체가 불가능해 이 폼에서는 노출하지 않는다
// (현재 값을 모르는 채로 덮어쓰게 하는 건 사고 위험이 크다 — 백엔드에 GET 응답 보강이 필요한 항목).
//
// 자산 유형 칩은 AddAccountModal과 동일하게 서버 AccountType(10종)이 아니라 자산 화면 카드의 6분류
// (ASSET_CLASS_META/ASSET_CLASS_ORDER)를 쓴다(2026-08-17). 다만 이 모달은 PATCH 대상이라 두 가지가
// AddAccountModal과 다르다.
//  1) 통화는 수정 불가(UpdateAccountRequest에 currency 필드 자체가 없음) — 국내주식/해외주식은 둘 다
//     BROKERAGE이고 서버가 계좌 통화로 구분하므로, 지금 계좌 통화(form.currency, 로드된 뒤로는 이 모달이
//     절대 바꾸지 않는다)와 다른 통화가 필요한 칩은 눌러도 저장 후 원래대로 돌아가 혼란만 준다. 그래서
//     `isCurrencyLocked`로 미리 걸러 비활성화한다.
//  2) 6분류가 접는 세부 AccountType(예: 파킹통장/정기예금 → 현금/예적금 칩)은 사용자가 칩을 눌러야만
//     `form.type`이 프리셋 값(CASH/INSTALLMENT_SAVINGS)으로 바뀐다 — 로드 시점에는 서버가 내려준 원본
//     타입을 그대로 들고 있다(아래 useEffect). handleSave도 `form.type`이 로드된 원본과 실제로 달라졌을
//     때만 body에 `type`을 싣는다 — 그래야 칩을 건드리지 않고 다른 필드만 고쳐 저장해도 파킹통장이
//     조용히 CASH로 뭉개지는 정보 손실이 나지 않는다. 단, "이미 선택된 칩을 다시 누르는" 것도 클릭이라
//     이 규칙만으로는 부족하다 — 아래 onClick이 자기 자신 재클릭을 별도로 걸러낸다(그러지 않으면 칩
//     상태는 그대로인데 form.type만 프리셋으로 강등된다).
//
// 저장 중 닫기 잠금(2026-08-17, 리뷰 반영): handleSave는 계좌 정보 PATCH → 성공 시 잔액 PATCH를
// per-call onSuccess로 체이닝한다. TanStack Query v5의 MutationObserver.reset()은 진행 중인 mutation
// 으로부터 옵저버를 즉시 떼어내고(`#currentMutation?.removeObserver(this)`), 그러면 응답이 도착해도
// mutate()에 넘긴 per-call onSuccess가 더 이상 호출되지 않는다. resetAndClose가 그 reset()들을
// 부르므로, 저장이 끝나기 전에 X나 배경 클릭으로 닫으면 이름은 저장되고 잔액 정정 체인만 에러 없이
// 조용히 사라진다. 그래서 resetAndClose 맨 앞에서 isBusy를 확인해 진행 중이면 아무것도 하지 않는다 —
// X 버튼과 Modal의 배경 클릭 모두 이 함수 하나를 거치므로 두 경로가 함께 막힌다.
//
// 잔액 입력(balanceKrwInput)은 number | null이다. null은 "입력칸을 비워둔 채(아직 값을 안 씀)"를
// 뜻한다 — 문자열 없이 숫자 하나로만 관리하면 사용자가 값을 고치려 칸을 전체 지우는 순간 빈
// 문자열이 0으로 해석되어, 다시 채우기 전에 저장을 누르면 잔액이 실수로 0원 정정된다. 자릿수가 너무
// 커 안전 정수 범위를 벗어나는 값도 같은 자리에서 막는다(AddAccountModal의 달러 환산 오버플로 방어와
// 같은 톤).

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { fmt } from '../../../utils/format'
import {
  ACCOUNT_TYPE_LABELS,
  ASSET_CLASS_ACCOUNT_TYPE_PRESET,
  ASSET_CLASS_META,
  ASSET_CLASS_ORDER,
  assetClassFormPreset,
  assetClassOfAccountType,
} from '../../../data/assetsView'
import { ApiError } from '@/services/api'
import { useGetInstitutions } from '@/services/institution'
import { useDeleteAccount, useGetAccount, usePatchAccount, usePatchAccountBalance } from '@/services/account'
import type { UpdateAccountRequest } from '@/services/account'
import type { AssetClass, Currency } from '@/services/common.type'

function chipStyle(active: boolean, disabled = false): CSSProperties {
  if (disabled) {
    return {
      padding: '9px 14px', borderRadius: 10,
      border: '0.5px solid var(--border)',
      background: 'var(--fill-subtle)',
      color: 'var(--text-weak)',
      fontSize: 12.5, fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit',
    }
  }
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

/** 이 자산군 칩을 고르면 현재 계좌 통화와 다른 통화가 필요한지. PATCH는 통화를 바꿀 수 없으므로 그런
 * 칩은 눌러도 반영되지 않아야 한다 — assetClassFormPreset이 통화를 지정하는 국내주식/해외주식에만 해당. */
function isCurrencyLocked(assetClass: AssetClass, accountCurrency: Currency): boolean {
  const preset = assetClassFormPreset(assetClass)
  return preset.currency !== undefined && preset.currency !== accountCurrency
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
  const patchAccountBalance = usePatchAccountBalance()
  const deleteAccount = useDeleteAccount()
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  // 이름 필드도 AddAccountModal의 nameInvalid와 같은 패턴으로 검증한다 — 예전에는 이름을 비운 채
  // 저장을 누르면 handleSave가 조용히 return해 아무 반응이 없었다(리뷰 지적).
  const [nameInvalid, setNameInvalid] = useState(false)
  // 금융기관은 AddAccountModal과 동일하게 필수다(2026-08-19, 사용자 요청) — 계좌 이름과 같은 인라인
  // 오류 패턴으로 미선택 저장을 막는다.
  const [institutionMissing, setInstitutionMissing] = useState(false)
  // 잔액은 accountForm이 아니라 별도 로컬 상태로 둔다 — PATCH /accounts/{id}가 아니라 전용 잔액 정정
  // API(PATCH /accounts/{id}/balance)로 나가는 별개의 요청이라 accountForm의 필드가 아니다.
  // number | null인 이유는 파일 상단 주석 참고 — null은 "칸을 비워둔 채", 0은 "실제로 0을 입력함".
  const [balanceKrwInput, setBalanceKrwInput] = useState<number | null>(null)
  // 칸을 비워둔 채 저장을 시도했을 때만 보여준다(타이핑 중간에는 아직 에러가 아니다) — nameInvalid와
  // 같은 톤. 오버플로는 반대로 값이 채워져 있는 채로 너무 크다는 뜻이라 즉시(타이핑 중에도) 알려준다.
  const [balanceEmptyError, setBalanceEmptyError] = useState(false)

  const account = accountQuery.data
  // 자산 유형 칩 강조는 form.type을 프리셋으로 되돌리지 않고 실제 저장된 세부 타입에서 역산한다 — 그래야
  // 사용자가 칩을 누르기 전까지는 파킹통장/정기예금 같은 세부 정보가 유지된다(파일 상단 주석 참고).
  const selectedAssetClass = assetClassOfAccountType(form.type, form.currency)
  // 지금 칩(selectedAssetClass)의 "대표" AccountType과 실제 form.type이 다르면, 접힌 세부 타입(예:
  // 파킹통장·정기예금)이 프리셋 뒤에 숨어 있다는 뜻 — 칩 목록 아래에 그 사실을 알리는 캡션을 붙인다.
  const detailTypeLabel = form.type !== ASSET_CLASS_ACCOUNT_TYPE_PRESET[selectedAssetClass]
    ? ACCOUNT_TYPE_LABELS[form.type]
    : null
  // 모든 계좌는 통화가 하나로 고정되므로 국내주식/해외주식 중 하나는 항상 잠긴다 — "선택된 자산군이
  // 주식류일 때만" 캡션을 보여주던 예전 조건은 현금·예적금 등 나머지 4개 자산군을 열었을 때 잠긴 칩의
  // 이유를 설명하지 못했다(리뷰 지적).
  const hasLockedAssetClassChip = ASSET_CLASS_ORDER.some((c) => isCurrencyLocked(c, form.currency))
  // 잔액 입력 오버플로 방어 — parseAmount는 자릿수 상한이 없어 아주 큰 값이 JS 안전 정수 범위를 넘으면
  // 입력과 다른 정수가 서버로 나간다(AddAccountModal의 usdError='overflow'와 같은 이유).
  const isBalanceOverflow = balanceKrwInput !== null && !Number.isSafeInteger(balanceKrwInput)

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
  const ddInstitutionDisplay = { ...ddInstitution, value: ddInstitution.value || '금융기관을 선택하세요' }

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
  const patchBalanceReset = patchAccountBalance.reset
  const deleteReset = deleteAccount.reset
  const institutionList = institutionsQuery.data
  const isInstitutionsReady = institutionsQuery.isSuccess

  useEffect(() => {
    if (!isOpen || !account || !isInstitutionsReady) return
    if (form.id === account.id) return

    const matchedInstitution = institutionList?.find((i) => i.name === account.institutionName)
    setState({
      accountForm: {
        id: account.id,
        institutionId: matchedInstitution?.id ?? null,
        name: account.name,
        // 서버가 내려준 세부 타입을 그대로 들고 있는다(6분류 프리셋으로 바꾸지 않는다) — 위 selectedAssetClass
        // 주석 참고.
        type: account.type,
        currency: account.currency,
        // PATCH가 거부하는 필드(initialBalanceKrw/initialBalanceUsd/usdExchangeRate/openedAt)는 이
        // 모달에서 전송하지 않는다 — 아래 값들은 AccountForm 타입을 채우기 위한 자리 채움일 뿐이다.
        initialBalanceKrw: 0,
        initialBalanceUsd: '',
        usdExchangeRate: '',
        interestRate: null,
        openedAt: null,
        maturityDate: account.maturityDate,
        isLiquid: account.isLiquid,
      },
      openDropdown: null,
    })
    // 잔액 정정 API(PATCH .../balance)로 나가는 별도 값 — 현재 잔액으로 초기화해두면 사용자가 값을
    // 바꾸지 않는 한 handleSave가 이 API를 호출하지 않는다(아래 handleSave의 hasBalanceChange 참고).
    setBalanceKrwInput(account.balanceKrw)
    // 편집 대상이 바뀌었으니 이전 계좌의 해지 확인 상태와 실패 메시지를 물려주지 않는다.
    setCloseConfirmOpen(false)
    setNameInvalid(false)
    setInstitutionMissing(false)
    setBalanceEmptyError(false)
    patchReset()
    patchBalanceReset()
    deleteReset()
  }, [
    isOpen,
    account,
    isInstitutionsReady,
    institutionList,
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
      modalOpen: null,
      editAccount: null,
      accountForm: BLANK_ACCOUNT_FORM,
      openDropdown: null,
    })
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다.
    // 로컬 확인 상태와 mutation 에러를 직접 지우지 않으면 다음에 연 계좌로 새어나간다.
    setCloseConfirmOpen(false)
    setNameInvalid(false)
    setInstitutionMissing(false)
    setBalanceEmptyError(false)
    patchAccount.reset()
    patchAccountBalance.reset()
    deleteAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((st) => ({ accountForm: { ...st.accountForm, ...patch } }))

  const handleSave = () => {
    if (!account) return

    const missingName = !form.name.trim()
    const missingInstitution = form.institutionId === null
    setNameInvalid(missingName)
    setInstitutionMissing(missingInstitution)
    if (missingName || missingInstitution) return

    if (balanceKrwInput === null) {
      setBalanceEmptyError(true)
      return
    }
    setBalanceEmptyError(false)
    if (!Number.isSafeInteger(balanceKrwInput)) return // 필드 아래 isBalanceOverflow 안내로 이미 막혀 있다

    const body: UpdateAccountRequest = {
      name: form.name.trim(),
      isLiquid: form.isLiquid,
      // 자산 유형 칩을 실제로 건드려 form.type이 로드된 원본과 달라졌을 때만 보낸다 — 파일 상단 주석의
      // "정보 손실 방지" 규칙. 칩을 안 건드리면 파킹통장/정기예금 같은 세부 타입이 그대로 유지된다.
      ...(form.type !== account.type ? { type: form.type } : {}),
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
      // maturityDate는 이 모달에서 더 이상 입력받지 않으므로 보내지 않는다(2026-08-19, 폼 축소) —
      // PATCH는 생략한 필드를 건드리지 않으니 서버에 이미 저장된 만기일은 그대로 유지된다.
    }

    const hasBalanceChange = balanceKrwInput !== account.balanceKrw

    // 계좌 정보 저장과 잔액 정정은 서로 다른 API라 순서를 정해야 한다: 정보 저장을 먼저 시도하고,
    // 성공했을 때만 잔액 정정을 잇는다(동시에 쏘지 않음 — 실패 시 무엇이 저장됐는지 알 수 없어지는
    // 것을 막는다, 아래 isBusy와 같은 이유). 정보 저장이 실패하면 잔액 정정은 아예 시도하지 않고
    // patchAccount.error만 보여준다. 정보는 저장됐는데 잔액 정정만 실패하면 모달을 닫지 않고
    // patchAccountBalance.error로 그 사실을 따로 알린다(아래 렌더 참고).
    patchAccount.mutate(
      { id: account.id, body },
      {
        onSuccess: () => {
          if (!hasBalanceChange) {
            resetAndClose()
            return
          }
          patchAccountBalance.mutate(
            { id: account.id, body: { balanceKrw: balanceKrwInput } },
            { onSuccess: resetAndClose },
          )
        },
      },
    )
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ASSET_CLASS_ORDER.map((c) => {
                const locked = isCurrencyLocked(c, form.currency)
                const active = selectedAssetClass === c
                return (
                  <button
                    key={c}
                    className={locked ? undefined : 'mini-hov'}
                    disabled={locked}
                    title={locked ? '통화는 계좌를 만든 뒤에는 바꿀 수 없어요' : undefined}
                    onClick={() => {
                      // 이미 활성인 칩을 다시 눌러도 프리셋을 적용하지 않는다 — 적용하면 화면상 칩
                      // 상태는 그대로인데 form.type만 프리셋 값(예: PARKING→CASH)으로 강등되어, 사용자가
                      // 아무것도 안 바꾼 줄 알고 저장해도 세부 타입이 조용히 뭉개진다(리뷰 지적).
                      if (active) return
                      patchForm(assetClassFormPreset(c))
                    }}
                    style={chipStyle(active, locked)}
                  >
                    {locked && <Icon name="lock" size={11} style={{ marginRight: 3, verticalAlign: -1.5 }} />}
                    {ASSET_CLASS_META[c].label}
                  </button>
                )
              })}
            </div>
            {/* 통화는 계좌 생성 후 못 바꾸므로 국내주식/해외주식 중 하나는 항상 잠긴다 — 어느 자산군을
                열었든(현금·예적금 등) 잠긴 칩이 있는 한 이유를 알려준다. 예전에는 국내/해외주식을 선택 중
                일 때만 보여 나머지 4개 자산군에서는 회색 칩이 왜 안 눌리는지 알 길이 없었다(리뷰 지적). */}
            {hasLockedAssetClassChip && (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 8 }}>
                통화는 계좌를 만든 뒤에는 바꿀 수 없어서 국내주식 · 해외주식은 서로 바꿀 수 없어요
              </div>
            )}
            {/* 접힌 세부 타입(파킹통장/정기예금 등)은 칩 하나로는 안 보인다 — 확인할 길이 없으면
                "뭉개졌나" 불안해진다(리뷰 지적). 위 onClick에서 같은 칩 재클릭은 무시하므로, 다른 칩을
                눌러야만 실제로 바뀐다는 사실이 문구와 어긋나지 않는다. */}
            {detailTypeLabel && (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 8 }}>
                현재 세부 유형: {detailTypeLabel} · 다른 칩을 선택하면 바뀌어요
              </div>
            )}
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
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={LABEL_STYLE}>금융기관</div>
              {institutions.length === 0 ? (
                <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                  등록된 금융기관이 없어요
                </div>
              ) : (
                <Dropdown dd={ddInstitutionDisplay} maxHeight={160} />
              )}
              {institutionMissing && form.institutionId === null && (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>금융기관을 선택해주세요</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>현재 잔액</div>
              {/* PATCH /accounts/{id}/balance로 잔액을 정정한다. AccountResponse.balanceKrw는 통화와
                  무관하게 항상 원화 환산 정수다(account.type.ts 참고) — 같은 계좌를 보여주는
                  AccountDetailModal.tsx도 항상 원화로 렌더한다(정합성 확인됨). USD 계좌라도 여기 값은
                  원화이므로 `$` 기호를 붙이지 않는다(달러로 오인시키지 않기 위함). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                <input
                  type="text" inputMode="numeric" placeholder="0"
                  value={balanceKrwInput === null ? '' : fmt(balanceKrwInput)}
                  onChange={(e) => {
                    // 빈 문자열은 0이 아니라 "아직 값을 안 씀"으로 남긴다 — 파일 상단 주석 참고. 칸을
                    // 전체 지운 순간 parseAmount('')가 0을 돌려주면, 다시 채우기 전에 저장을 눌렀을 때
                    // 잔액이 실수로 0원 정정되는 사고로 이어진다(리뷰 지적).
                    const digits = e.target.value.replace(/[^0-9]/g, '')
                    setBalanceKrwInput(digits ? Number(digits) : null)
                    if (balanceEmptyError) setBalanceEmptyError(false)
                  }}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              </div>
              {/* 잔액을 실제 값과 다르게 정정하면 서버가 차액만큼 가계부에 조정 거래를 자동으로 남긴다
                  (사용자가 놀라지 않도록 저장 전에 미리 알려준다). 값을 실제로 바꿨을 때는 색을 한 단계
                  올려(--text-weak → --text-mid) 훑고 지나치기 쉬운 문제를 줄인다(리뷰 지적) — 확인
                  모달까지는 단순 수정이 번거로워지므로 과하다고 판단해 별도로 만들지 않았다. */}
              {isBalanceOverflow ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>
                  금액이 너무 커서 저장할 수 없어요. 잔액을 다시 확인해주세요
                </div>
              ) : balanceEmptyError ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>
                  잔액을 입력해주세요 — 비워두면 저장할 수 없어요
                </div>
              ) : balanceKrwInput !== null && balanceKrwInput !== account.balanceKrw ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600, marginTop: 6 }}>
                  {`${balanceKrwInput > account.balanceKrw ? '+' : '−'}${fmt(Math.abs(balanceKrwInput - account.balanceKrw))}원 차액이 가계부에 조정 거래로 자동 기록돼요`}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                  실제 잔액과 다르면 차액만큼 가계부에 조정 거래가 자동으로 남아요
                </div>
              )}
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
