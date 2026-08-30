// Source: secret/Asset Manager v14.dc.html L3480-3522 — default values transcribed verbatim.
// The `// auth` block at the bottom has no source equivalent (see types.ts header comment) — its
// defaults are this port's own, not transcribed from dc.html.

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
  assetCat: null,
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
  dd: {},

  quickAddOpen: false,
  notifOpen: false,

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
  addingCatGroup: null,
  addAccountReturnTo: null,
  addGoalReturnTo: null,

  connectView: 'none',
  connectProvider: null,

  recurringType: 'fixed',
  recurSubcategoryId: null,
  recurAccountId: null,
  recurPayDay: '25일',
  recurName: '',
  recurAmount: 0,
  editingRecurId: null,

  entryType: 'income',
  editingTxId: null,
  catDetailCategoryId: null,
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

  dpPicked: {},
  dpNav: {},

  authScreen: 'login',
  authStep: 'form',
  authEmail: '',
  authName: '',
  authCode: '',
  // 답변서 D-4: rememberMe 생략 시 서버 기본값이 true이고 원본 프로토타입도 기본 체크였다.
  // 기본 해제는 서버 기본값과의 불일치였으므로 기본 체크로 되돌린다.
  authKeepLogin: true,
  authAgreements: { service: false, privacy: false, marketing: false },
  authCodeSentAt: null,
}
