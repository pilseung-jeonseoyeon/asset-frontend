import type { AccountType, Currency } from '../common.type'

// 백엔드 계약 변경(2026-09-26, 라이브 OpenAPI AccountRes 대조): 잔액이 통화별 목록 `balances`로
// 바뀌었다. 예전의 cashKrw·cashUsd·cashUsdKrw·usdKrwRate·initialBalanceKrw·initialBalanceUsd·
// totalPrincipalKrw·currency는 **모두 사라졌다** — 되살리지 말 것. 계좌 표시 통화(currency) 개념 자체가
// 없어졌고, 한 계좌가 원화·달러 예수금을 함께 가지는지는 balances에 달러 줄이 있는지로 안다.
//
// balanceKrw는 저장값이 아니라 매 요청 원장에서 재계산된 값이다 — 프론트에서 다시 계산하지 말 것.
// 원화 줄은 초기 잔액 조정 거래(ADJUSTMENT)를 포함한 가계부 거래 합산이고, 달러 줄은 조회 시점
// 환율로 환산되므로 환율이 움직이면 amountKrw와 balanceKrw도 함께 움직인다.

/** 통화별 잔액 한 줄. 원화 줄은 환율이 없고 amount와 amountKrw가 같다. */
export interface AccountBalanceResponse {
  currency: Currency
  /** 그 통화 기준 잔액 — KRW는 정수, USD는 소수 둘째 자리까지 */
  amount: number
  /** 원화 환산액(원). 서버가 환산해 준 값이므로 프론트가 amount × exchangeRate를 다시 계산하지
   * 않는다(이중 환산·반올림 어긋남 방지). */
  amountKrw: number
  /** 환산에 쓴 환율(원/통화) — 원화 줄은 null. 표기용(“1달러 = N원 기준”)이다. */
  exchangeRate: number | null
}

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionId: number | null
  institutionName: string | null
  /** 통화별 잔액 — 원화 줄이 항상 먼저 오고, 달러 예수금이 있으면 달러 줄이 뒤에 온다. */
  balances: AccountBalanceResponse[]
  /** 잔액 총액(원) = balances의 amountKrw 합계. 보유 종목 평가액은 포함하지 않는다. */
  balanceKrw: number
  /** 연 이율(%) — 해당 없으면 null */
  interestRate: number | null
  /** 개설일/취득일 — 'YYYY-MM-DD' 또는 null */
  openedAt: string | null
  isLiquid: boolean
  /** 'YYYY-MM-DD' 또는 null */
  maturityDate: string | null
  sortOrder: number
  /** 해지 시각 — 활성 계좌는 null */
  closedAt: string | null
}

/**
 * GET /accounts/{accountId} 전용 응답. 계좌 정보와 예수금은 `account` 안에 들어가고,
 * 보유 종목까지 얹은 계좌 평가액이 바깥에 붙는다 — **이 엔드포인트만** 이 모양이다.
 *
 * `totalValueKrw = account.balanceKrw + holdingValueKrw`이고, 자산 구성·유동성 화면이 쓰는 계좌
 * 평가액과 같은 기준이다. 계좌 상세 화면의 대표 금액("총 평가액")은 balanceKrw가 아니라 이 값이다 —
 * balanceKrw는 예수금만이라 주식 계좌에서는 보유 종목만큼 실제보다 작게 보인다.
 *
 * 보유 종목 목록 자체는 여기 없고 GET /stocks/holdings?accountId=로 따로 조회한다.
 */
export interface AccountDetailResponse {
  account: AccountResponse
  /** 보유 종목 평가액(원) — 예·적금처럼 보유 종목이 없는 계좌는 0 */
  holdingValueKrw: number
  /** 계좌 총 평가액(원) = 예수금(account.balanceKrw) + 보유 종목 평가액 */
  totalValueKrw: number
}

/**
 * 계좌 등록과 함께 넣는 보유 종목 한 건. 서버는 이걸 **등록일(KST) 체결 BUY 매매 한 건**으로 기록하며
 * 수수료·증권거래세는 0으로 남는다 — 그래서 등록 직후 매매 내역과 보유 종목 조회에 그대로 나타난다.
 * 같은 종목을 두 줄로 보내도 막지 않는다(보유 수량·평단가는 매매 이력에서 합산된다).
 */
export interface CreateAccountHoldingRequest {
  /** GET /stocks로 찾은 종목 id. 마스터에 없는 id면 404 STOCK_NOT_FOUND. */
  stockId: number
  /** 보유 수량 — 0 초과(0은 400). 소수 허용. */
  quantity: number
  /** 평단가 — **원화가 아니라 종목 표시 통화 기준**이다. 해외 종목(USD)은 달러로, 국내와 CRYPTO는
   * 원화로 보낸다(CRYPTO 종목은 KRW로 등록하는 것이 전제). 0 이상. */
  price: number
}

/** 통화별 초기 잔액. 같은 통화는 한 번만 보낸다. */
export interface InitialBalanceRequest {
  currency: Currency
  /** 그 통화 기준 금액 — KRW는 정수(소수면 400 INITIAL_BALANCE_KRW_NOT_INTEGER), USD는 소수 둘째 자리까지 */
  amount: number
}

export interface CreateAccountRequest {
  institutionId?: number
  /** 1~100자 */
  name: string
  type: AccountType
  /**
   * 통화별 초기 잔액. KRW 줄은 initialBalanceDate(생략 시 등록일) 날짜의 초기 잔액 조정 거래
   * (ADJUSTMENT)로 남고 — 가계부 목록·수지 집계에서는 빠지고 잔액·총자산에만 반영된다 — USD 줄은
   * 계좌의 달러 예수금이 된다. 같은 통화를 두 번 보내면 400 INITIAL_BALANCE_CURRENCY_DUPLICATE,
   * **주식·가상자산이 아닌 계좌가 두 통화를 보내면 400 INITIAL_BALANCE_SINGLE_CURRENCY_ONLY**다.
   * 생략하거나 금액이 0이면 거래를 만들지 않는다.
   */
  initialBalances?: InitialBalanceRequest[]
  /** 원화 초기 잔액의 기준일('YYYY-MM-DD') — 초기 잔액 조정 거래의 거래일이 된다. 생략하면 등록일. */
  initialBalanceDate?: string
  interestRate?: number
  openedAt?: string
  maturityDate?: string
  isLiquid: boolean
  sortOrder?: number
  /** 등록과 함께 넣을 보유 종목(최대 100건). **주식(STOCK)과 가상자산(CRYPTO) 계좌만 보낼 수 있고,
   * 그 외 유형에 보내면 400 INVALID_ACCOUNT_TYPE이며 계좌도 만들어지지 않는다.** 주식 계좌 하나에
   * 국내(KR)·해외(US) 종목을 섞어 담을 수 있다 — price가 종목 표시 통화 기준이라 줄마다 단위가
   * 다를 수 있다. 생략하면 보유 없이 계좌만 등록한다. */
  holdings?: CreateAccountHoldingRequest[]
}

/** PATCH — 보내지 않은 필드는 유지, null로 보내면 지운다(institutionId는 null이면 기관 연결 해제).
 * 초기 잔액은 수정 대상이 아니다(잔액은 PATCH .../balance로 정정한다). */
export interface UpdateAccountRequest {
  institutionId?: number | null
  name?: string
  type?: AccountType
  interestRate?: number | null
  openedAt?: string | null
  maturityDate?: string | null
  isLiquid?: boolean
  sortOrder?: number
}

/**
 * PATCH /accounts/{accountId}/balance. 잔액은 파생값이라 직접 덮어쓰지 않고, 서버가 현재 잔액과의
 * 차액만큼 ADJUSTMENT(잔액 조정) 거래를 자동 생성해 맞춘다. 이미 그 금액이면 거래를 만들지 않고
 * 그대로 응답한다(멱등) — OpenAPI(AdjustBalanceReq) 확인.
 *
 * **이 조정 거래는 사용자에게 보이지 않는다**: "가계부 거래 목록·수지 집계에서 빠지지만 총자산에는
 * 반영된다"(라이브 OpenAPI). 즉 정정 후 달라지는 것은 계좌 잔액과 총자산뿐이고 가계부 내역에는
 * 아무것도 생기지 않는다 — 화면 문구에서 '가계부에 기록된다'고 말하면 안 된다.
 *
 * **통화별로 정정한다**(2026-09-26 계약 변경): 필드 이름은 `balance`(예전 `balanceKrw`는 400 INVALID_INPUT)이고
 * `currency`로 어느 통화 줄을 고칠지 고른다(생략하면 KRW). KRW는 정수만(소수면 400
 * BALANCE_ADJUSTMENT_KRW_NOT_INTEGER), USD는 소수 2자리까지이며 주식·가상자산 계좌에만 보낼 수 있다(그 외는
 * 400 FOREIGN_CASH_ACCOUNT_NOT_ALLOWED). 지금 화면(EditAccountModal)은 원화 줄만 정정하고, 달러 예수금이
 * 있는 계좌는 예전 계약(달러 계좌 정정 불가) 그대로 읽기 전용으로 둔다 — 달러 줄 정정 UI는 아직 없다.
 */
export interface AdjustBalanceRequest {
  /** 정정 후 그 통화의 현재 잔액. 0 이상 — KRW는 원 단위 정수, USD는 소수 2자리까지. */
  balance: number
  /** 정정할 통화. 생략하면 KRW. USD는 주식·가상자산 계좌만. */
  currency?: Currency
  /** 조정 거래에 남길 내용. 생략하면 서버가 '잔액 정정'으로 채운다. 최대 200자. */
  description?: string
}

