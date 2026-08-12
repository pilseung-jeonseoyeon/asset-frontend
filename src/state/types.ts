// Source: secret/Asset Manager v14.dc.html L3480-3522 (state = {...}) — field set mirrored 1:1.
// `dash` (L4416-4418) is used by the source but never declared in the initial state object, so it
// starts as `null` here rather than an invented default.
//
// Auth fields (below, "// auth") were added once the backend turned on JWT auth (see
// src/screens/Auth/). They're a superset of the source's auth-only fields (authScreen, keepLogin,
// agree, ...) reshaped around the real POST /auth/* contract instead of the source's UI-prototype-only
// stub handlers. Password strings are deliberately NOT part of this shape — see screens/Auth/*Form.tsx
// header comments for why they stay in local useState instead.

import type { AccountType, AssetClass, Currency, InstitutionType } from '@/services/common.type'

export type Screen = 'dashboard' | 'asset' | 'stock' | 'ledger' | 'settings'
export type AssetTab = 'overview' | 'accounts' | 'goals'
export type LedgerTab = 'overview' | 'history'
export type LedgerPeriod = 'month' | 'year'
export type LedgerRange = 'month' | 'week'
export type MapSort = 'nature' | 'institution'
export type StockGroupTab = 'sector' | 'country'
export type RecurringType = 'fixed' | 'subscription'
export type EntryType = 'income' | 'expense' | 'saving' | 'transfer'
export type DashTab = 'A' | 'B' | 'C' | null
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
// isLiquid)만 편집 가능하고, currency/initialBalance/openedAt은 PATCH가 거부하므로 수정 화면에서는
// 읽기 전용으로만 다룬다(src/services/account/account.type.ts UpdateAccountRequest 참고).
export interface AccountForm {
  id: number | null
  institutionId: number | null
  name: string
  type: AccountType
  currency: Currency
  /** 신규 생성 시에만 전송 — 수정 시 서버가 거부(UpdateAccountRequest에 필드 자체가 없음). */
  initialBalance: number
  interestRate: number | null
  openedAt: string | null
  maturityDate: string | null
  isLiquid: boolean
}

// InstitutionsModal의 기관 추가/수정 폼 초안. id가 null이면 신규, 아니면 수정 대상 institutionId.
// null이면 폼이 닫혀 있음(목록 뷰)을 뜻한다.
export interface InstitutionForm {
  id: number | null
  name: string
  type: InstitutionType
  /** src/design/bank-institutions.ts의 tokenKey 중 하나(서버가 받는 값 집합이 불명확해 프론트가 아는
   * 값만 고르게 한다) 또는 미선택 null. */
  icon: string | null
}

export interface AppState {
  // navigation
  screen: Screen
  assetTab: AssetTab
  assetCat: AssetClass | null
  stockTab: string // '전체' | '국내' | '해외' — Korean-literal enum, kept as string (see extraction discipline)
  stockGroupTab: StockGroupTab
  ledgerTab: LedgerTab
  ledgerPeriod: LedgerPeriod
  ledgerView: string // initial 'calendar'; other values unverified — confirm during Phase 8
  ledgerRange: LedgerRange
  trendPeriod: string // initial 'month'
  mapSort: MapSort
  dash: DashTab

  // modal / overlay state
  modalOpen: string | null
  /** 계좌 상세 모달 대상 accountId. null이면 닫혀 있음(AccountDetailModal). */
  accountDetail: number | null
  reportOpen: boolean
  reportSlide: number
  accountModalView: string // initial 'main'
  withdrawConfirmOpen: boolean

  // dropdown state — per-key shape confirmed per-dropdown during extraction (ddXxx pattern)
  openDropdown: string | null
  dd: Record<string, unknown>

  // header
  quickAddOpen: boolean
  notifOpen: boolean

  // profile: 사용자 이름/이메일은 서버(GET /users/me)에서 온다 — services/user의 useProfileName 참고

  // theme
  theme: 'light' | 'dark' | 'system'
  amountsHidden: boolean

  // stock entry
  stockSector: string
  stockBuyMarket: string
  stockTradeMode: string // initial 'buy'

  // asset/account editing
  /** 수정 대상 accountId. null이면 editAccount 모달이 닫혀 있음. */
  editAccount: number | null
  accountForm: AccountForm
  institutionForm: InstitutionForm | null
  addingCatGroup: string | null
  addAccountReturnTo: string | null
  addGoalReturnTo: string | null

  // recurring expense
  recurringType: RecurringType
  /** 고정 지출·구독은 항상 EXPENSE 대분류 소분류라 major/sub 인덱스가 아니라 leaf id 하나로 추적한다. */
  recurSubcategoryId: number | null
  /** 결제수단(계좌) — GET /accounts 목록의 accountId. */
  recurAccountId: number | null
  /** '매월'만 지원(서버 paymentDay는 1~31 하나뿐). weekly/yearly UI가 걷혀 이 값은 항상 'monthly'로
   * 고정되지만, 다른 작업과의 충돌을 피하려고 필드 자체는 남겨둔다(사용처 없음 — Ledger 보고 참고). */
  recurFreq: string // initial 'monthly'
  /** "N일" 형식(예: '25일'). 제출 시 parseInt로 paymentDay(1~31)를 뽑는다. */
  recurPayDay: string
  /** 더 이상 화면에서 쓰지 않음(사용처 없음 — Ledger 보고 참고). */
  recurYearMonth: string
  /** 더 이상 화면에서 쓰지 않음(사용처 없음 — Ledger 보고 참고). */
  recurYearDay: string
  recurName: string
  /** 정수 원화 금액. */
  recurAmount: number
  /** 수정 대상 subscriptionId(서버 id). null이면 신규 추가. */
  editingRecurId: number | null

  // ledger entry / rows
  entryType: EntryType
  rowMenuOpen: string | null
  /** 수정 대상 transactionId(서버 id, LedgerTxRow.id). null이면 신규 등록. */
  editingTxId: number | null
  /** 분류별 지출 상세 모달 대상 categoryId. */
  catDetailCategoryId: number | null
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
  /**
   * 가계부 입력 모달이 편집하지 않는 거래 필드. PUT이 전체 교체라 다시 보내지 않으면 사용자가
   * 금액만 고쳐 저장해도 메모·외화 정보가 조용히 사라진다 — 수정 모달을 열 때 원본을 담아두고
   * 저장 시 그대로 되돌려 보낸다. 신규 등록일 때는 null.
   */
  entryPreserved: {
    memo: string | null
    nativeAmount: number | null
    nativeCurrency: Currency | null
  } | null
  ledgerPage: number
  entryDateOverride: string | null
  /** 내역 탭이 보고 있는 정산월 커서. src/utils/date.ts의 todayYearMonth/shiftYearMonth 참고. */
  ledgerYear: number
  ledgerMonth: number
  // monthStartDay(정산월 시작일)는 서버 사용자 설정에 있다 — services/user의 useGetUserSettings 참고

  // selection defaults for entry form
  expenseCatSel: string
  incomeTypeSel: string
  savingAcctSel: string

  // date-picker widget state
  dpPicked: Record<string, unknown>
  dpNav: Record<string, unknown>

  // auth (login / signup / password-reset — src/screens/Auth) — only relevant while
  // useAuthStore().status === 'anonymous'. Never holds a password (see file header comment).
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
  /** 회원가입 1/3 약관 동의 체크 상태. `marketing` 값이 SignupRequest.hasMarketingOptIn으로 전송된다. */
  authAgreements: Record<AuthAgreementKey, boolean>
  /** 인증 코드를 마지막으로 요청한 시각(ms). 재발송 버튼 쿨다운 계산에 사용, 발송 전엔 null. */
  authCodeSentAt: number | null
}
