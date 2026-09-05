// 계좌 수정 모달. GET/PATCH/DELETE /accounts/{id}에 연결돼 있다.
// z-index 90, 너비 480px, maxHeight 90vh, padding '42px 30px'(기본 30px이 아니다).
//
// interestRate/openedAt은 GET /accounts/{id} 응답에 없어 이 폼에서는 노출하지 않는다 — 현재 값을
// 모르는 채로 덮어쓰게 하는 건 사고 위험이 크다(백엔드에 GET 응답 보강이 필요한 항목).
//
// 금융기관도 이 모달에서 읽기 전용이다(제품 결정 — 계좌 번호가 이미 정해져 있는데 기관이 달라질 일이
// 없다). 서버가 내려준 institutionName을 보여주기만 하고 PATCH body에는 institutionId를 싣지 않는다.
// 기관을 고를 일이 없으므로 이 모달은 GET /institutions를 아예 호출하지 않는다 —
// AccountRes.institutionId가 그대로 내려온다(무기관 계좌는 null). 기관을 잘못 고른 계좌는 해지 후
// 다시 등록하는 것이 제품 흐름이다.
//
// 자산 유형과 통화도 읽기 전용이다(제품 결정 + 서버 제약). 이미 만들어진 계좌의 성격을 수정 화면에서
// 갈아끼우는 건 사용자 기대와 어긋나고, 통화는 애초에 바꿀 수단이 없다 — UpdateAccountRequest에
// currency도 등록 원금 필드도 없다(통화를 바꾸려면 해지 후 재등록이다). 그래서 선택 UI 대신 현재 값만
// 보여준다. 라벨은 자산 화면 카드와 같은 5분류(assetClassMetaOf)를 쓰고, 달러 계좌면 옆에 '달러'를
// 덧붙인다. 계좌를 만들 때는 유형을 골라야 하므로 AddAccountModal의 칩은 그대로 둔다.
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
// **달러 예수금이 있는 계좌는 잔액 정정을 지원하지 않는다**(PATCH .../balance가 400
// BALANCE_ADJUSTMENT_NOT_SUPPORTED_FOR_FX로 거절한다). 외화분은 원금만 환율을 타는데 조정 거래는
// 원화로 굳어, 정정해도 다음 날 잔액이 다시 어긋나기 때문이다. 그래서 그런 계좌에서는 잔액 칸을
// 읽기 전용으로 두고 현재 예수금만 보여준다 — 금액을 맞추려면 가계부에 거래를 기록해야 한다.
//
// **판별 기준은 통화(currency)가 아니라 달러 예수금 유무(initialBalanceUsd != null)다.**
// 이 앱은 계좌를 **항상 currency:'KRW'로 등록**하므로(CLAUDE.md '계좌 통화') 달러 예수금이 있는 주식
// 계좌도 통화는 KRW다 — currency === 'USD'로 판단하면 정정 칸을 열어줬다가 저장 시점에 400을 맞는다.
// 반대로 통화만 USD이고 아직 환전 전이라 달러 예수금이 없는 계좌는 서버가 정정을 허용한다.
//
// 달러·원화 예수금은 함께 보여준다. **표시에 쓰는 값은 등록 시점(initialBalance~)이 아니라 현재
// 예수금(cashUsd/cashKrw)이다**(OpenAPI가 '표시에는 cash~를 쓰라'고 명시). balanceKrw ÷ 환율로
// 역산하지 않는다 — 환율은 프론트가 다루지 않는다.
// balanceKrw는 두 예수금을 합친 값이라 '예수금 합계 (원화)'로 따로 보여준다 — **보유 종목 평가액은
// 포함하지 않으므로 '평가액'이라고 부르지 않는다**(그 값은 계좌 상세 모달의 총 평가액이다).
// balanceKrw - initialBalanceKrw를 '환차익/환차손'으로 보여주지 않는다 — initialBalanceKrw는 원화
// 예수금 원금만이고 balanceKrw에는 외화 환산액과 원장 증감이 섞여 있어 이 뺄셈이 순수한 환율 변동분이
// 아니다. 서버 응답만으로 순수 환차익을 만들 수 없으므로 '서버 응답에 없는 값은 그리지 않는다'는
// 원칙에 따라 그리지 않는다.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { formatNumber, formatCurrencyAmount } from '../../../utils/format'
import {
  assetClassMetaOf,
  assetClassOfAccountType,
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
  // 통화도 등록 후에는 바꿀 수 없다(PATCH에 currency 필드 자체가 없다) — 유형 옆에 함께 보여준다.
  // 원화는 이 앱의 기본값이라 굳이 붙이지 않고, 해외주식 계좌가 달러인지 원화인지가 헷갈리는
  // 경우이므로 달러일 때만 표시한다.
  const currencyLabel = account?.currency === 'USD' ? '달러' : null
  // 잔액 입력 오버플로 방어 — parseAmount는 자릿수 상한이 없어 아주 큰 값이 JS 안전 정수 범위를 넘으면
  // 입력과 다른 정수가 서버로 나간다(AddAccountModal의 usdError='overflow'와 같은 이유).
  const isBalanceOverflow = balanceKrwInput !== null && !Number.isSafeInteger(balanceKrwInput)

  // 잔액 정정 가능 여부는 통화가 아니라 **달러 예수금 유무**로 가른다(파일 상단 주석 — 서버가
  // initialBalanceUsd 기준으로 400을 낸다). 서버가 준 값을 그대로 믿는다(form.currency는 폼 초기화
  // 시점에 같은 값이 들어오지만, 잔액을 다룰 수 있는지는 저장된 계좌의 성격이라 서버 응답이 근거다).
  const hasForeignCurrencyDeposit = account?.initialBalanceUsd != null
  // "현재 원화 예수금"은 값이 있을 때만 보여준다 — 달러만 넣고 만든 해외주식 계좌(가장 흔한 경우)는
  // cashKrw가 0이라, 상시 노출하면 "₩0"과 안내 문구가 항상 뜬다. OpenAPI 상 cashKrw는
  // required·non-null이지만, 바로 이 파일이 "타입 선언을 믿었다가 런타임에 터진" 사고
  // (initialBalanceUsd의 undefined 크래시)를 겪었으므로 null/undefined도 함께 걸러 방어한다.
  const hasKrwDeposit = hasForeignCurrencyDeposit && !!account?.cashKrw

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

    setState({
      accountForm: {
        id: account.id,
        // 읽기 전용이라 이 값으로 PATCH하지는 않는다 — AccountForm 타입을 채우기 위해 서버 값을
        // 그대로 옮겨둘 뿐이다(무기관 계좌는 null).
        institutionId: account.institutionId,
        name: account.name,
        // 서버가 내려준 세부 타입을 그대로 들고 있는다(6분류 프리셋으로 바꾸지 않는다) — 위 selectedAssetClass
        // 주석 참고.
        type: account.type,
        currency: account.currency,
        // PATCH가 거부하는 필드(initialBalanceKrw/initialBalanceUsd/openedAt)는 이 모달에서 전송하지
        // 않는다 — 아래 값들은 AccountForm 타입을 채우기 위한 자리 채움일 뿐이다.
        initialBalanceKrw: 0,
        initialBalanceUsd: '',
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
    setBalanceEmptyError(false)
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
    patchAccount.reset()
    patchAccountBalance.reset()
    deleteAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((prev) => ({ accountForm: { ...prev.accountForm, ...patch } }))

  const handleSave = () => {
    if (!account) return

    const missingName = !form.name.trim()
    setNameInvalid(missingName)
    if (missingName) return

    // 잔액 정정으로 보낼 원화 값. null이면 "이번엔 잔액을 건드리지 않는다"는 뜻이다 — 달러 예수금이
    // 있는 계좌는 서버가 잔액 정정을 지원하지 않으므로(파일 상단 주석) 항상 null이고, 입력칸도
    // 읽기 전용이다.
    let nextBalanceKrw: number | null
    if (hasForeignCurrencyDeposit) {
      nextBalanceKrw = null
    } else {
      if (balanceKrwInput === null) {
        setBalanceEmptyError(true)
        return
      }
      setBalanceEmptyError(false)
      if (!Number.isSafeInteger(balanceKrwInput)) return // 필드 아래 isBalanceOverflow 안내로 이미 막혀 있다
      nextBalanceKrw = balanceKrwInput
    }

    const body: UpdateAccountRequest = {
      name: form.name.trim(),
      isLiquid: form.isLiquid,
      // type은 보내지 않는다 — 자산 유형은 읽기 전용이라 바뀔 경로가 없고(파일 상단 주석), PATCH는
      // 생략한 필드를 건드리지 않으므로 파킹통장/정기예금 같은 세부 타입이 그대로 유지된다.
      // maturityDate는 이 모달에서 더 이상 입력받지 않으므로 보내지 않는다(폼 축소) —
      // PATCH는 생략한 필드를 건드리지 않으니 서버에 이미 저장된 만기일은 그대로 유지된다.
    }

    const hasBalanceChange = nextBalanceKrw !== null && nextBalanceKrw !== account.balanceKrw
    const balanceToSave = nextBalanceKrw

    // 계좌 정보 저장과 잔액 정정은 서로 다른 API라 순서를 정해야 한다: 정보 저장을 먼저 시도하고,
    // 성공했을 때만 잔액 정정을 잇는다(동시에 쏘지 않음 — 실패 시 무엇이 저장됐는지 알 수 없어지는
    // 것을 막는다, 아래 isBusy와 같은 이유). 정보 저장이 실패하면 잔액 정정은 아예 시도하지 않고
    // patchAccount.error만 보여준다. 정보는 저장됐는데 잔액 정정만 실패하면 모달을 닫지 않고
    // patchAccountBalance.error로 그 사실을 따로 알린다(아래 렌더 참고).
    patchAccount.mutate(
      { id: account.id, body },
      {
        onSuccess: () => {
          if (!hasBalanceChange || balanceToSave === null) {
            resetAndClose()
            return
          }
          patchAccountBalance.mutate(
            { id: account.id, body: { balanceKrw: balanceToSave } },
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
              aria-label={`자산 유형(읽기 전용) ${assetClassMeta.label}${currencyLabel ? ` · ${currencyLabel}` : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={assetClassMeta.icon} size={15} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{assetClassMeta.label}</span>
              {currencyLabel && (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)' }}>· {currencyLabel}</span>
              )}
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
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>금융기관</div>
              {/* 자산 유형과 같은 이유로 읽기 전용이다(파일 상단 주석 참고). 기관을 지정하지 않은
                  계좌(현금 등)는 서버가 institutionName을 null로 내려주므로 '없음'으로 보여준다 —
                  AddAccountModal의 '없음' 선택지와 같은 표기다. */}
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
              <div style={LABEL_STYLE}>{hasForeignCurrencyDeposit ? '현재 달러 예수금' : '현재 잔액'}</div>
              {hasForeignCurrencyDeposit ? (
                // 달러 예수금이 있는 계좌는 잔액 정정을 서버가 거절한다(파일 상단 주석) — 고칠 수 없는
                // 칸을 열어두면 저장을 눌러야 비로소 에러를 보게 되므로, 아예 읽기 전용으로 둔다.
                // 보여주는 값은 등록 시점 원금이 아니라 **현재** 달러 예수금(cashUsd)이다 — 서버가
                // 통화별 현재 예수금을 내려주면서 등록 시점 값을 보여줄 이유가 없어졌다(파일 상단 주석).
                <div
                  role="group"
                  aria-label={`현재 달러 예수금(읽기 전용) ${account.cashUsd != null ? `$${formatCurrencyAmount(account.cashUsd, 'USD')}` : '없음'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>$</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>
                    {account.cashUsd != null ? formatCurrencyAmount(account.cashUsd, 'USD') : '—'}
                  </span>
                  <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
                </div>
              ) : (
                // PATCH /accounts/{id}/balance로 잔액을 정정한다.
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                  <input
                    type="text" inputMode="numeric" placeholder="0"
                    value={balanceKrwInput === null ? '' : formatNumber(balanceKrwInput)}
                    onChange={(e) => {
                      // 빈 문자열은 0이 아니라 "아직 값을 안 씀"으로 남긴다 — 파일 상단 주석 참고. 칸을
                      // 전체 지운 순간 parseAmount('')가 0을 돌려주면, 다시 채우기 전에 저장을 눌렀을 때
                      // 잔액이 실수로 0원 정정되는 사고로 이어진다.
                      const digits = e.target.value.replace(/[^0-9]/g, '')
                      setBalanceKrwInput(digits ? Number(digits) : null)
                      if (balanceEmptyError) setBalanceEmptyError(false)
                    }}
                    style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                  />
                </div>
              )}
              {/* 잔액을 실제 값과 다르게 정정하면 서버가 차액만큼 ADJUSTMENT(잔액 조정) 거래를 만들지만,
                  그 거래는 **가계부 목록·수지 집계 어디에도 나타나지 않는다**(GET /transactions가 제외한다).
                  그래서 여기서 '가계부에 기록된다'고 알리면 사용자가 있지도 않은 내역을 찾게 되므로,
                  화면에는 "얼마가 달라지는가"만 알린다 — 0을 하나 더 붙이는 실수를 잡아주는 안전장치다.
                  확인 모달까지는 단순 수정이 번거로워지므로 과하다고 판단해 별도로 만들지 않았다.
                  값을 안 바꿨을 때는 안내가 없지만, 빈 자리를 한 줄만큼 잡아 둬서(아래 마지막 갈래)
                  입력하는 순간 아래 블록이 위아래로 튀지 않게 한다. */}
              {hasForeignCurrencyDeposit ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                  {/* balanceKrw(예수금 합계)는 달러 예수금과 원화 예수금을 합쳐 환산한 값이라(파일 상단
                      주석), 원화 예수금이 있는 계좌에서는 "합쳐서" 계산된다는 점을 짚어준다.
                      원화 예수금이 0이라 아래 블록이 숨겨진 계좌(가장 흔한 경우)에서는 합산 대상이 없어
                      혼란스러우니 더 단순한 문장으로 보여준다. */}
                  {hasKrwDeposit
                    ? '달러 예수금은 여기서 고칠 수 없어요 — 원화 예수금과 합쳐 지금 얼마인지는 아래 예수금 합계에서 볼 수 있어요'
                    : '달러 예수금은 여기서 고칠 수 없어요 — 지금 원화로 얼마인지는 아래 예수금 합계에서 볼 수 있어요'}
                </div>
              ) : isBalanceOverflow ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>
                  금액이 너무 커서 저장할 수 없어요. 잔액을 다시 확인해주세요
                </div>
              ) : balanceEmptyError ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>
                  잔액을 입력해주세요 — 비워두면 저장할 수 없어요
                </div>
              ) : balanceKrwInput !== null && balanceKrwInput !== account.balanceKrw ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-mid)', fontWeight: 600, marginTop: 6 }}>
                  {balanceKrwInput > account.balanceKrw
                    ? `+${formatNumber(balanceKrwInput - account.balanceKrw)}원 늘어나요`
                    : `−${formatNumber(account.balanceKrw - balanceKrwInput)}원 줄어들어요`}
                </div>
              ) : (
                // 안내할 내용이 없을 때도 같은 글꼴로 한 줄을 비워 둔다 — 그냥 지우면 사용자가 금액을
                // 입력하는 순간 위 갈래가 나타나며 아래 예수금 블록이 통째로 밀린다.
                <div aria-hidden style={{ fontSize: 11.5, marginTop: 6, visibility: 'hidden' }}>
                  &nbsp;
                </div>
              )}
            </div>
          </div>
          {hasKrwDeposit && (
            // 증권 계좌는 달러 예수금과 원화 예수금을 함께 가질 수 있다(CLAUDE.md '계좌 통화') — 위
            // 달러 예수금 필드와는 서로 다른 돈이라 따로 보여준다. 둘 다 현재 값(cashUsd/cashKrw)이고,
            // 아래 '예수금 합계'는 이 둘을 원화로 합친 값이다.
            // 달러만 넣고 만든 계좌(가장 흔한 경우)는 cashKrw가 0이라 이 블록 자체를 숨긴다
            // (hasKrwDeposit 정의 참고) — "₩0"과 안내 문구를 상시 보여주면 정보 밀도만 높아진다.
            <div>
              <div style={LABEL_STYLE}>현재 원화 예수금</div>
              <div
                role="group"
                aria-label={`현재 원화 예수금(읽기 전용) ₩${formatNumber(account.cashKrw)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fill-subtle)', ...FIELD_BORDER_STYLE }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>{formatNumber(account.cashKrw)}</span>
                <Icon name="lock" size={14} color="var(--text-weak)" style={{ marginLeft: 'auto', flexShrink: 0 }} ariaHidden />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                아직 환전하지 않고 남겨둔 원화 예수금이에요
              </div>
            </div>
          )}
          {hasForeignCurrencyDeposit && (
            // 통화별 예수금(달러·원화, 위 두 필드)과 그 합계(원화, 여기)를 나란히 보여준다 —
            // balanceKrw = cashKrw + cashUsdKrw다(파일 상단 주석). 달러분은 조회 시점 환율로 환산되므로
            // 이 값은 매일 달라진다. **보유 종목 평가액은 여기 포함되지 않는다** — 계좌 전체 평가액은
            // 계좌 상세 모달의 '총 평가액'에서 본다.
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
                달러 예수금을 오늘 환율로 환산해 원화 예수금과 더한 값이라 매일 달라져요. 보유 종목은
                빠져 있고, 실제 예수금이 달라졌다면 가계부에 기록해주세요
              </div>
            </div>
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
