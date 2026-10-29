// 가족·커플 공유(v17)의 화면 표기 규칙 — 설정의 공유 흐름, 상단 '개인 | 우리집', 대시보드·자산의 소유자 표기,
// 가계부의 '누구 몫' 칩·설명 줄·필터가 함께 쓴다. 문구와 판정이 화면마다 갈리지 않도록 여기 한 곳에 둔다.
// 서버 계약은 services/share/share.type.ts, 설계는 docs/superpowers/specs/2026-10-25-household-share-v17-design.md.

import type { AccountType, EditableTransactionType } from '@/services/common.type'
import type { OwnerTag, TransactionResponse } from '@/services/transaction'

/** 공유할 수 있는 계좌 유형 — 현금 · 예적금뿐(서버 SHARE_ACCOUNT_NOT_ALLOWED와 같은 규칙). */
export function isShareableAccountType(type: AccountType): boolean {
  return type === 'CASH' || type === 'DEPOSIT'
}

/** 공유 화면 이름 최대 글자 수(서버 user_settings.share_space_name varchar(8)). */
export const SPACE_NAME_MAX = 8

/** 공유 화면 이름 추천 — '우리집', 상대 이름, '우리 부부', '공동'(같은 이름은 한 번만). */
export function spaceNamePresets(partnerName: string | null): string[] {
  return [...new Set(['우리집', partnerName ?? '', '우리 부부', '공동'].filter((n) => n !== '' && n.length <= SPACE_NAME_MAX))]
}

/** 초대 코드 길이와 허용 글자(서버와 같다 — 헷갈리는 0·O·1·I 없음). */
export const SHARE_CODE_LENGTH = 6
const SHARE_CODE_CHARS = /[A-HJ-NP-Z2-9]/

/** 초대 코드 유효 시간 — 진행 바의 분모(실제 만료 시각은 서버 expiresAt). */
export const SHARE_CODE_TTL_MS = 10 * 60 * 1000

/** 코드 입력 한 칸의 값으로 쓸 수 있는 글자만 남긴다(대문자로, 허용 글자 밖은 버림). */
export function normalizeShareCodeChar(input: string): string {
  const upper = input.toUpperCase()
  for (const ch of upper) if (SHARE_CODE_CHARS.test(ch)) return ch
  return ''
}

/** 붙여넣은 글자열에서 코드로 쓸 수 있는 글자만 최대 6자. */
export function normalizeShareCode(input: string): string {
  return [...input.toUpperCase()].filter((ch) => SHARE_CODE_CHARS.test(ch)).join('').slice(0, SHARE_CODE_LENGTH)
}

/** 남은 시간 ms → 'mm:ss'(음수는 00:00). */
export function formatRemaining(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}

/** ISO-8601 → '2026.10.25'(로컬 날짜). '연결됨 · 2026.10.25부터'에 쓴다. */
export function formatShareDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 공유 계좌 줄의 이력 표기(시안 v16). */
export function shareHistoryLabel(includeHistory: boolean): string {
  return includeHistory ? '이전 내역 포함 공유' : '공유 시작일 이후 내역만 공유'
}

/** 계좌 선택 창의 '이전 내역도 함께 공유' 옆 설명. */
export function shareHistoryCaption(includeHistory: boolean): string {
  return includeHistory ? '연결 전 거래까지 함께 보여요' : '공유를 시작한 날 이후 거래만 보여요'
}

/** 계좌 주인 이름 — 내 계좌면 내 이름, 아니면 상대 이름(모르면 '상대'). */
export function ownerNameOf(ownerId: string, myUserId: string | null, myName: string, partnerName: string | null): string {
  if (myUserId !== null && ownerId === myUserId) return myName || '나'
  return partnerName ?? '상대'
}

// ---------- 가계부 '누구 몫' ----------

/** 보는 사람 기준으로 다시 쓴 누구 몫 — me 내 것 · pt 상대 것 · jt 공동. 필터·설명 줄이 쓴다. */
export type LedgerWho = 'me' | 'pt' | 'jt'

/** 거래의 꼬리표(적은 사람 기준)를 보는 사람 기준으로 바꾼다. */
export function ledgerWhoOf(t: Pick<TransactionResponse, 'userId' | 'ownerTag'>, myUserId: string | null): LedgerWho {
  if (t.ownerTag === 'JOINT') return 'jt'
  const recordedByMe = myUserId !== null && t.userId === myUserId
  if (t.ownerTag === 'PARTNER') return recordedByMe ? 'pt' : 'me'
  return recordedByMe ? 'me' : 'pt'
}

export interface LedgerNames {
  myName: string
  partnerName: string | null
}

/**
 * 내역 줄 아래 설명(시안 v16). 연결이 없으면 늘 빈 문자열.
 *  - '우리집': 모든 줄 — '공동 · {결제한 사람} 결제' 또는 그 거래가 누구 것인지 이름
 *  - '개인': 공동 거래만 '공동 · {결제한 사람} 결제', 상대가 내 몫으로 적은 거래는 '{상대}님이 기록', 내가 적은 상대 몫은 '{상대} 몫'
 */
export function ledgerOwnerCaption(
  t: Pick<TransactionResponse, 'userId' | 'ownerTag'>,
  opts: { linked: boolean; shared: boolean; myUserId: string | null } & LedgerNames,
): string {
  if (!opts.linked) return ''
  const me = opts.myName || '나'
  const partner = opts.partnerName ?? '상대'
  const payer = opts.myUserId !== null && t.userId === opts.myUserId ? me : partner
  const who = ledgerWhoOf(t, opts.myUserId)
  if (who === 'jt') return `공동 · ${payer} 결제`
  if (opts.shared) return who === 'me' ? me : partner
  if (t.ownerTag === 'PARTNER') return payer === me ? `${partner} 몫` : `${partner}님이 기록`
  return ''
}

/** 입력 창 '누구의 수입·지출인가요?' 칩 순서와 이름. */
export const OWNER_TAG_ORDER: OwnerTag[] = ['SELF', 'PARTNER', 'JOINT']

export function ownerTagChipLabel(tag: OwnerTag, names: LedgerNames): string {
  if (tag === 'SELF') return names.myName || '나'
  if (tag === 'PARTNER') return names.partnerName ?? '상대'
  return '공동'
}

/** 칩 아래 안내(시안 v16 entryWhoHints, 결정 2·3에 맞춘 문구). */
export function ownerTagHint(tag: OwnerTag, entryType: Extract<EditableTransactionType, 'INCOME' | 'EXPENSE'>, names: LedgerNames & { spaceName: string }): string {
  const noun = entryType === 'INCOME' ? '수입' : '지출'
  const me = names.myName || '나'
  const partner = names.partnerName ?? '상대'
  if (tag === 'SELF') return `${me}님의 ${noun}으로 기록돼요. 공유 계좌가 아니면 상대에게는 보이지 않아요.`
  if (tag === 'PARTNER') return `${partner}님의 ${noun}으로 기록되고, ${partner}님 가계부에도 보여요.`
  return `공동 ${noun}으로 기록되고, '${names.spaceName}' 가계부에서 두 사람 모두 볼 수 있어요.`
}

/** 상대가 볼 수 없는 계좌 자리에 쓰는 이름. */
export const HIDDEN_ACCOUNT_LABEL = '다른 계좌'
