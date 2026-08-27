import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountListParams } from '../common.type'
import type {
  AccountResponse,
  AdjustBalanceRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
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

