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
