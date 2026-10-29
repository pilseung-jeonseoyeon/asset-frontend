import { rpc } from '../supabase'
import type { AccountListParams } from '../common.type'
import type {
  AccountDetailResponse,
  AccountResponse,
  AdjustBalanceRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
} from './account.type'

// 계좌 읽기·쓰기는 전부 DB 함수(3·5단계 RPC)다 — 잔액이 거래 원장에서 계산되므로 테이블을 직접 읽지 않는다.

export async function getAccounts(params: AccountListParams = {}) {
  return rpc<AccountResponse[]>('get_accounts', {
    p_type: params.type ?? null,
    p_institution_id: params.institutionId ?? null,
    p_include_closed: false,
    p_scope: params.scope ?? 'ALL',
  })
}

/**
 * 계좌 상세. **이 함수만** 계좌 정보가 `account` 한 겹 안에 들어 있고 보유 종목 평가액이 함께
 * 온다(AccountDetailResponse 주석 참고). 여기서 평평하게 펴지 않고 서버 모양 그대로 돌려준다: 펴 버리면
 * 호출부에서 "예수금(balanceKrw)"과 "총 평가액(totalValueKrw)"이 한 덩어리로 섞여 어느 쪽을 그리는지 알아보기 어려워진다.
 */
export async function getAccount(accountId: number) {
  return rpc<AccountDetailResponse>('get_account_detail', { p_account_id: accountId })
}

/** 계좌 + 초기 잔액(통화별 ADJUSTMENT) + 보유 종목(오늘 BUY)을 한 트랜잭션으로. */
export async function postAccount(body: CreateAccountRequest) {
  return rpc<AccountResponse>('create_account', { p: body })
}

/** 부분 수정 — 보낸 키만 바뀌고, null 은 비운다. */
export async function patchAccount(accountId: number, body: UpdateAccountRequest) {
  return rpc<AccountResponse>('update_account', { p_account_id: accountId, p: body })
}

/** 계좌 해지(비활성). 이미 해지된 계좌면 ACCOUNT_ALREADY_CLOSED, 보유 종목이 남아 있으면 ACCOUNT_HAS_HOLDINGS. */
export async function deleteAccount(accountId: number) {
  await rpc<unknown>('close_account', { p_account_id: accountId })
}

/** 잔액 정정 — 그 통화 현재 예수금과의 차액만큼 ADJUSTMENT 거래가 원장에 자동 생성된다(account.type.ts 참고). */
export async function patchAccountBalance(accountId: number, body: AdjustBalanceRequest) {
  return rpc<AccountResponse>('adjust_account_balance', {
    p_account_id: accountId,
    p_balance: body.balance,
    p_currency: body.currency ?? 'KRW',
    p_description: body.description ?? null,
  })
}
