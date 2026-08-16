// Source: secret/Asset Manager v14.dc.html L3480-3522 — default values transcribed verbatim.
// The `// auth` block at the bottom has no source equivalent (see types.ts header comment) — its
// defaults are this port's own, not transcribed from dc.html.

import { todayYearMonth } from '../utils/date'
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
  initialBalance: 0,
  interestRate: null,
  openedAt: null,
  maturityDate: null,
  isLiquid: true,
}

const todayCursor = todayYearMonth()

export const initialState: AppState = {
  assetTab: 'overview',
  assetCat: null,
  stockTab: '전체',
  stockGroupTab: 'sector',
  ledgerTab: 'overview',
  ledgerPeriod: 'month',
  ledgerView: 'calendar',
  ledgerRange: 'month',
  trendPeriod: 'month',
  mapSort: 'nature',
  dash: null,

  modalOpen: null,
  accountDetail: null,
  reportOpen: false,
  reportSlide: 0,
  accountModalView: 'main',
  withdrawConfirmOpen: false,

  openDropdown: null,
  dd: {},

  quickAddOpen: false,
  notifOpen: false,

  // index.html의 부팅 전 인라인 스크립트와 같은 값을 읽어, 최초 렌더부터 <html> 클래스와
  // AppState가 어긋나지 않게 한다(2단계 참고). 로그인 후에는 useSyncUserTheme이 서버 값으로 덮는다.
  theme: readStoredTheme(),
  amountsHidden: true,

  stockSector: '반도체',
  stockBuyMarket: 'domestic',
  stockTradeMode: 'buy',

  editAccount: null,
  accountForm: BLANK_ACCOUNT_FORM,
  institutionForm: null,
  addingCatGroup: null,
  addAccountReturnTo: null,
  addGoalReturnTo: null,

  recurringType: 'fixed',
  recurSubcategoryId: null,
  recurAccountId: null,
  recurFreq: 'monthly',
  recurPayDay: '25일',
  recurYearMonth: '1월',
  recurYearDay: '1일',
  recurName: '',
  recurAmount: 0,
  editingRecurId: null,

  entryType: 'income',
  rowMenuOpen: null,
  editingTxId: null,
  catDetailCategoryId: null,
  entryTabsVisible: false,
  entrySubcategoryId: null,
  entryAccountId: null,
  entryWithdrawAccountId: null,
  entryAmount: 0,
  entryDescription: '',
  entryPreserved: null,
  ledgerPage: 1,
  entryDateOverride: null,
  ledgerYear: todayCursor.year,
  ledgerMonth: todayCursor.month,

  expenseCatSel: '식비',
  incomeTypeSel: '급여',
  savingAcctSel: '신한은행 정기예금',

  dpPicked: {},
  dpNav: {},

  authScreen: 'login',
  authStep: 'form',
  authEmail: '',
  authName: '',
  authCode: '',
  authKeepLogin: false,
  authAgreements: { service: false, privacy: false, marketing: false },
  authCodeSentAt: null,
}
