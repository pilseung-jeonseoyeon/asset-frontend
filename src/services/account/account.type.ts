import type { AccountType, Currency, SnapshotSource } from '../common.type'

// API-SPEC §1. 금액은 통화와 무관하게 전부 원화(KRW) 환산 정수다 — USD 계좌도 initialBalanceKrw를
// 등록 시점 원화 환산액으로 저장하며, 계좌 단위의 외화 원금은 보관하지 않는다(외화 표기는
// GET /accounts/{id}/snapshots의 valueNative가 담당). balanceKrw는 저장값이 아니라 매 요청
// 원장(스냅샷·매매·환전)에서 재계산된 값이다 — 프론트에서 다시 계산하지 말 것.

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionId: number | null
  institutionName: string | null
  /** 현재 잔액(원) = 등록 시점 잔액 + 원장 증감. 보유 종목 평가액은 포함하지 않는다. KRW 정수(Long). */
  balanceKrw: number
  /** 등록 시점 잔액(원) — '원금 대비 +N%' 배지의 기준값. */
  principalKrw: number
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
  currency: Currency
  /** 등록 시점 잔액(원). USD 계좌도 등록 시점 원화 환산액을 보낸다. 0 이상 정수(음수는 400). */
  initialBalanceKrw: number
  interestRate?: number
  openedAt?: string
  maturityDate?: string
  isLiquid: boolean
  sortOrder?: number
}

/** PATCH. currency / initialBalanceKrw / openedAt은 수정 불가라 여기에 없다. */
export interface UpdateAccountRequest {
  institutionId?: number
  name?: string
  type?: AccountType
  interestRate?: number
  maturityDate?: string
  isLiquid?: boolean
  sortOrder?: number
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
