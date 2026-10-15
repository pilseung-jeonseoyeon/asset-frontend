// 계좌 공유(가족·커플 함께 보기)의 화면 표기 규칙.
//
// 계좌 상세의 '함께 보기' 칸, '함께 보는 사람' 관리 모달, 공유받은 계좌 상세, 알림 카드, 설정의
// 가족·커플 공유 카드가 함께 쓰므로 어느 한 화면 폴더가 아니라 여기 둔다 — 문구와 판정이 화면마다
// 갈리면 같은 초대가 한쪽에서는 '대기 중', 다른 쪽에서는 '만료'로 보인다.
//
// 화면 시안: docs/plan/view/계좌 공유 A안 화면 시안.html (로컬 전용). 서버 계약은 share.type.ts 상단.

import { formatNumber } from '../utils/format'
import { accountActivityAmountText } from './assetsView'
import { buildLedgerTransactions } from './ledgerView'
import type { AccountType } from '@/services/common.type'
import type { ShareOwner, ShareResponse, ShareRole, ShareStatus } from '@/services/share'
import type { TransactionResponse } from '@/services/transaction'

/** 한 계좌의 초대 중·공유 중 인원 상한(서버 ShareConstants.MAX_MEMBERS_PER_ACCOUNT). */
export const SHARE_MAX_MEMBERS = 10

/** 초대 만료까지의 일수(서버 INVITE_TTL). 화면 안내 문구에만 쓴다 — 실제 만료 시각은 expiresAt. */
export const SHARE_INVITE_DAYS = 7

export const SHARE_ROLE_LABELS: Record<ShareRole, string> = {
  VIEWER: '보기만',
  EDITOR: '함께 기록',
}

/** 역할 선택지 순서. 초대 폼·멤버 행의 토글이 같은 순서로 그린다. */
export const SHARE_ROLE_ORDER: ShareRole[] = ['EDITOR', 'VIEWER']

/**
 * 1단계에서 공유를 시작할 수 있는 계좌 유형 — 현금·예적금뿐(시안 결정 5-A). 서버는 어느 유형이든
 * 받지만 보유 종목·매매 내역은 공유 화면에 아직 없어서, 주식·가상자산 계좌에는 초대 칸을 그리지 않는다.
 * 이미 공유받은 계좌는 유형과 무관하게 목록에 그대로 보인다.
 */
export function isShareableAccountType(type: AccountType): boolean {
  return type === 'CASH' || type === 'DEPOSIT'
}

/**
 * 공유 실패 문구. 서버 message도 한국어지만 "그래서 뭘 하면 되는지"가 빠져 있다 — 특히 미가입
 * 이메일은 가입을 부탁하면 되고, 만료는 다시 초대하면 된다는 다음 행동을 함께 적는다.
 */
export function describeShareError(code: string, fallbackMessage: string): string {
  switch (code) {
    case 'SHARE_INVITEE_NOT_FOUND':
      return '아직 모닛을 쓰지 않는 이메일이에요. 가입하면 바로 초대할 수 있어요.'
    case 'SHARE_ALREADY_EXISTS':
      return '이미 초대했거나 함께 보고 있는 사람이에요.'
    case 'SHARE_SELF_INVITE':
      return '내 이메일은 초대할 수 없어요.'
    case 'SHARE_LIMIT_EXCEEDED':
      return `한 계좌는 ${SHARE_MAX_MEMBERS}명까지만 함께 볼 수 있어요.`
    case 'SHARE_NOT_PENDING':
      return '이미 처리한 초대예요.'
    case 'SHARE_EXPIRED':
      return '기한이 지난 초대예요. 계좌 주인에게 다시 초대를 부탁해 주세요.'
    case 'SHARE_NOT_ACTIVE':
      return '이미 끝난 공유예요.'
    case 'SHARE_NOT_FOUND':
      return '공유 정보를 찾을 수 없어요. 공유가 이미 끝났을 수 있어요.'
    case 'SHARE_READ_ONLY':
      return '보기만 할 수 있는 계좌라 기록할 수 없어요. 계좌 주인에게 함께 기록 권한을 부탁해 주세요.'
    case 'SHARE_TYPE_NOT_ALLOWED':
      return '공유 계좌에는 수입·지출만 적을 수 있어요.'
    case 'TRANSACTION_NOT_AUTHOR':
      return '내가 적은 거래만 고치거나 지울 수 있어요.'
    case 'ACCOUNT_CLOSED':
      return '계좌 주인이 이 계좌를 해지했어요.'
    default:
      return fallbackMessage
  }
}

/**
 * 받은 초대가 처리된 뒤 버튼 자리에 적는 문구(시안 6번). PENDING이면 아직 처리 전이라 null —
 * 호출부가 버튼을 그린다.
 */
export function shareInviteOutcomeLabel(status: ShareStatus): string | null {
  switch (status) {
    case 'ACCEPTED':
      return '참여했어요'
    case 'DECLINED':
      return '거절했어요'
    case 'EXPIRED':
      return '기한이 지났어요'
    case 'REVOKED':
      return '취소된 초대예요'
    default:
      return null
  }
}

/** ISO-8601(UTC) → '10월 14일'. 로컬 타임존 기준. */
export function formatShareDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export interface OwnerShareGroups {
  /** 공유 중(ACCEPTED). */
  members: ShareResponse[]
  /** 수락을 기다리는 초대(PENDING, 만료 전). */
  pending: ShareResponse[]
  /** 만료된 초대 — 같은 사람에게 진행 중인 행이 없을 때만, 사람마다 가장 최근 것 하나. */
  expired: ShareResponse[]
}

/**
 * 소유자 쪽 공유 목록을 화면 묶음으로 나눈다. DECLINED·REVOKED는 이력이라 그리지 않는다.
 * 서버는 행을 지우지 않고 REVOKED로 남기므로 같은 사람을 여러 번 초대하면 행이 쌓인다 — 만료 행은
 * "다시 초대" 버튼 하나만 필요하니 사람마다 하나로 접는다(목록은 최근 초대 순이라 첫 행이 최신).
 */
export function groupOwnerShares(shares: ShareResponse[]): OwnerShareGroups {
  const members = shares.filter((s) => s.status === 'ACCEPTED')
  const pending = shares.filter((s) => s.status === 'PENDING')
  const activeUserIds = new Set([...members, ...pending].map((s) => s.member.userId))
  const seenExpired = new Set<number>()
  const expired = shares.filter((s) => {
    if (s.status !== 'EXPIRED' || activeUserIds.has(s.member.userId) || seenExpired.has(s.member.userId)) return false
    seenExpired.add(s.member.userId)
    return true
  })
  return { members, pending, expired }
}

/** 이 계좌의 공유 중 멤버 수(소유자 목록 기준). 배지·'멤버 N' 표기에 쓴다. */
export function memberCountOf(shares: ShareResponse[], accountId: number): number {
  return shares.filter((s) => s.accountId === accountId && s.status === 'ACCEPTED').length
}

/** 이 계좌에 수락을 기다리는 초대 수. */
export function pendingCountOf(shares: ShareResponse[], accountId: number): number {
  return shares.filter((s) => s.accountId === accountId && s.status === 'PENDING').length
}

/**
 * 소유자가 보는 거래의 작성자 배지. 내가 적었거나(createdBy가 나) 작성자 기록이 없는 옛 거래(null)는
 * 배지가 없다 — "내가 적은 것"이 기본값이어야 목록이 배지로 어지럽지 않다(시안 3번).
 * 멤버 이름은 공유 목록(상태 불문)에서 찾고, 탈퇴로 사라진 사용자는 '이전 멤버'로 적는다.
 */
export function ownerActivityAuthor(
  createdBy: number | null,
  myUserId: number | null,
  shares: ShareResponse[],
): string | null {
  if (createdBy === null || createdBy === myUserId) return null
  return shares.find((s) => s.member.userId === createdBy)?.member.name ?? '이전 멤버'
}

/**
 * 멤버가 공유 계좌 상세에서 보는 작성자 배지. 내 거래는 배지 없음, 소유자 거래(작성자 null 또는
 * 소유자)는 소유자 이름, 그 밖은 다른 멤버 — 멤버는 다른 멤버의 이름을 조회할 수 없다
 * (GET /shares?side=MEMBER는 내 행만 준다).
 */
export function sharedActivityAuthor(createdBy: number | null, myUserId: number | null, owner: ShareOwner): string | null {
  if (createdBy !== null && createdBy === myUserId) return null
  if (createdBy === null || createdBy === owner.userId) return owner.name
  return '다른 멤버'
}

/** 멤버에게는 소유자의 다른 계좌 이름을 보여주지 않는다(시안 4번) — 이체·저축 태그를 이 말로 가린다. */
const MASKED_COUNTERPART_LABEL = '다른 계좌'

export interface SharedActivityRow {
  key: string
  id: number
  isoDate: string
  dateLabel: string
  description: string
  tag: string
  /** 통화 단위까지 붙은 최종 표기('−45,000원'). */
  amountText: string
  amountColor: string
  /** 남이 적은 거래에만 붙는 이름. 내 거래는 null. */
  authorLabel: string | null
  /** 내가 적은 거래인가 — EDITOR는 이것만 고치거나 지울 수 있다. */
  mine: boolean
  /** 수정 모달 프리필용 원본. */
  raw: TransactionResponse
}

/**
 * 공유받은 계좌의 거래 목록. 가계부 목록과 같은 규칙(buildLedgerTransactions)으로 만든 뒤
 * - 이체·저축의 상대 계좌 이름은 가리고(소유자의 다른 계좌라서),
 * - 금액 부호는 계좌 상세와 같이 "이 계좌에서 나갔는지 들어왔는지"로 붙이고,
 * - 작성자 배지를 더한다.
 */
export function buildSharedAccountActivity(
  transactions: TransactionResponse[],
  accountId: number,
  myUserId: number | null,
  owner: ShareOwner,
): SharedActivityRow[] {
  const rows = buildLedgerTransactions(transactions, [])
  return rows.map((row, i) => {
    const raw = transactions[i]
    const masked = row.type === 'TRANSFER' || row.type === 'SAVING'
    return {
      key: String(row.id),
      id: row.id,
      isoDate: row.isoDate,
      dateLabel: row.dateLabel,
      description: row.description,
      tag: masked && row.type === 'TRANSFER' ? MASKED_COUNTERPART_LABEL : row.tag,
      amountText: accountActivityAmountText(row, accountId),
      amountColor: row.amountColor,
      authorLabel: sharedActivityAuthor(raw.createdBy, myUserId, owner),
      mine: raw.createdBy !== null && raw.createdBy === myUserId,
      raw,
    }
  })
}

/** '함께 보는 사람 N명 · 대기 M' 한 줄. N은 소유자 포함. */
export function shareSeatsLabel(memberCount: number, pendingCount: number): string {
  const base = `함께 보는 사람 ${formatNumber(memberCount + 1)}명`
  return pendingCount > 0 ? `${base} · 대기 ${formatNumber(pendingCount)}` : base
}
