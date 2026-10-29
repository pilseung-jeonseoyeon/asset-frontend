// 가족·커플 공유(v17). 계약 정본은 supabase/migrations/20261024000007_app_api.sql 6부, 설계는
// docs/superpowers/specs/2026-10-25-household-share-v17-design.md.
//
// 원리: 두 사람이 초대 코드로 한 번 연결(1:1)하고, 각자 고른 현금·예적금 계좌를 상단 '개인 | {공유 화면 이름}'의
// 두 번째 탭('우리집')에서 합쳐 본다. 공유 중인 계좌는 '개인' 합계에서 빠진다(서버가 계산 — 프론트에서 빼지 말 것).
// 상대 계좌는 보기만 한다. 화면 범위는 common.type의 ViewScope, 정하는 곳은 utils/viewScope.ts.

/** NONE 연결 없음 · PENDING 내 초대 코드가 살아 있음 · LINKED 연결 중 */
export type ShareLinkStatus = 'NONE' | 'PENDING' | 'LINKED'

export interface ShareInvite {
  /** 6자리, 헷갈리는 글자(0·O·1·I) 없음 */
  code: string
  /** ISO-8601. 발급 후 10분 */
  expiresAt: string
}

export interface SharePartner {
  /** Supabase Auth 사용자 id(uuid) */
  userId: string
  name: string
}

export interface MySharedAccount {
  accountId: number
  /** true면 공유 전 거래도 상대에게 보인다 */
  includeHistory: boolean
  /** ISO-8601 */
  sharedAt: string
}

export interface ShareStatusResponse {
  status: ShareLinkStatus
  /** PENDING일 때만 */
  invite: ShareInvite | null
  /** LINKED일 때만 */
  partner: SharePartner | null
  linkedAt: string | null
  /** 내 화면에서만 쓰는 공유 화면 이름(서버 설정, 비면 '우리집') */
  spaceName: string
  /** 내가 공유 중인 계좌(이름·잔액은 GET /accounts?scope=SHARED) */
  myAccounts: MySharedAccount[]
  partnerAccountCount: number
}

export interface ShareCodeCheckResponse {
  inviterName: string
  expiresAt: string
}

/** 공유할 계좌 저장 요청의 한 줄 — 목록 전체를 보낸다(빠진 계좌는 공유 해제) */
export interface SharedAccountRequest {
  accountId: number
  includeHistory: boolean
}
