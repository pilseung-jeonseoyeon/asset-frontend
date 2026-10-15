import type { AccountType, CategoryKind, TransactionType } from '../common.type'
// 도메인 폴더끼리는 import하지 않는 것이 규칙(api-conventions.md)이지만, 서버 응답이 기존 AccountRes·
// TransactionRes·CategoryRes를 **그대로** 품고 있어 타입을 복제하면 계약이 두 벌로 갈린다. 그래서
// `import type`(런타임 의존 없음)으로만, share → 다른 도메인 한 방향으로만 가져온다. 반대 방향은 금지.
import type { AccountResponse } from '../account'

// 계좌 공유(가족·커플이 한 계좌를 함께 본다). 라이브 OpenAPI(2026-10-15, /api/v1/shares) 기준.
//
// 서버 쪽 원리는 "권한 위임" 하나다 — 공유란 소유자의 데이터를 대신 읽고(VIEWER) 소유자 가계부에
// 대신 기록할(EDITOR) 권한이라, 멤버의 요청은 서버가 소유자 userId로 기존 계산을 그대로 돌린다.
// 그래서 공유받은 계좌의 잔액·거래는 소유자가 자기 화면에서 보는 것과 같은 숫자다.
//
// 지켜야 할 계약 몇 가지:
// - 공유받은 계좌는 **내 총자산·대시보드에 더해지지 않는다**(서버가 GET /accounts·분포에 안 넣는다).
//   프론트가 따로 더하지 말 것 — 자산 화면의 "함께 보는 계좌" 구역에만 보인다.
// - 멤버(EDITOR)가 기록한 거래는 **소유자의 가계부 거래**로 저장된다(user_id = 소유자, createdBy = 멤버).
//   내 가계부(GET /transactions)에는 들어오지 않고, 공유 계좌 거래내역에서만 보인다.
// - 공유 계좌에는 **수입·지출만** 적을 수 있고(저축·이체는 400 SHARE_TYPE_NOT_ALLOWED), 소분류는
//   **소유자의 것**(GET /shares/accounts/{id}/categories)을 보내야 한다.
// - 초대는 7일 뒤 만료되고, EXPIRED는 저장값이 아니라 응답 시점에 계산된 값이다.

/** VIEWER 읽기 전용 · EDITOR 수입·지출 기록 가능. 계좌 수정·해지는 어느 역할도 못 한다. */
export type ShareRole = 'VIEWER' | 'EDITOR'

/** PENDING 초대 중 · ACCEPTED 공유 중 · DECLINED 거절 · REVOKED 취소·해제·나가기 · EXPIRED 만료(응답 전용 계산값). */
export type ShareStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED'

/** OWNER 내가 공유한 계좌의 초대·멤버 / MEMBER 내가 받은 초대·공유. */
export type ShareSide = 'OWNER' | 'MEMBER'

export interface ShareOwner {
  userId: number
  name: string
}

export interface ShareMember {
  userId: number
  name: string
  email: string
}

export interface ShareResponse {
  /** 공유 ID — SHARE_INVITED 알림의 linkId가 이 값이다. */
  id: number
  accountId: number
  accountName: string
  accountType: AccountType
  owner: ShareOwner
  member: ShareMember
  role: ShareRole
  /** 만료를 반영한 값 — 만료 시각을 넘긴 PENDING은 EXPIRED로 온다. */
  status: ShareStatus
  /** 초대 만료 시각(ISO-8601, UTC) — PENDING일 때만 의미. */
  expiresAt: string
  acceptedAt: string | null
  /** 거절·종료 시각 — 진행 중이면 null. */
  endedAt: string | null
  /** 초대 시각. */
  createdAt: string
}

/**
 * GET /shares/accounts의 한 줄. `account`는 기존 AccountRes 그대로라 계좌 카드·잔액 뷰모델을
 * 재사용할 수 있고, 보유 종목까지 얹은 평가액은 바깥에 붙는다(GET /accounts/{id}와 같은 모양).
 */
export interface SharedAccountResponse {
  shareId: number
  /** 내 역할 — EDITOR면 수입·지출을 기록할 수 있다. */
  role: ShareRole
  owner: ShareOwner
  account: AccountResponse
  /** 보유 종목 평가액(원) — 예·적금처럼 보유 종목이 없는 계좌는 0 */
  holdingValueKrw: number
  /** 계좌 총 평가액(원) = 예수금 + 보유 종목 평가액 */
  totalValueKrw: number
  acceptedAt: string
}

export interface CreateShareRequest {
  accountId: number
  /** 초대할 가입자 이메일. 미가입·탈퇴 유예 중이면 404 SHARE_INVITEE_NOT_FOUND. */
  email: string
  /** 생략하면 VIEWER. */
  role?: ShareRole
}

/**
 * PATCH /shares/{id} — status와 role 중 **하나만** 보낸다(둘 다 보내거나 둘 다 비우면 400).
 * 멤버는 status로 초대에 답하고, 소유자는 role로 역할을 바꾼다.
 */
export type UpdateShareRequest = { status: Extract<ShareStatus, 'ACCEPTED' | 'DECLINED'> } | { role: ShareRole }

/** 공유 계좌 수입·지출 등록·수정 요청. 계좌는 경로로 고정되고 상대 계좌는 없다. */
export interface CreateSharedTransactionRequest {
  type: Extract<TransactionType, 'INCOME' | 'EXPENSE'>
  /** 계좌 소유자의 소분류 id(GET /shares/accounts/{id}/categories). */
  subcategoryId: number
  /** 양수 정수(원). */
  amount: number
  transactionDate: string
  /** 1~200자 */
  description: string
  memo?: string
}

/** PUT은 전체 교체 — 생략한 memo는 null로 덮어써진다. */
export type UpdateSharedTransactionRequest = CreateSharedTransactionRequest

/** GET /shares/accounts/{id}/categories의 kind 필터. */
export type SharedCategoryKind = CategoryKind
