// AppState의 기본값 — 앱을 처음 열었을 때의 상태.

import { mondayOf, todayYearMonth, toISODate } from '../utils/date'
import { readStoredTheme } from '../utils/theme'
import type { AccountForm } from './types'
import type { AppState } from './types'

// AddAccountModal/EditAccountModal이 재사용하는 빈 폼. 두 모달 모두 닫을 때(저장/취소 불문) 이 값으로
// 되돌려, 다음에 여는 모달(다른 계좌 수정이든 새 계좌 추가든)이 이전 세션의 잔재를 물려받지 않게 한다.
export const BLANK_ACCOUNT_FORM: AccountForm = {
  id: null,
  institutionId: null,
  name: '',
  type: 'CASH',
  currency: 'KRW',
  initialBalanceKrw: 0,
  initialBalanceUsd: '',
  interestRate: null,
  openedAt: null,
  maturityDate: null,
  isLiquid: true,
}

const todayCursor = todayYearMonth()

export const initialState: AppState = {
  assetTab: 'overview',
  assetClassDetail: null,
  stockTab: '전체',
  stockGroupTab: 'sector',
  ledgerTab: 'overview',
  ledgerPeriod: 'month',
  ledgerView: 'calendar',
  ledgerRange: 'month',

  modalOpen: null,
  accountDetail: null,
  reportOpen: false,
  reportSlide: 0,
  accountModalView: 'main',
  withdrawConfirmOpen: false,

  openDropdown: null,
  dropdownValues: {},

  quickAddOpen: false,
  notificationOpen: false,

  // index.html의 부팅 전 인라인 스크립트와 같은 값을 읽어, 최초 렌더부터 <html> 클래스와
  // AppState가 어긋나지 않게 한다(2단계 참고). 로그인 후에는 useSyncUserTheme이 서버 값으로 덮는다.
  theme: readStoredTheme(),
  amountsHidden: true,

  // 빈 문자열 = 미선택. 기본값을 채우면 사용자가 칩을 한 번도 안 눌러도 그 값이 조용히 전송된다
  // (docs/backend-request.md 5-1 — 과거 '반도체' 하드코딩 버그).
  stockSector: '',
  stockBuyMarket: 'domestic',
  stockTradeMode: 'buy',

  editingTradeId: null,
  editingExchangeId: null,

  editAccount: null,
  accountForm: BLANK_ACCOUNT_FORM,
  addingCategoryGroup: null,
  addAccountReturnTo: null,
  addGoalReturnTo: null,

  connectView: 'none',
  connectProvider: null,

  recurringType: 'fixed',
  recurringSubcategoryId: null,
  recurringAccountId: null,
  recurringPaymentDay: '25일',
  recurringName: '',
  recurringAmount: 0,
  editingRecurringId: null,

  entryType: 'income',
  editingTxId: null,
  categoryDetailId: null,
  entryTabsVisible: false,
  entrySubcategoryId: null,
  entryAccountId: null,
  entryWithdrawAccountId: null,
  entryAmount: 0,
  entryDescription: '',
  entryMemo: '',
  entryPreserved: null,
  ledgerPage: 1,
  entryDateOverride: null,
  ledgerYear: todayCursor.year,
  ledgerMonth: todayCursor.month,
  ledgerWeekAnchor: mondayOf(toISODate(new Date())),
  ledgerSelectedDate: null,
  ledgerSearch: '',
  entryDraft: null,
  entryDraftRestored: false,

  datePickerPicked: {},
  datePickerNav: {},

  authScreen: 'login',
  authStep: 'form',
  authEmail: '',
  authName: '',
  authCode: '',
  // rememberMe를 생략하면 서버 기본값이 true다 — 화면 기본값도 체크로 맞춘다.
  authKeepLogin: true,
  authAgreements: { service: false, privacy: false, marketing: false },
  authCodeSentAt: null,
}
