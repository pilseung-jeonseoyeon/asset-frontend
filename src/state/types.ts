// AppState의 형태.
// 아래 '// auth' 블록은 백엔드가 JWT 인증을 요구하면서 더해진 것으로, 실제 POST /auth/* 계약에
// 맞춰져 있다(src/screens/Auth/ 참고). 비밀번호 문자열은 의도적으로 이 형태에 넣지 않는다 —
// 각 폼의 로컬 useState에 두는 이유는 screens/Auth/*Form.tsx 헤더 주석 참고.

import type { AccountType, AssetClass, Currency } from '@/services/common.type'

export type Screen = 'dashboard' | 'asset' | 'stock' | 'ledger' | 'settings'
export type AssetTab = 'overview' | 'accounts' | 'goals'
export type LedgerTab = 'overview' | 'history'
export type LedgerPeriod = 'month' | 'year'
export type LedgerRange = 'month' | 'week'
export type StockGroupTab = 'sector' | 'country'
/** 주식 화면 상단의 시장 탭. 표시 문구는 data/stocksView.ts의 STOCK_MARKET_TAB_LABELS. */
export type StockMarketTab = 'all' | 'domestic' | 'foreign'
export type AccountModalView = 'main' | 'profile' | 'password'
/** 계좌 추가 모달 안의 API 연동 서브뷰 단계. 'none'이면 일반 계좌 폼. */
export type ConnectView = 'none' | 'provider' | 'form' | 'result'
export type StockTradeMode = 'buy' | 'sell'
export type StockBuyMarket = 'domestic' | 'overseas'
export type RecurringType = 'fixed' | 'subscription'
export type EntryType = 'income' | 'expense' | 'saving' | 'transfer'
export type AuthScreen = 'login' | 'signup' | 'resetPassword'
/** 'terms'는 signup 전용(1/3 약관 동의). 'form' → 이메일 등 정보 입력 단계(signup 2/3, resetPassword
 * 1/2). 'sent' → 인증 코드 발송 완료, 코드 입력 단계 노출(signup 3/3, resetPassword 2/2).
 * 'onboard'는 signup 전용 — 인증 완료 뒤 프로필(아바타) 확인 단계. 이 단계에서는 아직
 * useAuthStore().status가 'anonymous'다(POST /auth/signup 응답 토큰을 들고만 있고 아직 signIn하지
 * 않은 상태) — "모닛 시작하기"를 눌러야 실제로 로그인 상태가 된다. 'done'은 resetPassword
 * 전용(비밀번호 변경 완료 안내). */
export type AuthStep = 'terms' | 'form' | 'sent' | 'onboard' | 'done'
/** 회원가입 1/3 약관 동의 항목. `age`/`service`/`privacy`는 필수, `marketing`은 선택. */
export type AuthAgreementKey = 'service' | 'privacy' | 'marketing'

// AddAccountModal/EditAccountModal이 공유하는 계좌 폼 초안. id가 null이면 신규(POST), 아니면 수정(PATCH
// 대상 accountId). 서버가 부분 수정을 허용하는 필드(institutionId/name/type/interestRate/maturityDate/
// isLiquid)만 편집 가능하고, currency/initialBalanceKrw/openedAt은 PATCH가 거부하므로 수정 화면에서는
// 읽기 전용으로만 다룬다(src/services/account/account.type.ts UpdateAccountRequest 참고).
export interface AccountForm {
  id: number | null
  institutionId: number | null
  name: string
  type: AccountType
  currency: Currency
  /** 원화 예수금. 신규 생성 시에만 전송한다 — 수정 시 서버가 거부한다(UpdateAccountRequest에 필드
   * 자체가 없음). POST /accounts의 initialBalanceKrw로 그대로 나간다. */
  initialBalanceKrw: number
  /** 달러 예수금 입력값(원시 입력 문자열, 소수점 2자리까지) — 저장 시 숫자로 바꿔 POST /accounts의
   * **initialBalanceUsd**로 보낸다(initialBalanceNative가 아니다 — 그 이름은 서버 계약에 없고, 그대로
   * 보내면 달러 예수금이 조용히 누락된다).
   * 한 계좌가 원화·달러 예수금을 동시에 가질 수 있으므로 위 initialBalanceKrw와 함께 보낼 수 있다.
   * 환율은 프론트가 다루지 않는다 — 서버가 두 원금을 입력값 그대로 보관하고 원화 환산은 조회 시점
   * 환율로 매번 계산한다. */
  initialBalanceUsd: string
  interestRate: number | null
  openedAt: string | null
  maturityDate: string | null
  isLiquid: boolean
}

/** 저장하지 않고 닫은 가계부 입력 폼의 내용. AppState.entryDraft 주석 참고. */
export interface EntryDraft {
  entryType: EntryType
  entryAmount: number
  entryDescription: string
  entryMemo: string
  entrySubcategoryId: number | null
  entryAccountId: number | null
  entryWithdrawAccountId: number | null
  entryDateOverride: string | null
  /** 달력 팝오버가 고른 날짜. entryDateOverride만 되살리면 달력이 기본 달로 돌아간다. */
  datePickerPickedEntry: unknown
  datePickerViewingMonthEntry: unknown
}

export interface AppState {
  // navigation
  assetTab: AssetTab
  assetClassDetail: AssetClass | null
  stockMarketTab: StockMarketTab
  stockGroupTab: StockGroupTab
  ledgerTab: LedgerTab
  ledgerPeriod: LedgerPeriod
  ledgerRange: LedgerRange

  // modal / overlay state
  openModal: string | null
  /** 계좌 상세 모달 대상 accountId. null이면 닫혀 있음(AccountDetailModal). */
  accountDetailId: number | null
  reportOpen: boolean
  reportSlide: number
  accountModalView: AccountModalView
  withdrawConfirmOpen: boolean

  // 드롭다운 열림 상태(openDropdown = 열린 드롭다운 키)와 선택값(dropdownValues[key])
  openDropdown: string | null
  dropdownValues: Record<string, unknown>

  // header
  quickAddOpen: boolean
  notificationOpen: boolean

  // profile: 사용자 이름/이메일은 서버(GET /users/me)에서 온다 — services/user의 useProfileName 참고

  // theme
  theme: 'light' | 'dark' | 'system'
  amountsHidden: boolean

  // stock entry
  /** 신규 종목 등록 시 선택한 섹터 칩. 빈 문자열이면 미선택(전송하지 않음) — 절대 기본값을 채우지
   * 말 것(과거 '반도체' 하드코딩이 모든 신규 종목을 조용히 오염시켰던 버그, docs/backend-request.md
   * 5-1 참고). */
  stockSector: string
  stockBuyMarket: StockBuyMarket
  stockTradeMode: StockTradeMode

  // trade edit (Stocks 화면 — 매매 내역 수정, GET /trades에 단건 조회가 없어 목록 캐시에서 id로 찾는다)
  /** 수정 대상 tradeId(서버 id). null이면 매매 수정 모달이 닫혀 있음. */
  editingTradeId: number | null

  // exchange history (Stocks 화면 — 환전 내역 목록/수정)
  /** 환전 내역 모달 안에서 수정 대상 exchangeId. null이면 목록 뷰. */
  editingExchangeId: number | null

  // asset/account editing
  /** 수정 대상 accountId. null이면 'editAccount' 모달이 닫혀 있음. */
  editingAccountId: number | null
  accountForm: AccountForm
  addingCategoryGroup: string | null
  addAccountReturnTo: string | null
  addGoalReturnTo: string | null

  // 증권사·거래소 API 키 연동(BYOK). AddAccountModal 안에서 서브뷰로 전환된다.
  //
  // 발급받은 API 키 자체는 여기 두지 않는다 — 전역 상태에 담으면 모달을 닫아도 메모리에 남고
  // 다른 화면에서도 읽을 수 있다. 비밀번호 폼과 같이 컴포넌트 로컬 state로 들고 있다가
  // 모달을 닫을 때 지운다(AddAccountModal의 resetAndClose 참고).
  connectView: ConnectView
  /** 선택한 ConnectionProvider. connectView가 'form' 이상일 때만 의미가 있다. */
  connectProvider: string | null

  // recurring expense
  recurringType: RecurringType
  /** 고정 지출·구독은 항상 EXPENSE 대분류 소분류라 major/sub 인덱스가 아니라 leaf id 하나로 추적한다. */
  recurringSubcategoryId: number | null
  /** 결제수단(계좌) — GET /accounts 목록의 accountId. */
  recurringAccountId: number | null
  /** "N일" 형식(예: '25일'). 제출 시 parseInt로 paymentDay(1~31)를 뽑는다.
   * 반복 주기는 매월 전용이다 — 서버에 frequency 필드 자체가 없다. */
  recurringPaymentDay: string
  recurringName: string
  /** 정수 원화 금액. */
  recurringAmount: number
  /** 수정 대상 subscriptionId(서버 id). null이면 신규 추가. */
  editingRecurringId: number | null

  // ledger entry / rows
  entryType: EntryType
  /** 수정 대상 transactionId(서버 id, LedgerTransactionRow.id). null이면 신규 등록. */
  editingTransactionId: number | null
  /** 분류별 지출 상세 모달 대상 categoryId. */
  categoryDetailId: number | null
  entryTabsVisible: boolean
  /** 수입/지출/저축 항목의 소분류 id. null이면 해당 거래유형의 첫 대분류·첫 소분류를 기본값으로 보여준다. */
  entrySubcategoryId: number | null
  /** "계좌"/"저축처"/"입금계좌" 필드 — GET /accounts 목록의 accountId. */
  entryAccountId: number | null
  /** "출금계좌" 필드(이체 전용 — 저축은 서버 계좌 필드가 하나뿐이라 뺐다) — GET /accounts 목록의 accountId. */
  entryWithdrawAccountId: number | null
  /** 정수 원화 금액. */
  entryAmount: number
  entryDescription: string
  /** 메모(선택 입력, CreateTransactionReq.memo). 빈 문자열이면 미입력 — 제출 시 키 자체를 뺀다. */
  entryMemo: string
  /**
   * 가계부 입력 모달이 편집하지 않는 거래 필드. PUT이 전체 교체라 다시 보내지 않으면 사용자가
   * 금액만 고쳐 저장해도 외화 정보가 조용히 사라진다 — 수정 모달을 열 때 원본을 담아두고 저장 시
   * 그대로 되돌려 보낸다. 신규 등록일 때는 null. memo는 entryMemo로 직접 편집하므로 여기 없다.
   */
  entryPreserved: {
    nativeAmount: number | null
    nativeCurrency: Currency | null
  } | null
  ledgerPage: number
  entryDateOverride: string | null
  /** 내역 탭이 보고 있는 정산월 커서. src/utils/date.ts의 todayYearMonth/shiftYearMonth 참고. */
  ledgerYear: number
  ledgerMonth: number
  /**
   * 내역 탭 주간 뷰가 보고 있는 주의 월요일('YYYY-MM-DD', src/utils/date.ts의 mondayOf 참고). 정산월
   * 경계를 서버가 안 알려줘 순수 달력 주(월요일 시작) 기준이다 — ledgerYear/ledgerMonth와 별도로 둔다.
   */
  ledgerWeekAnchor: string
  /**
   * 내역 탭에서 사용자가 달력의 특정 날짜 칸을 눌러 고른 날('YYYY-MM-DD'). null이면 기간 전체를 본다.
   * 고르면 아래 목록이 그 하루로 좁혀진다 — 예전에는 날짜 칸을 누르면 곧바로 지출 입력 폼이 열려서,
   * 특히 모바일(칸에 금액 없이 색 점만 남음)에서 "그날 뭐 썼지"를 볼 방법이 아예 없었다.
   */
  ledgerSelectedDate: string | null
  /**
   * 내역 탭 검색어(내용·메모). 비어 있지 않으면 달력이 보고 있는 기간·선택 날짜를 무시하고
   * 전체 기간에서 찾는다 — "지난번에 그거 언제였지"를 달을 넘겨가며 찾지 않아도 되게 하기 위함이다.
   */
  ledgerSearch: string
  /**
   * 가계부 거래 입력 모달에서 저장하지 않고 닫았을 때 보관해 두는 초안(사용자 요청).
   * 배경 클릭으로도 모달이 닫히게 되면서(primitives/Modal의 handleScrimPointerDown) 실수로 닫아도
   * 적던 내용이 사라지지 않도록 하기 위한 것이다. **새 거래 등록에서만 만들어진다** — 기존 거래 수정
   * 세션은 초안을 남기지 않는다(다시 열면 서버 값을 다시 채우는 게 맞다).
   * 다시 열 때 같은 거래유형이면 복원되고, 저장했거나 거래유형 탭을 바꾸면 버려진다.
   */
  entryDraft: EntryDraft | null
  /**
   * 방금 연 입력 폼이 초안에서 되살아난 것인지. true면 모달이 "이어서 작성 중이던 내용을 불러왔어요"
   * 배너를 띄운다 — 조용히 채워 넣으면 며칠 전 초안의 금액을 새 거래인 줄 알고 그대로 저장하게 된다.
   * 배너를 닫거나 "새로 작성"을 누르면 꺼진다.
   */
  entryDraftRestored: boolean
  // monthStartDay(정산월 시작일)는 서버 사용자 설정에 있다 — services/user의 useGetUserSettings 참고

  // date-picker widget state
  datePickerPicked: Record<string, unknown>
  datePickerViewingMonth: Record<string, unknown>

  // 인증(로그인 / 회원가입 / 비밀번호 재설정 — src/screens/Auth). useAuthStore().status가
  // 'anonymous'일 때만 의미가 있다. 비밀번호는 절대 담지 않는다(파일 헤더 주석 참고).
  authScreen: AuthScreen
  authStep: AuthStep
  authEmail: string
  /** 회원가입 이름 입력값. */
  authName: string
  /** 이메일 인증 코드 6자리(가입/비밀번호 재설정 공용 — 두 화면이 동시에 열리지 않으므로 공유해도
   * 값이 섞이지 않는다). */
  authCode: string
  /** 로그인 화면의 "로그인 상태 유지" 체크박스 → LoginRequest.rememberMe */
  authKeepLogin: boolean
  /** 회원가입 1/3 약관 동의 체크 상태. 체크된 항목이 SignupRequest.agreements 배열로 전송된다. */
  authAgreements: Record<AuthAgreementKey, boolean>
  /** 인증 코드를 마지막으로 요청한 시각(ms). 재발송 버튼 쿨다운 계산에 사용, 발송 전엔 null. */
  authCodeSentAt: number | null
}
