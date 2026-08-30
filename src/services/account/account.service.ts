import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountListParams } from '../common.type'
import type {
  AccountDetailResponse,
  AccountResponse,
  AdjustBalanceRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
} from './account.type'

export async function getAccounts(params: AccountListParams = {}) {
  return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
}

/**
 * 계좌 상세. **이 엔드포인트만** 계좌 정보가 `account` 한 겹 안에 들어 있고 보유 종목 평가액이 함께
 * 온다(AccountDetailResponse 주석 참고) — 다른 계좌 API처럼 AccountResponse가 바로 오지 않는다.
 * 여기서 평평하게 펴지 않고 서버 모양 그대로 돌려준다: 펴 버리면 호출부에서 "예수금(balanceKrw)"과
 * "총 평가액(totalValueKrw)"이 한 덩어리로 섞여 어느 쪽을 그리는지 알아보기 어려워진다.
 */
export async function getAccount(accountId: number) {
  return unwrap(await api.get<ApiResponse<AccountDetailResponse>>(`/accounts/${accountId}`))
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

