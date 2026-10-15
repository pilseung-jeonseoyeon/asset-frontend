import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { CategoryKind, Page, ShareSearchParams, SharedTransactionSearchParams } from '../common.type'
// 타입 전용·share → 다른 도메인 한 방향 import(share.type.ts 상단 주석).
import type { CategoryResponse } from '../category'
import type { TransactionResponse } from '../transaction'
import type {
  CreateShareRequest,
  CreateSharedTransactionRequest,
  SharedAccountResponse,
  ShareResponse,
  UpdateShareRequest,
  UpdateSharedTransactionRequest,
} from './share.type'

/** 내가 보낸(OWNER, 기본) / 받은(MEMBER) 공유 목록. 계좌당 최대 10명이라 페이징이 없다. */
export async function getShares(params: ShareSearchParams = {}) {
  return unwrap(await api.get<ApiResponse<ShareResponse[]>>('/shares', { params }))
}

/** 이메일로 초대. PENDING 행이 생기고 상대에게 SHARE_INVITED 알림이 간다(메일은 보내지 않는다). */
export async function postShare(body: CreateShareRequest) {
  return unwrap(await api.post<ApiResponse<ShareResponse>>('/shares', body))
}

/** 멤버의 수락·거절(status) 또는 소유자의 역할 변경(role) — 둘 중 하나만. */
export async function patchShare(shareId: number, body: UpdateShareRequest) {
  return unwrap(await api.patch<ApiResponse<ShareResponse>>(`/shares/${shareId}`, body))
}

/** 소유자의 초대 취소·해제 / 멤버의 나가기. 행은 지우지 않고 REVOKED로 남는다(204). */
export async function deleteShare(shareId: number) {
  await api.delete(`/shares/${shareId}`)
}

/** 내가 수락한 공유 중 해지되지 않은 계좌를 잔액·평가액과 함께. */
export async function getSharedAccounts() {
  return unwrap(await api.get<ApiResponse<SharedAccountResponse[]>>('/shares/accounts'))
}

/**
 * 공유받은 계좌의 가계부 거래. 정산월(year·month)은 받지 않고 거래일 구간·유형·검색어만 받는다.
 * 정렬은 가계부 목록과 같은 규칙으로 서버가 정한다(transaction.service.ts의 DEFAULT_TRANSACTION_SORT와 같은 이유로
 * 2차 키까지 못 박는다).
 */
export async function getSharedAccountTransactions(accountId: number, params: SharedTransactionSearchParams = {}) {
  return unwrap(
    await api.get<ApiResponse<Page<TransactionResponse>>>(`/shares/accounts/${accountId}/transactions`, {
      params: { sort: ['transactionDate,desc', 'id,desc'], ...params },
    }),
  )
}

/** 공유 계좌 소유자의 분류(대분류 + 소유자 소분류). EDITOR 입력 폼용이지만 역할은 묻지 않는다. */
export async function getSharedAccountCategories(accountId: number, kind?: CategoryKind) {
  return unwrap(
    await api.get<ApiResponse<CategoryResponse[]>>(`/shares/accounts/${accountId}/categories`, { params: { kind } }),
  )
}

/** EDITOR의 수입·지출 등록. 소유자의 가계부 거래로 저장되고 작성자(createdBy)만 나로 남는다. */
export async function postSharedTransaction(accountId: number, body: CreateSharedTransactionRequest) {
  return unwrap(
    await api.post<ApiResponse<TransactionResponse>>(`/shares/accounts/${accountId}/transactions`, body),
  )
}

/** 내가 기록한 거래만 전체 교체. 다른 사람 거래는 403 TRANSACTION_NOT_AUTHOR. */
export async function putSharedTransaction(accountId: number, transactionId: number, body: UpdateSharedTransactionRequest) {
  return unwrap(
    await api.put<ApiResponse<TransactionResponse>>(`/shares/accounts/${accountId}/transactions/${transactionId}`, body),
  )
}

/** 내가 기록한 거래 삭제(204). */
export async function deleteSharedTransaction(accountId: number, transactionId: number) {
  await api.delete(`/shares/accounts/${accountId}/transactions/${transactionId}`)
}
