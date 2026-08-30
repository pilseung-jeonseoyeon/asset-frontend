// 계좌 추가 모달. POST /accounts에 연결돼 있다. z-index는 80이 아니라 **90**이다 — 다른 모달 안에서
// (openAddAccountFrom{Entry,Stock,Recur}) 열릴 수 있어 한 단 위에 쌓여야 한다. 닫으면 그냥 닫히지
// 않고 `addAccountReturnTo`(이 모달을 연 모달)로 돌아간다.
//
// 자산 유형 칩은 서버 AccountType이 아니라 자산 화면 카드의 분류(src/data/assetsView.ts
// ASSET_CLASS_META/ASSET_CLASS_ORDER)를 쓴다. 칩을 고르면 그 자산군의 AccountType이 `form.type`에
// 저장돼 서버로는 AccountType 그대로 나간다 — 둘이 1:1이라 뭉개지는 정보가 없다
// (ASSET_CLASS_ACCOUNT_TYPE_PRESET 주석 참고). 어느 자산군 칸에서 열었는지에 따른 기본 칩 선택은
// AssetCategoryModal이 accountForm에 미리 넣어준다.
//
// **유형별 폼 분기**: 유형마다 필요한 입력이 다르므로 한 폼을 돌려쓰지 않고 FORM_FIELDS 표 하나로
// '이 유형이 어떤 필드를 쓰는가'를 정의하고 JSX와 검증이 그 표만 본다. 조건문을 JSX 여기저기
// 흩뿌리면 '예적금만 만기일 필수' 같은 규칙이 화면과 검증 사이에서 갈라진다.
// 현금 현재 잔액(금융기관은 모든 유형 공통 — 입출금 통장은 기관을, 지갑 현금은 '없음'을 고른다)
// 예적금 현재 잔액 + 이율(선택) + 개설일(선택) + 만기일(필수)
// 주식 현재 원화 잔액 + 현재 달러 잔액 + 보유 종목(KR·US 혼합)
// 가상자산 현재 잔액 + 보유 코인(CRYPTO)
// 연금·기타 현재 잔액
// 이율·개설일·만기일 행은 DatePicker 팝오버가 잘리지 않도록 단독 전체 폭 행에 둔다. 그리고
// resetAndClose에서 datePickerPicked/datePickerNav 키를 지운다 — 이 모달은 AppShell에 항상 마운트돼
// 있어 닫아도 언마운트되지 않으므로, 안 지우면 다시 열었을 때 지난 날짜가 남는다.
//
// 보유 종목은 CreateAccountRequest.holdings로 **계좌와 한 번에** 전송한다. 서버가 각 줄을 등록일(KST)
// 체결 BUY 매매로 기록하므로 등록 직후 주식 화면의 보유 종목·매매 내역에 그대로 나타난다. 계좌를
// 만든 뒤 POST /trades를 여러 번 부르는 방식이 아니라 한 요청이므로 중간에 실패해 '계좌만 만들어진'
// 어중간한 상태가 생기지 않는다(유형이 안 맞으면 400 INVALID_ACCOUNT_TYPE이고 계좌도 만들어지지 않는다).
// 평단가 통화는 원화가 아니라 **종목 표시 통화**다: 해외 종목은 달러, 국내 종목·가상자산은 원화.
// 주식 계좌 하나에 국내·해외를 섞어 담을 수 있으므로 이 단위는 계좌가 아니라 **줄마다** 갈린다
// (AccountHoldingsField가 줄에 붙여둔 market을 그대로 따른다).
//
// 모달 구조는 2스텝 마법사가 아니라 한 화면 스크롤이다: 이 모달은 대부분 AssetCategoryModal이 유형을
// 프리셋해서 열기 때문에, 스텝을 나누면 가장 흔한 경로에서 이미 정해진 유형을 한 번 더 확인 탭하게
// 만들 뿐이다. 대신 주식·코인 유형에서 폼이 길어질 때의 마찰을 줄이려 헤더(닫기 버튼 + 유형 칩)를
// 패널 위쪽에 sticky로 고정한다 — 종목을 몇 개 담은 뒤 유형을 바꾸려 맨 위로 되돌아갈 필요가 없다.
// 칩만이 아니라 헤더를 통째로 고정하는 게 중요하다: X 버튼이 스크롤 밖으로 나가면 모바일에서 닫을
// 수단이 줄어든다. 하단(저장 버튼)은 고정하지 않는다 — 이유는 아래 footerStyle 주석 참고.
//
// 통화 선택 UI는 없다 — 저장 시 보내는 currency는 항상 'KRW'다. 서버 계약상 currency는 금액 필드의
// 단위가 아니라 **표기용**이고(AccountRes.currency 설명), 달러 예수금은 통화와 무관하게
// initialBalanceUsd라는 별도 필드로 나간다. 주식 칩 하나가 국내·해외를 함께 담으므로 '이 계좌는 달러
// 계좌'라고 단정할 근거도 없다.
//
// 잔액 입력은 자산 유형에 따라 갈린다. 주식 칩은 실제 증권사 계좌처럼 **달러 예수금과 원화 예수금이
// 동시에** 있을 수 있어(환전 전 원화) 이 칩만 입력칸이 두 개고 둘 다 선택 입력이다. 두 칸은 환산
// 관계가 아니라 서로 다른 돈이므로 하나를 고치면 다른 쪽이 바뀌는 로직을 넣지 않는다. 저장 시 두 값을
// initialBalanceUsd(달러)/initialBalanceKrw(원화)로 함께 싣는다 — **필드명이 initialBalanceNative가
// 아니다**(그 이름은 서버 계약에 존재한 적이 없고, 그대로 보내면 달러 예수금이 조용히 누락된다.
// account.type.ts 주석 참고).
// initialBalanceUsd를 보낼 수 있는 계좌는 '외화 표시 계좌 **또는 주식·가상자산 계좌**'라 원화 표기
// 주식 계좌도 해당한다. 다만 그 밖의 원화 계좌가 보내면 400 INITIAL_BALANCE_CURRENCY_MISMATCH이므로
// **실제로 달러를 입력했을 때만** 싣는다 — 0을 굳이 보내 서버 검증을 건드릴 이유가 없다.
//
// 환율은 프론트가 다루지 않는다. 서버가 외화 원금을 그대로 보관하고 원화 평가액은 기준일 환율로 매번
// 환산한다 — 프론트가 환율을 곱하면 이중 환산이 된다. 그래서 환율 입력칸도, 환산 미리보기도 없다.
//
// 금융기관은 반드시 '고르는' 항목이다 — 계좌 이름과 같은 인라인 오류 패턴(필드 아래 var(--down) 문구)
// 으로 미선택 저장을 막는다. 단, 고를 수 있는 값에는 목록 맨 아래의 **'없음'**이 포함된다. 서버도
// 무기관 계좌를 정식 지원한다(CreateAccountReq.institutionId: '금융기관 ID — 현금 등 무기관 자산은
// 생략한다'). 그래서 '아직 아무것도 안 고름'과 '없음을 골랐음'을 반드시 구분해야 한다 — 둘 다
// institutionId는 null이므로 로컬 상태 institutionNone으로 후자를 표시하고, 저장 시 institutionId는
// 아예 싣지 않는다. 현금 유형도 이 필드를 똑같이 보여준다(입출금 통장처럼 기관이 있는 현금이 흔하다).
// 지갑 속 현금처럼 기관이 없으면 '없음'을 고르면 된다.
//
// 기관 추가 진입점은 두지 않는다 — 제품상 프론트에 기관 추가·삭제 기능은 필요 없다고 정리됐으니
// 되살리지 말 것. 목록 조회 실패(isError)는 빈 목록과 구분해 '불러오지 못했어요' + 다시 시도로
// 보여준다(describeQueryError).

import { useRef, useState } from 'react'
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
import { formatNumber, parseAmount, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate } from '../../../utils/date'
import { ASSET_CLASS_META, ASSET_CLASS_ORDER, assetClassFormPreset, assetClassOfAccountType } from '../../../data/assetsView'
import { describeQueryError } from '../../../data/ledgerView'
import { AccountHoldingsField } from './AccountHoldingsField'
import type { DraftHolding } from './AccountHoldingsField'
import { ConnectAccountView } from './ConnectAccountView'
import { providerLabelsFor, providersFor } from '../../../data/connectionView'
import { useGetInstitutions } from '@/services/institution'
import { usePostAccount } from '@/services/account'
import { isFxRateMissing } from '@/services/stock'
import type { CreateAccountRequest } from '@/services/account'
import type { AssetClass, Currency, Market } from '@/services/common.type'

/**
 * 자산 유형(칩) → 이 유형이 쓰는 필드. 화면 규칙이라 도메인 레이어(assetsView)가 아니라 이 모달이
 * 소유한다. JSX도 검증도 이 표 하나만 본다 — 조건을 두 군데 적으면 반드시 갈라진다.
 */
interface FormFields {
  /** 원화 금액 칸의 라벨. 6개 유형 모두 '현재 잔액'이고, 달러 칸이 함께 있는 해외주식만 '현재 원화
   * 잔액'으로 구분한다(사용자 요청 — '예수금'·'평가액' 같은 용어가 유형마다 달라 헷갈렸다). */
  amountLabel: string
  /** 달러 잔액 칸(해외주식 전용). */
  usdBalance: boolean
  /** 이율·개설일·만기일(예적금 전용). 만기일만 필수다. */
  savingsFields: boolean
  /** 보유 종목/코인 리스트를 붙일 시장 목록. 빈 배열이면 리스트 없음. */
  holdingMarkets: Market[]
}

const FORM_FIELDS: Record<AssetClass, FormFields> = {
  CASH: { amountLabel: '현재 잔액', usdBalance: false, savingsFields: false, holdingMarkets: [] },
  DEPOSIT: { amountLabel: '현재 잔액', usdBalance: false, savingsFields: true, holdingMarkets: [] },
  // 국내주식·해외주식이 합쳐진 칸이라 예전 해외주식 폼(원화+달러 두 칸)이 기본이 된다 — 증권계좌
  // 하나가 환전 전 원화와 환전한 달러를 함께 갖기 때문(사용자 결정).
  STOCK: { amountLabel: '현재 원화 잔액', usdBalance: true, savingsFields: false, holdingMarkets: ['KR', 'US'] },
  CRYPTO: { amountLabel: '현재 잔액', usdBalance: false, savingsFields: false, holdingMarkets: ['CRYPTO'] },
  ETC: { amountLabel: '현재 잔액', usdBalance: false, savingsFields: false, holdingMarkets: [] },
}

/** 서버가 6종 밖의 AccountType을 내려줘 assetClassOfAccountType이 모르는 값으로 접혔을 때의 폴백. */
function formFieldsOf(assetClass: AssetClass): FormFields {
  return FORM_FIELDS[assetClass] ?? FORM_FIELDS.ETC
}

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10, minHeight: 44,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
// 금액 입력칸 공통 스타일 — 통화 기호 span과 한 줄로 붙는 테두리 없는 input.
const AMOUNT_INPUT_STYLE: CSSProperties = {
  border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
  width: '100%', color: 'var(--text-strong)',
}
const AMOUNT_PREFIX_STYLE: CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }
const FIELD_HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', marginTop: 6 }
const FIELD_ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
const TEXT_INPUT_STYLE: CSSProperties = {
  width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
  outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box',
}
// GeneralModal.tsx의 재시도 배너와 동일한 텍스트 버튼 규격.
const RETRY_BTN_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 700,
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit',
}
// 연동 배너의 점선 톤. Dashboard.tsx의 DASHED_CTA_STYLE_DEEP과 같은 계열이지만 그쪽은 모듈 내부
// 상수라 export되어 있지 않아 여기서 다시 정의한다 — 공용화는 세 번째 사용처가 생길 때 판단한다.
// 액센트 채움 버튼으로 격상하지 않는 이유: 이 폼의 주 동선은 하단 "계좌 추가"(액센트)이고 연동은
// 선택적 대체 경로다. 둘 다 채움 버튼이면 무엇이 기본인지 읽히지 않는다.
const CONNECT_BANNER_STYLE: CSSProperties = {
  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 11,
  border: '1px dashed var(--border)', borderRadius: 12, padding: '14px 16px',
  background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
}

export function AddAccountModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'addAccount'
  const form = state.accountForm
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postAccount = usePostAccount()
  // 좁은 폭에서는 절반씩 나눈 두 필드(특히 Dropdown 팝오버)가 서로를 가리거나 잘리므로 세로로
  // 쌓는다 — 데스크톱은 기존 그대로 좌우 2열.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const [nameInvalid, setNameInvalid] = useState(false)
  const [institutionMissing, setInstitutionMissing] = useState(false)
  const [maturityMissing, setMaturityMissing] = useState(false)
  // "없음을 명시적으로 골랐다" — institutionId가 null인 두 상태(미선택 / 없음)를 가르는 유일한 근거다.
  const [institutionNone, setInstitutionNone] = useState(false)
  // 아직 서버로 나가지 않는 보유 종목 입력값(AccountHoldingsField 참고).
  const [holdings, setHoldings] = useState<DraftHolding[]>([])
  // 담아둔 종목이 있는 상태에서 다른 유형 칩을 눌렀을 때, 그 칩을 바로 적용하지 않고 확인을 받는다.
  const [pendingAssetClass, setPendingAssetClass] = useState<AssetClass | null>(null)
  // 이자율은 AppState에 숫자(interestRate)로 보관하지만, 입력칸이 보여주는 값은 이 문자열이다.
  // 숫자를 그대로 되비추면 "2." 상태가 Number()→String()을 지나며 "2"로 접혀 소수점을 아예 못 찍는다
  // (확인 — 2.1을 입력하면 21이 됐다). 달러 예수금(initialBalanceUsd)이 문자열인 것과 같은 이유다.
  const [interestRateStr, setInterestRateStr] = useState('')

  // 검증에 걸린 첫 필드로 화면을 옮기기 위한 참조. 이 폼은 종목을 몇 개만 담아도 화면 몇 배 길이가
  // 되는데, 저장을 눌러도 그 필드 옆에만 빨간 문구가 뜨고 스크롤도 포커스도 움직이지 않으면
  // — 화면 밖에서 실패하면 사용자 눈에는 버튼이 죽은 것처럼 보여 연타하게 된다.
  const nameRef = useRef<HTMLInputElement>(null)
  const institutionRef = useRef<HTMLDivElement>(null)
  const maturityRef = useRef<HTMLDivElement>(null)

  const ddInstitution = useEntityDropdown(
    'addAcctInst',
    institutions,
    (i) => i.id,
    (i) => i.name,
    form.institutionId,
    (id) => {
      setState((prev) => ({ accountForm: { ...prev.accountForm, institutionId: id } }))
      setInstitutionNone(false)
      setInstitutionMissing(false)
    },
  )
  // 서버 기관 목록 뒤에 프론트가 직접 붙이는 '없음' 옵션 — 어느 기관에도 속하지 않는 자산용
  // (파일 상단 주석 참고). 서버에 존재하는 기관이 아니므로 id는 문자열 sentinel을 쓴다.
  const ddInstitutionDisplay = {
    ...ddInstitution,
    value: institutionNone ? '없음' : ddInstitution.value || '금융기관을 선택하세요',
    options: [
      ...ddInstitution.options,
      {
        id: 'none',
        name: '없음',
        pick: () => {
          setState((prev) => ({ accountForm: { ...prev.accountForm, institutionId: null }, openDropdown: null }))
          setInstitutionNone(true)
          setInstitutionMissing(false)
        },
      },
    ],
  }
  const institutionsErr = describeQueryError(institutionsQuery.error)

  // 훅은 유형과 무관하게 항상 호출한다(조건부 호출 금지) — 예적금이 아닐 때는 렌더만 하지 않는다.
  const dpOpened = useDatePicker(
    'addAccountOpened',
    form.openedAt ? isoDateToDisplay(form.openedAt) : '선택 안 함',
    isoDateToNav(form.openedAt),
  )
  const dpMaturity = useDatePicker(
    'addAccountMaturity',
    form.maturityDate ? isoDateToDisplay(form.maturityDate) : '선택 안 함',
    isoDateToNav(form.maturityDate),
  )

  // 자산 유형 칩은 서버 값(type)에서 역산한다 — AssetCategoryModal이 프리셋을 미리 넣어준 채로 열려도
  // 항상 지금 폼 상태와 일치하는 칩이 선택돼 보인다.
  const selectedAssetClass = assetClassOfAccountType(form.type)
  const fields = formFieldsOf(selectedAssetClass)
  // 실제로 전송할 통화. form.currency를 곧이곧대로 읽지 않는 이유는 파일 상단 주석 참고.
  // 표기용 통화는 항상 원화다(파일 상단 "통화 선택 UI는 없다" 단락 참고) — 달러 예수금은 통화와
  // 무관하게 initialBalanceUsd로 따로 나간다.
  const accountCurrency: Currency = 'KRW'
  const usdAmount = Number(form.initialBalanceUsd) || 0

  // 필드 옆 빨간 문구와 저장 버튼 위 요약이 같은 근거를 보도록 한 벌로 계산한다. 만기일은 플래그만
  // 보면 안 된다 — 검증에 걸린 뒤 달력에서 날짜를 골라도 플래그가 남아 이미 채운 필드에 빨간 문구가
  // 계속 떠 있었다(DatePicker는 이 모달의 검증 상태를 모른다).
  const maturityPickedNow = state.datePickerPicked['addAccountMaturity'] as { y: number; m: number; d: number } | undefined
  const showInstitutionError = institutionMissing && form.institutionId === null && !institutionNone
  const showMaturityError = maturityMissing && !maturityPickedNow && !form.maturityDate
  // 저장 버튼 바로 위에 띄우는 요약. 화면 밖 필드에서 실패했을 때 "왜 저장이 안 됐는지"를 누른 자리
  // 에서 바로 읽을 수 있어야 한다 — 스크롤 이동만으로는 애니메이션이 끝날 때까지 이유를 알 수 없다.
  const validationNote = nameInvalid
    ? '계좌 이름을 입력해주세요'
    : showInstitutionError
      ? '금융기관을 선택해주세요'
      : showMaturityError
        ? '만기일을 선택해주세요'
        : null

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((prev) => ({
      modalOpen: prev.addAccountReturnTo,
      addAccountReturnTo: null,
      accountForm: BLANK_ACCOUNT_FORM,
      // 날짜는 폼이 아니라 datePickerPicked/dpNav에 남는다 — 여기서 지우지 않으면 다음에 "계좌 추가"를 열었을
      // 때 지난 개설일·만기일이 그대로 보인다.
      datePickerPicked: { ...prev.datePickerPicked, addAccountOpened: undefined, addAccountMaturity: undefined },
      datePickerNav: { ...prev.datePickerNav, addAccountOpened: undefined, addAccountMaturity: undefined },
      openDropdown: null,
      // 연동 서브뷰도 함께 접는다 — 남겨두면 다음에 "계좌 추가"를 열었을 때 계좌 폼이 아니라
      // 지난번 연동 화면이 그대로 뜬다(이 모달은 닫아도 언마운트되지 않는다).
      connectView: 'none',
      connectProvider: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 상태와 mutation
    // 에러를 직접 지우지 않으면 다음에 "계좌 추가"를 열었을 때 지난 실패 메시지가 그대로 보인다.
    setNameInvalid(false)
    setInstitutionMissing(false)
    setMaturityMissing(false)
    setInstitutionNone(false)
    setHoldings([])
    setPendingAssetClass(null)
    setInterestRateStr('')
    postAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((prev) => ({ accountForm: { ...prev.accountForm, ...patch } }))

  /**
   * 유형 칩 적용. 계좌 이름·금융기관·유동성·원화 금액은 유형과 무관한 사용자 의도라 그대로 두고,
   * 새 유형이 쓰지 않는 필드만 비운다(화면에서 사라지는 값이 다음 유형의 저장에 묻어 나가지 않게).
   */
  const applyAssetClass = (assetClass: AssetClass) => {
    const next = formFieldsOf(assetClass)
    setState((prev) => ({
      accountForm: {
        ...prev.accountForm,
        ...assetClassFormPreset(assetClass),
        ...(next.usdBalance ? {} : { initialBalanceUsd: '' }),
        ...(next.savingsFields ? {} : { interestRate: null, openedAt: null, maturityDate: null }),
      },
      ...(next.savingsFields
        ? {}
        : {
            datePickerPicked: { ...prev.datePickerPicked, addAccountOpened: undefined, addAccountMaturity: undefined },
            datePickerNav: { ...prev.datePickerNav, addAccountOpened: undefined, addAccountMaturity: undefined },
          }),
    }))
    // 종목은 시장(KR/US/CRYPTO)에 종속돼 있어 유형이 바뀌면 의미가 없다 — 아래 requestAssetClass가
    // 담긴 게 있으면 확인을 먼저 받는다.
    setHoldings([])
    setPendingAssetClass(null)
    setMaturityMissing(false)
    // 예적금이 아닌 유형으로 바꾸면 위에서 interestRate를 비우므로 입력칸 문자열도 같이 비운다.
    if (!next.savingsFields) setInterestRateStr('')
  }

  const requestAssetClass = (assetClass: AssetClass) => {
    if (assetClass === selectedAssetClass) return
    if (holdings.length > 0) {
      setPendingAssetClass(assetClass)
      return
    }
    applyAssetClass(assetClass)
  }

  const handleSave = () => {
    const missingName = !form.name.trim()
    // '없음'을 고른 것도 어엿한 선택이다 — 아직 아무것도 안 고른 경우만 막는다(현금 포함 모든 유형).
    const missingInstitution = form.institutionId === null && !institutionNone
    const maturityPicked = state.datePickerPicked['addAccountMaturity'] as { y: number; m: number; d: number } | undefined
    const maturityDate = maturityPicked ? pickedToISODate(maturityPicked) : (form.maturityDate ?? undefined)
    const missingMaturity = fields.savingsFields && !maturityDate
    setNameInvalid(missingName)
    setInstitutionMissing(missingInstitution)
    setMaturityMissing(missingMaturity)
    if (missingName || missingInstitution || missingMaturity) {
      // 첫 번째로 걸린 필드를 화면 한가운데로 데려온다. block:'center'인 이유는 이 모달의 헤더가
      // sticky라(유형 칩 포함 모바일에서 190~235px) 'start'로 맞추면 필드가 그 뒤에 숨기 때문이다.
      const target = missingName
        ? nameRef.current
        : missingInstitution
          ? institutionRef.current
          : maturityRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 이름 칸만 포커스까지 옮긴다 — 나머지 둘은 드롭다운/달력이라 포커스가 팝오버를 열어버린다.
      // preventScroll: 위 smooth 스크롤과 겹쳐 화면이 두 번 튀지 않게.
      if (missingName) nameRef.current?.focus({ preventScroll: true })
      return
    }

    const openedPicked = state.datePickerPicked['addAccountOpened'] as { y: number; m: number; d: number } | undefined
    const openedAt = openedPicked ? pickedToISODate(openedPicked) : (form.openedAt ?? undefined)

    const body: CreateAccountRequest = {
      name: form.name.trim(),
      type: form.type,
      currency: accountCurrency,
      initialBalanceKrw: form.initialBalanceKrw,
      // 주식은 달러 예수금과 원화 예수금이 서로 다른 돈이라 둘 다 싣는다 — 파일 상단 주석 참고.
      // 달러 칸을 비웠으면 필드 자체를 빼서 서버의 통화 검증을 건드리지 않는다(0을 보낼 이유가 없다).
      ...(fields.usdBalance && usdAmount > 0 ? { initialBalanceUsd: usdAmount } : {}),
      isLiquid: form.isLiquid,
      // '없음'이면 institutionId를 아예 싣지 않는다(서버 스펙: "현금 등 무기관 자산은 생략한다").
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
      // 예적금 전용. 그 외 유형은 위 applyAssetClass가 이미 비워둔다.
      ...(fields.savingsFields && form.interestRate !== null ? { interestRate: form.interestRate } : {}),
      ...(fields.savingsFields && openedAt ? { openedAt } : {}),
      ...(fields.savingsFields && maturityDate ? { maturityDate } : {}),
      // 보유 종목은 리스트가 붙는 2개 유형(주식·가상자산)에서, 실제로 담은 게 있을 때만 싣는다 —
      // 그 외 유형에 빈 배열이라도 보내면 400 INVALID_ACCOUNT_TYPE으로 계좌 자체가 안 만들어진다
      // (OpenAPI 명시). fields.holdingMarkets로 막고 있어 현재 UI에서는 생길 수 없지만, 두 조건을
      // 함께 둬서 나중에 유형이 늘어도 잘못된 조합이 나가지 않게 한다.
      ...(fields.holdingMarkets.length > 0 && holdings.length > 0
        ? {
            holdings: holdings.map((h) => ({
              stockId: h.stockId,
              quantity: Number(h.quantityStr) || 0,
              // 평단가는 종목 표시 통화 기준이다 — 해외(US)는 달러, 국내·코인은 원화. 한 계좌에
              // 국내·해외가 섞이므로 줄마다 단위가 다를 수 있다. AccountHoldingsField가 각 줄의
              // 시장에 맞는 단위로 입력받아 두므로 여기서 환산하지 않는다.
              price: Number(h.avgPriceStr) || 0,
            })),
          }
        : {}),
    }

    postAccount.mutate(body, { onSuccess: resetAndClose })
  }

  const krwAmountField = (
    <div style={{ flex: 1 }}>
      <div style={LABEL_STYLE}>{fields.amountLabel}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
        <span style={AMOUNT_PREFIX_STYLE}>₩</span>
        <input
          type="text" inputMode="numeric" placeholder="0"
          value={form.initialBalanceKrw ? formatNumber(form.initialBalanceKrw) : ''}
          onChange={(e) => patchForm({ initialBalanceKrw: parseAmount(e.target.value) })}
          style={AMOUNT_INPUT_STYLE}
        />
      </div>
    </div>
  )

  const institutionField = (
    <div ref={institutionRef} style={{ flex: 1, position: 'relative' }}>
      <div style={LABEL_STYLE}>금융기관</div>
      {institutionsQuery.isPending ? (
        <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, color: 'var(--text-weak)' }}>—</div>
      ) : institutionsErr ? (
        <div style={{ ...FIELD_BORDER_STYLE, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: 12.5, color: 'var(--down)' }}>
          금융기관을 불러오지 못했어요
          <button type="button" onClick={() => void institutionsQuery.refetch()} style={RETRY_BTN_STYLE}>다시 시도</button>
        </div>
      ) : (
        <Dropdown dd={ddInstitutionDisplay} maxHeight={220} />
      )}
      {showInstitutionError && <div style={FIELD_ERROR_STYLE}>금융기관을 선택해주세요</div>}
    </div>
  )

  // 스크롤해도 닫기 버튼과 유형 칩이 항상 보이게 패널 위쪽에 고정한다(파일 상단 주석 참고).
  // 좌우 음수 마진으로 패널 패딩만큼 밖으로 번지게 해서, 스크롤된 내용이 옆으로 비쳐 보이지 않게 한다.
  const gutter = isMobile ? 18 : 30
  const stickyTopStyle: CSSProperties = {
    position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)',
    margin: `0 ${-gutter}px 18px`, padding: `2px ${gutter}px 14px`,
  }
  // 저장 버튼은 다른 17개 모달과 마찬가지로 콘텐츠 맨 끝에 둔다. 한때 하단에도 sticky를 걸어봤으나,
  // Modal 패널의 padding이 스크롤 영역 안쪽에 있어 sticky bottom이 그 padding만큼 위로 붙으면서 바로
  // 위 필드(유동성 칩)를 덮었다. 보유 종목 리스트가 이미 5줄에서 자체 스크롤로 높이를 묶어두므로
  // (AccountHoldingsField) 폼이 무한정 길어지지 않아, 굳이 이 모달만 다른 규격을 만들 이유가 없다.
  const footerStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }

  // 이 자산 유형에 연동 가능한 기관이 있는지. 주식·가상자산만 해당한다. 하드코딩하지 않고 기관
  // 목록에서 역산하므로, 지원 기관이 늘거나 줄어도 이 조건을 따로 고칠 필요가 없다.
  const connectProviders = providersFor(selectedAssetClass)
  const openConnect = () => {
    // 후보가 하나뿐이면(가상자산 = 업비트) 칩 하나짜리 선택 화면을 거치게 하지 않고 바로 키 입력으로.
    if (connectProviders.length === 1) setState({ connectView: 'form', connectProvider: connectProviders[0] })
    else setState({ connectView: 'provider', connectProvider: null })
  }

  // 연동 서브뷰는 계좌 폼을 대체한다(같은 패널, 새 모달 아님 — ConnectAccountView 상단 주석 참고).
  if (state.connectView !== 'none') {
    return (
      <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ maxHeight: '90vh', overflow: 'auto' }}>
        <ConnectAccountView assetClass={selectedAssetClass} onDone={resetAndClose} />
      </Modal>
    )
  }

  return (
    <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ maxHeight: '90vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}

      <div style={stickyTopStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="account_balance" size={20} />
            </span>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 추가</div>
          </div>
          <button
            onClick={resetAndClose}
            aria-label="닫기"
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Icon name="close" size={19} color="var(--text-mid)" />
          </button>
        </div>
        <div style={LABEL_STYLE}>자산 유형</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ASSET_CLASS_ORDER.map((c) => (
            <button
              key={c}
              className="mini-hov"
              onClick={() => requestAssetClass(c)}
              style={chipStyle(selectedAssetClass === c)}
            >
              {ASSET_CLASS_META[c].label}
            </button>
          ))}
        </div>
        {pendingAssetClass && (
          // 담아둔 종목은 시장에 종속돼 다른 유형으로 넘어가면 의미가 없다. 조용히 날리지 않고 그 자리에서
          // 확인만 받는다 — TradeEditModal의 인라인 확인 블록과 같은 규격(새 모달을 띄우지 않는다).
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>
              {ASSET_CLASS_META[pendingAssetClass].label}(으)로 바꿀까요?
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>
              추가한 {fields.holdingMarkets[0] === 'CRYPTO' ? '코인' : '종목'} {holdings.length}개가 사라져요. 계좌 이름과 금액은 그대로 남아요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="qbtn"
                onClick={() => applyAssetClass(pendingAssetClass)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                계속할게요
              </button>
              <button
                type="button"
                className="qbtn"
                onClick={() => setPendingAssetClass(null)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* 연동 진입점. sticky 헤더가 아니라 본문 맨 위에 두는 이유: 헤더에 넣으면 모바일 바텀시트에서
            스크롤 내내 화면을 차지한다. 여기라면 스크롤과 함께 자연스럽게 사라지고, 아직 아무 값도
            입력하지 않은 시점이라 "적던 게 사라진다"는 손실감도 없다. 지원 기관이 없는 유형(현금·
            예적금·연금)에서는 아예 렌더하지 않아 "내 은행은 없네"를 겪을 일이 없다. */}
        {connectProviders.length > 0 && (
          <button type="button" className="qbtn" onClick={openConnect} style={CONNECT_BANNER_STYLE}>
            <Icon name="link" size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} ariaHidden />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>
                {providerLabelsFor(selectedAssetClass)}을 쓰시나요?
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                API 키를 등록하면 계좌와 {selectedAssetClass === 'CRYPTO' ? '거래' : '매매'} 내역이 자동으로 채워져요
              </span>
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, alignSelf: 'center' }}>
              연동하기
            </span>
          </button>
        )}
        <div>
          <div style={LABEL_STYLE}>계좌 이름</div>
          <input
            ref={nameRef}
            type="text" placeholder="예: 파킹통장"
            value={form.name}
            onChange={(e) => {
              patchForm({ name: e.target.value })
              if (nameInvalid) setNameInvalid(false)
            }}
            style={TEXT_INPUT_STYLE}
          />
          {nameInvalid && <div style={FIELD_ERROR_STYLE}>계좌 이름을 입력해주세요</div>}
        </div>

        {fields.usdBalance ? (
          <>
            {institutionField}
            <div style={fieldRowStyle}>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>현재 달러 잔액</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <span style={AMOUNT_PREFIX_STYLE}>$</span>
                  {/* 달러는 센트 단위가 있어 소수점 둘째 자리까지 받는다. 입력 도중 상태("12." 등)를
                      지우지 않도록 문자열 그대로 보관하고 저장 시점에만 숫자로 환산한다. */}
                  <input
                    type="text" inputMode="decimal" placeholder="0.00"
                    value={form.initialBalanceUsd}
                    onChange={(e) => patchForm({ initialBalanceUsd: sanitizeDecimalInput(e.target.value, 2) })}
                    style={AMOUNT_INPUT_STYLE}
                  />
                </div>
              </div>
              {krwAmountField}
            </div>
            {/* 두 칸이 "같은 돈의 환산"이 아니라 "따로 들어 있는 두 돈"이라는 걸 분명히 한다. */}
            <div style={FIELD_HINT_STYLE}>달러와 원화, 계좌에 실제로 들어 있는 두 돈을 각각 적어주세요. 서로 환산해서 넣지 않아도 돼요</div>
          </>
        ) : (
          <div style={fieldRowStyle}>
            {institutionField}
            {krwAmountField}
          </div>
        )}

        {fields.savingsFields && (
          <>
            <div>
              <div style={LABEL_STYLE}>이자율 % (선택)</div>
              <input
                type="text" inputMode="decimal" placeholder="0.00"
                value={interestRateStr}
                onChange={(e) => {
                  const sanitized = sanitizeDecimalInput(e.target.value, 2)
                  setInterestRateStr(sanitized)
                  patchForm({ interestRate: sanitized === '' ? null : Number(sanitized) })
                }}
                style={TEXT_INPUT_STYLE}
              />
            </div>
            {/* 개설일·만기일은 각각 단독 전체 폭 행이어야 한다 — flex:1 두 칸짜리 좁은 열에 두면
                DatePicker의 고정 240px 팝오버가 칸 밖으로 삐져나가 패널의 overflow:'auto'에 잘린다. */}
            <div style={{ position: 'relative' }}>
              <div style={LABEL_STYLE}>개설일 (선택)</div>
              <DatePicker dp={dpOpened} />
            </div>
            <div ref={maturityRef} style={{ position: 'relative' }}>
              <div style={LABEL_STYLE}>만기일</div>
              <DatePicker dp={dpMaturity} />
              {showMaturityError && <div style={FIELD_ERROR_STYLE}>만기일을 선택해주세요</div>}
            </div>
          </>
        )}

        {fields.holdingMarkets.length > 0 && (
          // key에 시장 목록을 걸어 유형이 바뀌면 통째로 다시 마운트한다. 담긴 목록(holdings)은
          // applyAssetClass가 비우지만, **고르는 중이던 종목**은 이 컴포넌트 내부 상태(pending)라
          // 부모가 손댈 수 없다 — key가 없으면 주식에서 '삼성전자'를 고른 상태로 가상자산으로
          // 바꿨을 때 그 줄이 그대로 남고, 그대로 추가하면 코인 계좌에 주식이 등록된다(서버는 계좌
          // 유형과 종목 시장을 검증하지 않는다).
          <AccountHoldingsField
            key={fields.holdingMarkets.join(',')}
            markets={fields.holdingMarkets}
            enabled={isOpen}
            items={holdings}
            onChange={setHoldings}
          />
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
      </div>

      <div style={footerStyle}>
        {/* 화면 밖 필드에서 검증에 걸렸을 때, 누른 자리에서 바로 이유를 읽을 수 있게 한다.
            role="alert"라 스크린리더도 즉시 읽는다(validationNote 주석 참고). */}
        {validationNote && (
          <div role="alert" style={{ fontSize: 11.5, color: 'var(--down)' }}>{validationNote}</div>
        )}
        {postAccount.error && (
          // FX_RATE_NOT_FOUND(422)는 서버 장애가 아니라 "그 통화 환율 고시가 아직 없음"이다 — 달러 계좌를
          // 만들 때만 나며, 사용자가 잘못한 게 아니므로 빨간 에러가 아니라 회색 안내로 렌더한다
          // (docs/api-conventions.md "에러가 아닌 실패"). 그 외 실패는 서버 message를 그대로 보여준다.
          isFxRateMissing(postAccount.error) ? (
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
              아직 오늘 환율이 들어오지 않아 해외주식 계좌를 만들 수 없어요. 잠시 뒤에 다시 시도해주세요
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{postAccount.error.message}</div>
          )
        )}
        <button
          onClick={handleSave}
          disabled={postAccount.isPending}
          aria-busy={postAccount.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postAccount.isPending ? 'default' : 'pointer', opacity: postAccount.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postAccount.isPending ? '저장 중…' : '계좌 추가'}
        </button>
      </div>
    </Modal>
  )
}
