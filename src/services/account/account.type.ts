import type { AccountType, Currency, SnapshotSource } from '../common.type'

// balanceKrw·initialBalanceKrw는 원화(KRW) 정수다. balanceKrw는 저장값이 아니라 매 요청
// 원장(스냅샷·매매·환전)에서 재계산된 값이다 — 프론트에서 다시 계산하지 말 것.
//
// 2026-08-20 백엔드 계약 변경(OpenAPI AccountRes 확인): 한 계좌가 원화 예수금(initialBalanceKrw)과
// 외화 예수금(initialBalanceNative)을 동시에 가질 수 있다. 둘 다 등록 시점에 사용자가 입력한 원금
// 그대로이며 서버가 환율로 유도하지 않는다(구 계약의 principalKrw/principalNative는 존재하지 않는다 —
// 특히 옛 principalKrw처럼 "외화 원금을 취득 시점 환율로 환산해 고정한 값"이라는 필드는 없다).
// balanceKrw는 원화 예수금 + 외화 예수금의 조회 시점 환율 환산액 + 원장 증감이라, 환율이 움직이면
// 함께 움직인다. initialBalanceKrw는 그중 원화 예수금 원금만을 뜻하므로, 외화 계좌에서
// balanceKrw - initialBalanceKrw를 "환차익"으로 계산하면 안 된다(원장 증감과 외화 환산분이 섞여 있다).

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionId: number | null
  institutionName: string | null
  /** 현재 잔액(원) = 원화 예수금 + 외화 예수금의 기준일 환율 환산액 + 원장 증감. 보유 종목 평가액은
   *  포함하지 않는다. KRW 정수(Long). */
  balanceKrw: number
  /** 등록 시점 원화 예수금 원금(원) — '원금 대비 +N%' 배지의 기준값. */
  initialBalanceKrw: number
  /** 등록 시점 외화 예수금 원금(계좌 통화 단위) — 외화 계좌만. 원화 계좌이거나 아직 환전 전이면 null. */
  initialBalanceNative: number | null
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

export interface CreateAccountRequest {
  institutionId?: number
  /** 1~100자 */
  name: string
  type: AccountType
  /** 계좌 표시 통화. */
  currency: Currency
  /** 등록 시점 원화 잔액(원) — KRW 계좌는 원금 전체, 외화 계좌는 아직 환전하지 않은 원화 예수금(둘 다
   *  있을 수 있는 실제 증권사 해외주식 계좌를 반영한 것, 2026-08-20 계약). 0 이상 정수(음수는 400). */
  initialBalanceKrw?: number
  /** 등록 시점 외화 원금(계좌 통화 단위, 소수점 둘째 자리까지) — 외화 계좌 전용. KRW 계좌에 보내면
   *  400. 외화 계좌는 initialBalanceKrw와 함께 보낼 수 있다(위 참고) — 둘은 서로 다른 돈이라 합산되지
   *  않는다. */
  initialBalanceNative?: number
  interestRate?: number
  openedAt?: string
  maturityDate?: string
  isLiquid: boolean
  sortOrder?: number
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
