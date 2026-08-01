// Source: secret/Asset Manager v14.dc.html L3480-3522 — default values transcribed verbatim
// (auth-only fields excluded, see types.ts header comment).

import type { AppState } from './types'

export const initialState: AppState = {
  screen: 'dashboard',
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

  profileName: '정다은',

  theme: 'light',
  amountsHidden: true,

  stockSector: '반도체',
  stockBuyMarket: 'domestic',
  stockTradeMode: 'buy',

  editAccount: null,
  addingCatGroup: null,
  addAccountReturnTo: null,
  addGoalReturnTo: null,

  recurringType: 'fixed',
  recurCatMajorIdx: 0,
  recurCatSubIdx: 0,
  recurFreq: 'monthly',
  recurPayDay: '25일',
  recurYearMonth: '1월',
  recurYearDay: '1일',
  editingRecurId: null,
  fixedExpenseEnded: false,
  endedSubIds: [],

  entryType: 'income',
  rowMenuOpen: null,
  editingTx: false,
  editingTxKey: null,
  deletedTxKeys: [],
  catDetailName: null,
  entryTabsVisible: false,
  entryCatMajorIdx: 0,
  entryCatSubIdx: 0,
  ledgerPage: 1,
  entryDateOverride: null,
  monthStartDay: '25일',

  assetTypeSel: '현금',
  liquiditySel: 'liquid',
  expenseCatSel: '식비',
  incomeTypeSel: '급여',
  savingAcctSel: '신한은행 정기예금',

  dpPicked: {},
  dpNav: {},

  customCats: {
    '수입': [
      { major: '월급', subs: ['월급'] },
      { major: '상여/수당', subs: ['상여', '수당'] },
      { major: '부수입', subs: ['유튜브'] },
      { major: '기타', subs: ['투자소득', '은행소득', '용돈'] },
    ],
    '저축': [
      { major: '예적금', subs: ['주택청약', '자유적금'] },
      { major: '투자', subs: ['주식', '펀드'] },
      { major: '연금', subs: ['개인연금', '퇴직연금', '국민연금'] },
      { major: '목적통장', subs: ['여행통장', '비상금통장'] },
    ],
    '지출': [
      { major: '주거', subs: ['관리비', '대출이자'] },
      { major: '보험', subs: ['자동차보험'] },
      { major: '식비', subs: ['식자재', '외식', '간식/카페'] },
      { major: '생활용품', subs: ['소모품', '가전/수리', '홈데코/가구'] },
      { major: '꾸밈비', subs: ['의류/잡화', '미용/헤어'] },
      { major: '교통비', subs: ['차량유지비', '대중교통', '차량기타'] },
      { major: '자기계발', subs: ['교육/학습', '운동/도서'] },
      { major: '여가', subs: ['취미/문화', '여행'] },
      { major: '통신비', subs: ['핸드폰', '인터넷', '구독료'] },
      { major: '건강/의료', subs: ['병원/약국', '건강관리'] },
      { major: '경조사', subs: ['경조사', '선물', '가족'] },
      { major: '기타', subs: ['기타'] },
    ],
  },
}
