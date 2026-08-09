import type { AccountType, Currency, SnapshotSource } from '../common.type'

// API-SPEC §1. 목록의 balance는 저장값이 아니라 매 요청 원장(스냅샷·매매·환전)에서 재계산된
// 값이다 — 프론트에서 다시 계산하지 말 것.

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionName: string | null
  /** KRW 정수(Long). 부동소수점으로 다루지 말 것. */
  balance: number
  currency: Currency
  isLiquid: boolean
  /** 'YYYY-MM-DD' 또는 null */
  maturityDate: string | null
}

export interface CreateAccountRequest {
  institutionId?: number
  name: string
  type: AccountType
  currency: Currency
  /** 0 이상 정수 */
  initialBalance: number
  interestRate?: number
  openedAt?: string
  maturityDate?: string
  isLiquid: boolean
  sortOrder?: number
}

/** PATCH. currency / initialBalance / openedAt은 수정 불가라 여기에 없다. */
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
