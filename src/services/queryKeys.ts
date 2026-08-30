import type {
  AccountListParams,
  AccountType,
  CategoryKind,
  Currency,
  DateRange,
  ExchangeSearchParams,
  Market,
  PeriodUnit,
  RecurringExpenseKind,
  TradeSearchParams,
  TransactionSearchParams,
  YearMonth,
} from './common.type'

// React Query 키 중앙 레지스트리.
//
// 도메인별 팩토리로 쪼개지 않고 한 파일에 모은 이유: 이 백엔드는 잔액·평단·손익을 매 요청마다
// 원장(스냅샷·거래·매매·환전)에서 재계산한다. 그래서 거래 1건 등록이 transaction·account·asset·
// dashboard·goal을 동시에 무효화한다. 도메인별로 나누면 mutation 훅마다 4~5개 도메인을
// cross-import해야 하고 순환 import 위험이 생긴다. 이 파일은 값만 export하는 순수 모듈이라
// 어느 방향으로도 의존하지 않는다.
//
// 규칙
//  1) 배열 첫 요소 = 도메인 이름(src/services 폴더명과 동일)
//  2) 파라미터는 반드시 "마지막 하나의 객체"로 — prefix 부분 무효화(qk.account.all())를 유지하기 위함
//  3) 정산월에 의존하는 쿼리는 { year, month }를 키에 반드시 포함(monthStartDay가 바뀌면 값이 달라짐)
//  4) 화면 컴포넌트는 이 파일을 직접 import하지 않는다 — 훅 안에 캡슐화한다

export const qk = {
  user: {
    all: () => ['user'] as const,
    me: () => ['user', 'me'] as const,
    settings: () => ['user', 'settings'] as const,
  },
  institution: {
    all: () => ['institution'] as const,
    list: () => ['institution', 'list'] as const,
  },
  account: {
    all: () => ['account'] as const,
    list: (params: AccountListParams = {}) => ['account', 'list', params] as const,
    detail: (accountId: number) => ['account', 'detail', accountId] as const,
  },
  asset: {
    all: () => ['asset'] as const,
    distribution: (groupBy: 'CLASS' | 'INSTITUTION') =>
      ['asset', 'distribution', { groupBy }] as const,
    liquidity: () => ['asset', 'liquidity'] as const,
  },
  category: {
    all: () => ['category'] as const,
    list: (kind?: CategoryKind) => ['category', 'list', { kind }] as const,
  },
  transaction: {
    all: () => ['transaction'] as const,
    list: (params: TransactionSearchParams) => ['transaction', 'list', params] as const,
    dailySummary: (period: YearMonth) => ['transaction', 'dailySummary', period] as const,
    monthlySummary: (year: number) => ['transaction', 'monthlySummary', { year }] as const,
    periodSummary: (period: PeriodUnit) => ['transaction', 'periodSummary', { period }] as const,
    rankings: (period: Partial<YearMonth>) => ['transaction', 'rankings', period] as const,
    categoryDetail: (categoryId: number, period: Partial<YearMonth>) =>
      ['transaction', 'categoryDetail', categoryId, period] as const,
  },
  subscription: {
    all: () => ['subscription'] as const,
    list: (kind?: RecurringExpenseKind) => ['subscription', 'list', { kind }] as const,
  },
  stock: {
    all: () => ['stock'] as const,
    search: (keyword: string) => ['stock', 'search', { keyword }] as const,
    holdings: (market?: Market) => ['stock', 'holdings', { market }] as const,
    holdingGroups: (by: 'sector' | 'market') => ['stock', 'holdingGroups', { by }] as const,
    closedHoldings: (market?: Market) => ['stock', 'closedHoldings', { market }] as const,
  },
  trade: {
    all: () => ['trade'] as const,
    list: (params: TradeSearchParams = {}) => ['trade', 'list', params] as const,
  },
  exchange: {
    all: () => ['exchange'] as const,
    list: (params: ExchangeSearchParams = {}) => ['exchange', 'list', params] as const,
    summary: (currency: Currency) => ['exchange', 'summary', { currency }] as const,
  },
  marketIndex: {
    all: () => ['marketIndex'] as const,
    list: () => ['marketIndex', 'list'] as const,
  },
  goal: {
    all: () => ['goal'] as const,
    detail: (period: Partial<YearMonth>) => ['goal', 'detail', period] as const,
  },
  dashboard: {
    all: () => ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
    trend: (range: DateRange, unit: 'DAY' | 'MONTH', type?: AccountType) =>
      ['dashboard', 'trend', { ...range, unit, type }] as const,
    allocation: () => ['dashboard', 'allocation'] as const,
  },
  notification: {
    all: () => ['notification'] as const,
    list: (unreadOnly?: boolean) => ['notification', 'list', { unreadOnly }] as const,
  },
  connection: {
    all: () => ['connection'] as const,
    list: () => ['connection', 'list'] as const,
  },
} as const
