import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountListParams, DateRange } from '../common.type'
import type {
  AccountResponse,
  AccountSnapshotResponse,
  AdjustBalanceRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
  UpsertSnapshotRequest,
} from './account.type'

export async function getAccounts(params: AccountListParams = {}) {
  return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
}

export async function getAccount(accountId: number) {
  return unwrap(await api.get<ApiResponse<AccountResponse>>(`/accounts/${accountId}`))
}

export async function postAccount(body: CreateAccountRequest) {
  return unwrap(await api.post<ApiResponse<AccountResponse>>('/accounts', body))
}

export async function patchAccount(accountId: number, body: UpdateAccountRequest) {
  return unwrap(await api.patch<ApiResponse<AccountResponse>>(`/accounts/${accountId}`, body))
}

/** 204 No Content. 소프트 삭제(해지)로 추정 — 이미 해지된 계좌면 409 ACCOUNT_ALREADY_CLOSED. */
export async function deleteAccount(accountId: number) {
  await api.delete(`/accounts/${accountId}`)
}

/** 잔액 정정 — 차액만큼 ADJUSTMENT 거래가 원장에 자동 생성된다(account.type.ts 참고). */
export async function patchAccountBalance(accountId: number, body: AdjustBalanceRequest) {
  return unwrap(await api.patch<ApiResponse<AccountResponse>>(`/accounts/${accountId}/balance`, body))
}

/** from/to 모두 필수. */
export async function getAccountSnapshots(accountId: number, range: DateRange) {
  return unwrap(
    await api.get<ApiResponse<AccountSnapshotResponse[]>>(`/accounts/${accountId}/snapshots`, {
      params: range,
    }),
  )
}

/**
 * upsert. 주의: AUTO로 적재된 스냅샷도 덮어쓰며 source가 MANUAL로 바뀐다.
 * 덮어쓰기 전에 사용자 확인을 받는 UX가 필요하다.
 */
export async function putAccountSnapshot(
  accountId: number,
  snapshotDate: string,
  body: UpsertSnapshotRequest,
) {
  return unwrap(
    await api.put<ApiResponse<AccountSnapshotResponse>>(
      `/accounts/${accountId}/snapshots/${snapshotDate}`,
      body,
    ),
  )
}

/** 204 No Content. MANUAL 스냅샷만 삭제 가능 — AUTO면 409 SNAPSHOT_NOT_MANUAL. */
export async function deleteAccountSnapshot(accountId: number, snapshotDate: string) {
  await api.delete(`/accounts/${accountId}/snapshots/${snapshotDate}`)
}
