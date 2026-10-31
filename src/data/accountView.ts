// 계좌를 화면에 어떻게 표기할지에 대한 규칙 — 특정 화면 하나가 아니라 계좌를 고르는 모든 곳
// (가계부 입력·고정지출·환전·주식 매수/매도·보유종목 등록)이 함께 쓴다. 화면별 뷰모델
// ({screen}View.ts)과 달리 화면 경계를 가로지르므로 별도 파일로 둔다.

import { findBankInstitution } from '../design/bank-institutions'
import type { AccountResponse } from '../services/account'
import type { InstitutionResponse } from '../services/institution'

export interface AccountInstitutionMeta {
  tokenKey: string
  institutionName: string
}

/**
 * 계좌 드롭다운에 "이 계좌가 어느 기관 것인지"를 함께 보여주기 위한 조인.
 * AccountResponse.institutionId로 GET /institutions 응답을 찾아 그 기관의
 * icon(tokenKey)이 BANK_INSTITUTIONS 마스터(design/bank-institutions.ts)에 실제로 등록된 값일 때만
 * 매칭으로 본다 — institutionName은 있는데 기관에 아이콘을 아직 안 골랐거나(icon: null) BankIcon이
 * 모르는 값이면, 어설프게 기본 아이콘(pillar)으로 채우지 않고 계좌명만 보여준다(호출부 결정). null을
 * 돌려주면 호출부는 아이콘 없이 이름만 렌더한다.
 */
export function accountInstitutionMeta(
  account: AccountResponse,
  institutions: InstitutionResponse[],
): AccountInstitutionMeta | null {
  if (!account.institutionName || account.institutionId === null) return null
  const institution = institutions.find((i) => i.id === account.institutionId)
  if (!institution?.icon || !findBankInstitution(institution.icon)) return null
  return { tokenKey: institution.icon, institutionName: account.institutionName }
}

/**
 * 계좌 드롭다운 트리거의 보조 한 줄(기관명). 기관을 매칭하지 못한 계좌에도 빈 문자열 대신 '기관
 * 없음'을 돌려주는 이유는, 고른 계좌에 따라 보조 줄이 나타났다 사라지며 트리거가 들썩이는 것을
 * 막기 위해서다(Dropdown.tsx의 selectedMeta 주석 참고 — 트리거 높이 자체는 minHeight로 고정된다).
 * institutionName은 있는데 아이콘만 모르는 경우에는 그 이름을 그대로 쓴다 — 아이콘이 없다고
 * 기관을 모르는 척할 필요는 없다.
 *
 * 아직 아무 계좌도 고르지 않았으면 빈 문자열이다. 이때 '기관 없음'을 쓰면 "계좌를 선택하세요"
 * 아래에 있지도 않은 계좌의 기관을 단정하는 문구가 붙는다.
 */
export function accountInstitutionLabel(
  account: AccountResponse | undefined,
  institutions: InstitutionResponse[],
): string {
  if (!account) return ''
  return accountInstitutionMeta(account, institutions)?.institutionName ?? account.institutionName ?? '기관 없음'
}

/**
 * 잔액 기준일 전 날짜를 고른 기록의 안내 문구(서버 000026 — 기준일 전 거래는 기록에는 남고 잔액에는 세지 않는다).
 * 가계부 입력·환전 창이 고른 계좌·날짜로 부르고, keptIn 은 기록이 남는 곳('가계부'·'환전 내역')이다. 해당 계좌가 없으면 null.
 * 계좌가 둘(저축·이체)이고 기준일이 서로 다르면 날짜는 빼고 '등록하기 전 날짜라'로 적는다.
 */
export function balanceStartNoteText(accounts: (AccountResponse | undefined)[], isoDate: string, keptIn: string): string | null {
  const before = accounts.filter((a): a is AccountResponse => !!a && isoDate < a.balanceStartDate)
  if (before.length === 0) return null
  const names = before.map((a) => a.name).join(' · ')
  const dates = new Set(before.map((a) => a.balanceStartDate))
  const lead = dates.size === 1
    ? `${names} 계좌는 ${monthDayText(before[0].balanceStartDate)}에 등록해서`
    : `${names} 계좌를 등록하기 전 날짜라`
  return `${lead} 이 기록은 잔액에 반영되지 않아요. ${keptIn}에는 남아요.`
}

function monthDayText(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}월 ${d}일`
}

/**
 * 사용 중인 계좌끼리 이름이 겹치는지 — 서버 트리거(000029, ACCOUNT_NAME_DUPLICATE)와 같은 규칙: 앞뒤 공백만 무시하고
 * 대소문자는 구분, 해지한 계좌와는 겹쳐도 된다. 엑셀 거래 가져오기가 계좌를 이름으로 찾아서 같은 이름을 막는다(2026-10-31 사용자 결정).
 * accounts 는 `useGetAccounts()`(내 사용 중 계좌) 결과, excludeId 는 수정 중인 계좌 자신.
 */
export function isAccountNameTaken(accounts: readonly AccountResponse[] | undefined, name: string, excludeId?: number): boolean {
  const target = name.trim()
  if (!target || !accounts) return false
  return accounts.some((a) => a.id !== excludeId && a.closedAt === null && a.name.trim() === target)
}

/**
 * 사용 중인 계좌 중 이름이 겹친 것 — 위 규칙이 생기기 전부터 겹쳐 있던 계좌. 이 이름으로 적은 엑셀 줄은 어느 계좌인지 정할 수 없어
 * 올리기가 막히므로(IMPORT_ACCOUNT_AMBIGUOUS) 가져오기 창에서 미리 알린다. 가나다순.
 */
export function duplicateAccountNames(accounts: readonly AccountResponse[] | undefined): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of accounts ?? []) {
    if (a.closedAt !== null) continue
    const name = a.name.trim()
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((x, y) => x.name.localeCompare(y.name, 'ko'))
}
