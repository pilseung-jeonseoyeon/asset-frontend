// 여러 도메인이 함께 쓰는 enum·파라미터 타입. 도메인 폴더끼리 서로 import하지 않도록 여기에 모은다.
// 값은 전부 서버가 쓰는 영문 대문자 코드값이며, 한글 라벨은 화면 레이어(src/data/*View.ts)에서 붙인다.
// tsconfig의 erasableSyntaxOnly 때문에 TS enum 대신 union 타입 + as const 배열을 쓴다.

export type Currency = 'KRW' | 'USD'

export type PeriodUnit = 'DAY' | 'MONTH' | 'YEAR'

/**
 * 계좌 유형. 2026-08-20 백엔드 계약 변경으로 10종(CHECKING/PARKING/TERM_DEPOSIT/INSTALLMENT_SAVINGS/
 * BROKERAGE/CRYPTO_WALLET/PENSION/PENSION_SAVINGS/CASH/REAL_ASSET)에서 6종으로 통합됐다 — 이제
 * AssetClass와 1:1로 대응한다(이름만 CASH↔CASH, ETC↔PENSION_ETC로 다르다). 없어진 값을 보내면
 * 400이 아니라 500이 나므로 이 목록 밖의 값을 만들지 말 것.
 */
export type AccountType =
  | 'CASH'
  | 'DEPOSIT'
  | 'DOMESTIC_STOCK'
  | 'FOREIGN_STOCK'
  | 'CRYPTO'
  | 'PENSION_ETC'

export type InstitutionType =
  | 'BANK'
  | 'SAVINGS_BANK'
  | 'BROKERAGE'
  | 'EXCHANGE'
  | 'PENSION'
  | 'CARD'
  | 'LIFE_INSURANCE'
  | 'NON_LIFE_INSURANCE'
  | 'FINTECH'
  | 'OTHER'

/** 자산군 6분류. 2026-08-20 백엔드 계약 변경으로 CASH_PENSION → CASH로 이름이 바뀌었다. */
export type AssetClass =
  | 'DOMESTIC_STOCK'
  | 'FOREIGN_STOCK'
  | 'DEPOSIT'
  | 'CRYPTO'
  | 'CASH'
  | 'ETC'

/**
 * 거래 유형. ADJUSTMENT(잔액 조정)는 계좌 잔액을 정정할 때 **서버가 자동으로 만드는** 거래라
 * 응답에만 나온다 — 사용자가 직접 만들 수 없으므로 요청에는 EditableTransactionType을 쓴다.
 */
export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING' | 'TRANSFER' | 'ADJUSTMENT'

/** 사용자가 직접 만들거나 검색 조건으로 쓸 수 있는 거래 유형(ADJUSTMENT 제외). */
export type EditableTransactionType = Exclude<TransactionType, 'ADJUSTMENT'>

export type CategoryKind = 'INCOME' | 'SAVING' | 'EXPENSE'

export type RecurringExpenseKind = 'FIXED' | 'SUBSCRIPTION'

export type Market = 'KR' | 'US' | 'CRYPTO'

export type TradeSide = 'BUY' | 'SELL'

export type ForeignExchangeSide = 'BUY' | 'SELL'

export type SnapshotSource = 'AUTO' | 'MANUAL'

export type ThemeType = 'LIGHT' | 'DARK' | 'SYSTEM'

/** 정산월 지정. monthStartDay(사용자 설정) 기준이라 달력 1일과 다를 수 있다. */
export interface YearMonth {
  year: number
  month: number
}

/** from/to 모두 'YYYY-MM-DD' (ISO LocalDate). */
export interface DateRange {
  from: string
  to: string
}

// --- 목록 조회 파라미터 ---------------------------------------------------
// queryKeys.ts와 각 도메인 서비스가 함께 쓰므로 여기에 둔다(순환 import 방지).

export interface AccountListParams {
  type?: AccountType
  institutionId?: number
}

export interface TransactionSearchParams {
  year?: number
  month?: number
  from?: string
  to?: string
  type?: EditableTransactionType
  subcategoryId?: number
  accountId?: number
  /** 서버는 0-base. 화면의 1-base 페이지는 훅에서 변환한다. */
  page?: number
  size?: number
  /**
   * `'필드명,asc|desc'` 형태를 여러 개 넘길 수 있다(반복 파라미터로 직렬화됨).
   * 엔티티 필드명만 쓸 수 있고, 없는 필드를 보내면 400이 아니라 500이 난다(API-SPEC §6.1).
   */
  sort?: string[]
}

export interface TradeSearchParams {
  accountId?: number
  stockId?: number
  from?: string
  to?: string
  /** 서버는 0-base. 생략하면 페이지를 나누지 않고 전 건을 한 페이지로 반환한다(최대 200). */
  page?: number
  size?: number
  /** `'필드명,asc|desc'`. tradeDate·quantity·price·fee·tax·id·createdAt만 허용, 생략하면 체결일 최신순. */
  sort?: string[]
}

export interface ExchangeSearchParams {
  /** 생략하면 전 통화를 함께 조회한다. */
  currency?: Currency
  from?: string
  to?: string
  /** 서버는 0-base. 생략하면 페이지를 나누지 않고 전 건을 한 페이지로 반환한다(최대 200). */
  page?: number
  size?: number
  /** `'필드명,asc|desc'`. exchangedAt·foreignAmount·krwAmount·rate·id·createdAt만 허용, 생략하면 환전일 최신순. */
  sort?: string[]
}

/**
 * Spring Data Page 직렬화 형태. 이 백엔드에서 페이지네이션이 있는 API는
 * GET /transactions 하나뿐이다(나머지 목록은 배열 전체 반환).
 */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  numberOfElements: number
  first: boolean
  last: boolean
  empty: boolean
}
