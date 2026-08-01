// Source: secret/Asset Manager v14.dc.html L3480-3522 (state = {...}) — field set mirrored 1:1.
// Auth-only fields (authed, authScreen, pwVisible, keepLogin, resetSent, agree) are excluded — the auth
// flow (L454-700) is out of scope for this port; the app always starts authenticated. `dash` (L4416-4418)
// is used by the source but never declared in the initial state object, so it starts as `null` here rather
// than an invented default.

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

export interface CustomCatGroup {
  major: string
  subs: string[]
}

export type CustomCats = Record<string, CustomCatGroup[]>

export interface AppState {
  // navigation
  screen: Screen
  assetTab: AssetTab
  assetCat: string | null
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
  accountDetail: unknown | null // shape confirmed during Phase 10 (계좌상세 드릴다운)
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

  // profile
  profileName: string

  // theme
  theme: 'light' | 'dark' | 'system'
  amountsHidden: boolean

  // stock entry
  stockSector: string
  stockBuyMarket: string
  stockTradeMode: string // initial 'buy'

  // asset/account editing
  editAccount: unknown | null
  addingCatGroup: string | null
  addAccountReturnTo: string | null
  addGoalReturnTo: string | null

  // recurring expense
  recurringType: RecurringType
  recurCatMajorIdx: number
  recurCatSubIdx: number
  recurFreq: string // initial 'monthly'
  recurPayDay: string
  recurYearMonth: string
  recurYearDay: string
  editingRecurId: string | null
  fixedExpenseEnded: boolean
  endedSubIds: string[]

  // ledger entry / rows
  entryType: EntryType
  rowMenuOpen: string | null
  editingTx: boolean
  editingTxKey: string | null
  deletedTxKeys: string[]
  catDetailName: string | null
  entryTabsVisible: boolean
  entryCatMajorIdx: number
  entryCatSubIdx: number
  ledgerPage: number
  entryDateOverride: string | null
  monthStartDay: string

  // selection defaults for entry form
  assetTypeSel: string
  liquiditySel: string
  expenseCatSel: string
  incomeTypeSel: string
  savingAcctSel: string

  // date-picker widget state
  dpPicked: Record<string, unknown>
  dpNav: Record<string, unknown>

  // category customization (가계부 설정)
  customCats: CustomCats
}
