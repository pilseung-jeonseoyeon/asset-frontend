// 여러 도메인이 함께 쓰는 enum·파라미터 타입. 도메인 폴더끼리 서로 import하지 않도록 여기에 모은다.
// 값은 전부 서버가 쓰는 영문 대문자 코드값이며, 한글 라벨은 화면 레이어(src/data/*View.ts)에서 붙인다.
// tsconfig의 erasableSyntaxOnly 때문에 TS enum 대신 union 타입 + as const 배열을 쓴다.

export type Currency = 'KRW' | 'USD'

export type PeriodUnit = 'DAY' | 'MONTH' | 'YEAR'

export type AccountType =
  | 'CHECKING'
  | 'PARKING'
  | 'TERM_DEPOSIT'
  | 'INSTALLMENT_SAVINGS'
  | 'BROKERAGE'
  | 'CRYPTO_WALLET'
  | 'PENSION'
  | 'PENSION_SAVINGS'
  | 'CASH'
  | 'REAL_ASSET'

export type InstitutionType = 'BANK' | 'BROKERAGE' | 'EXCHANGE' | 'PENSION' | 'OTHER'

export type AssetClass =
  | 'DOMESTIC_STOCK'
  | 'FOREIGN_STOCK'
  | 'DEPOSIT'
  | 'CRYPTO'
  | 'CASH_PENSION'
  | 'ETC'

export type TransactionType = 'INCOME' | 'EXPENSE' | 'SAVING' | 'TRANSFER'

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
  type?: TransactionType
  subcategoryId?: number
  accountId?: number
  /** 서버는 0-base. 화면의 1-base 페이지는 훅에서 변환한다. */
  page?: number
  size?: number
  sort?: string
}

export interface TradeSearchParams {
  accountId?: number
  stockId?: number
  from?: string
  to?: string
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
