import type { AccountType, Currency, SnapshotSource } from '../common.type'

// balanceKrw·initialBalanceKrw·totalPrincipalKrw는 원화(KRW) 정수다. balanceKrw는 저장값이 아니라 매
// 요청 원장(스냅샷·매매·환전)에서 재계산된 값이다 — 프론트에서 다시 계산하지 말 것.
//
// 2026-08-20 백엔드 계약 변경(OpenAPI AccountRes 확인): 한 계좌가 원화 예수금(initialBalanceKrw)과
// 외화 예수금(initialBalanceUsd)을 동시에 가질 수 있다. 둘 다 등록 시점에 사용자가 입력한 원금
// 그대로이며 서버가 환율로 유도하지 않는다(구 계약의 principalKrw/principalNative는 존재하지 않는다).
// balanceKrw는 원화 예수금 + 외화 예수금의 조회 시점 환율 환산액 + 원장 증감이라, 환율이 움직이면
// 함께 움직인다. initialBalanceKrw는 그중 원화 예수금 원금만을 뜻하므로, 외화 계좌에서
// balanceKrw - initialBalanceKrw를 "환차익"으로 계산하면 안 된다(원장 증감과 외화 환산분이 섞여 있다).
//
// **필드명 주의**: 외화 예수금은 요청·응답 모두 `initialBalanceUsd`다. 한때 프론트가 쓰던
// `initialBalanceNative`라는 이름은 서버 계약에 존재한 적이 없다(2026-08-20 라이브 OpenAPI 대조로
// 확인) — 그 이름으로 보내면 달러 예수금이 조용히 누락된다. '원금 대비 +N%' 배지의 기준값은
// initialBalanceKrw가 아니라 **totalPrincipalKrw**다(외화분까지 같은 시점 환율로 환산해 더한 값).

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionId: number | null
  institutionName: string | null
  /** 현재 잔액(원) = 원화 예수금 + 외화 예수금의 기준일 환율 환산액 + 원장 증감. 보유 종목 평가액은
   *  포함하지 않는다. KRW 정수(Long). */
  balanceKrw: number
  /** 등록 시점 원금의 원화 환산 총액(원) = 원화 예수금 + 외화 예수금의 기준일 환율 환산액.
   *  balanceKrw와 같은 시점 환율을 쓰므로 '원금 대비 +N%' 배지는 이 값을 기준으로 낸다. */
  totalPrincipalKrw: number
  /** 등록 시점 원화 예수금 원금(원) — 원화분만이며, 외화분은 initialBalanceUsd에 따로 있다. */
  initialBalanceKrw: number
  /** 등록 시점 외화 예수금 원금(달러) — 외화 계좌만. 원화 계좌이거나 아직 환전 전이면 null. */
  initialBalanceUsd: number | null
  currency: Currency
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
   *  원화로 보낸다(CRYPTO 종목은 KRW로 등록하는 것이 전제). 0 이상. */
  price: number
}

export interface CreateAccountRequest {
  institutionId?: number
  /** 1~100자 */
  name: string
  type: AccountType
  /** 계좌 표시 통화. */
  currency: Currency
  /** 등록 시점 원화 예수금 원금(원) — KRW 계좌는 원금 전체, 외화 계좌는 아직 환전하지 않은 원화
   *  예수금(둘 다 있을 수 있는 실제 증권사 해외주식 계좌를 반영한 것, 2026-08-20 계약).
   *  생략하면 0. 0 이상 정수(음수는 400 INVALID_INPUT). */
  initialBalanceKrw?: number
  /** 등록 시점 외화 예수금 원금(달러, 소수점 둘째 자리까지) — **외화 계좌 전용**. 원화 계좌가 보내면
   *  400 INITIAL_BALANCE_CURRENCY_MISMATCH. 외화 계좌는 initialBalanceKrw와 함께 보낼 수도, 한쪽만
   *  보낼 수도 있다 — 둘은 서로 다른 돈이라 합산되지 않는다. */
  initialBalanceUsd?: number
  interestRate?: number
  openedAt?: string
  maturityDate?: string
  isLiquid: boolean
  sortOrder?: number
  /** 등록과 함께 넣을 보유 종목(최대 100건). **주식(DOMESTIC_STOCK·FOREIGN_STOCK)과 가상자산(CRYPTO)
   *  계좌만 보낼 수 있고, 그 외 유형에 보내면 400 INVALID_ACCOUNT_TYPE이며 계좌도 만들어지지 않는다.**
   *  생략하면 보유 없이 계좌만 등록한다. */
  holdings?: CreateAccountHoldingRequest[]
}

/** PATCH. currency / 등록 시점 원금 / openedAt은 수정 불가라 여기에 없다. */
export interface UpdateAccountRequest {
  institutionId?: number
  name?: string
  type?: AccountType
  interestRate?: number
  maturityDate?: string
  isLiquid?: boolean
  sortOrder?: number
}

/**
 * PATCH /accounts/{accountId}/balance. 잔액은 파생값이라 직접 덮어쓰지 않고, 서버가 현재 잔액과의
 * 차액만큼 ADJUSTMENT(잔액 조정) 거래를 원장에 자동 생성해 맞춘다(순저축·저축률 집계 제외, 총자산에는
 * 반영). 이미 그 금액이면 거래를 만들지 않고 그대로 응답한다(멱등) — OpenAPI(AdjustBalanceReq) 확인.
 */
export interface AdjustBalanceRequest {
  /** 정정 후 현재 잔액(원). 0 이상 정수 — 통화와 무관하게 항상 원화(UpdateAccountRequest와 동일 규칙). */
  balanceKrw: number
  /** 조정 거래에 남길 내용. 생략하면 서버가 '잔액 정정'으로 채운다. 최대 200자. */
  description?: string
}

export interface AccountSnapshotResponse {
  snapshotDate: string
  valueKrw: number
  valueNative: number | null
  source: SnapshotSource
}

export interface UpsertSnapshotRequest {
  valueKrw: number
  valueNative?: number
}
