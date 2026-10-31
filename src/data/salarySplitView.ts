// 월급 나누기 창의 순수 계산 — 기억 → 폼, 합계 · 남는 돈 · 보낸 뒤 잔액, 버튼 문구, 요청 본문.
// 화면 정본: docs/plan/view/월급 나누기 디자인 A·B·C.html의 A안(2026-10-31 확정). 서버 계약은
// supabase/migrations/20261031000028_salary_split.sql.
//
// 규칙(사용자 결정 2026-10-31):
// - 지난번 값을 채워 둔다 — 월급통장 · 받는 통장 · 통장별 금액 · 월급. 체크를 풀면 그 통장은 이번 달만 건너뛴다.
// - '수입으로 적기'를 켜면 월급이 월급통장에 수입으로 함께 적힌다. 한 달에 여러 번 보내는 게 보통이라, 이번 정산월에
//   월급을 이미 적었을 때만(lastIncomeOn) 두 번 적히지 않게 꺼 둔 채로 연다. 체크를 풀고 보낸 건 받는 통장 체크처럼
//   이번만 건너뛴 것이라 다음에는 다시 켜진다(월급을 한 번도 적지 않은 사람만 꺼진 채 — 2026-10-31 사용자 결정).
// - 남는 돈은 월급 − 보낼 합계, 보낸 뒤 잔액은 원화 잔액 + 월급(켰을 때) − 보낼 합계. 마이너스여도 막지 않는다.
// - 잔액은 계좌의 원화 줄(accountBalanceOf(…, 'KRW'))로 센다 — 이체·저축은 원화로만 오가고, balanceKrw에는
//   달러 예수금 환산이 섞여 있다.

import type { SalarySplitRow } from '../state/types'
import { settlementMonthOf } from '../utils/date'
import { accountBalanceOf } from './assetsView'
import { findSubcategoryById } from './ledgerView'
import type { AccountResponse } from '@/services/account'
import type { CategoryResponse } from '@/services/category'
import type { YearMonth } from '@/services/common.type'
import type { CreateSalarySplitRequest, SalarySplitLineType, SalarySplitPlanResponse } from '@/services/salarySplit'

/** 받는 통장 최대 개수(서버 SALARY_SPLIT_TOO_MANY_LINES와 같다). */
export const SALARY_SPLIT_MAX_LINES = 10

/** 처음 쓰는 사람에게 보여 줄 "이 통장들을 넣어 볼까요?" 제안 개수. */
const SUGGESTION_LIMIT = 3

/** 기본 수입 소분류를 찾을 때 쓰는 이름(가입 시드의 '월급 › 월급'). */
const SALARY_CATEGORY_NAME = '월급'

/** 계좌의 원화 잔액. 줄이 없으면 0. */
export function krwBalanceOf(account: AccountResponse | undefined): number | null {
  if (!account) return null
  return accountBalanceOf(account, 'KRW')?.amount ?? 0
}

/** 기본 수입 소분류 — '월급 › 월급', 없으면 '월급' 대분류의 첫 소분류, 그것도 없으면 첫 수입 소분류. */
export function defaultIncomeSubcategoryIdOf(incomeCategories: CategoryResponse[]): number | null {
  const salary = incomeCategories.find((c) => c.name === SALARY_CATEGORY_NAME)
  const exact = salary?.subcategories.find((s) => s.name === SALARY_CATEGORY_NAME)
  return exact?.id ?? salary?.subcategories[0]?.id ?? incomeCategories.find((c) => c.subcategories.length > 0)?.subcategories[0]?.id ?? null
}

/** 새로 넣은 예적금 줄의 기본 저축 소분류 — 첫 저축 소분류. 태그에 그대로 보여서 사용자가 바로 바꿀 수 있다. */
export function defaultSavingSubcategoryIdOf(savingCategories: CategoryResponse[]): number | null {
  return savingCategories.find((c) => c.subcategories.length > 0)?.subcategories[0]?.id ?? null
}

/** 소분류 이름(없으면 null). */
export function subcategoryNameOf(categories: CategoryResponse[], subcategoryId: number | null): string | null {
  return findSubcategoryById(categories, subcategoryId)?.subcategory.name ?? null
}

/** 새로 넣는 받는 통장 줄 — 예적금은 저축(가계부 저축률에 잡히게), 나머지는 이체로 시작한다. 금액은 비워 둔다. */
export function newSalarySplitRow(account: AccountResponse, savingCategories: CategoryResponse[]): SalarySplitRow {
  const type: SalarySplitLineType = account.type === 'DEPOSIT' ? 'SAVING' : 'TRANSFER'
  return { accountId: account.id, type, subcategoryId: type === 'SAVING' ? defaultSavingSubcategoryIdOf(savingCategories) : null, amount: 0, on: true }
}

/** 그 날짜가 지금 정산월인가. */
export function inSettlementMonth(isoDate: string | null | undefined, current: YearMonth, monthStartDay: number): boolean {
  if (!isoDate) return false
  const month = settlementMonthOf(isoDate, monthStartDay)
  return month.year === current.year && month.month === current.month
}

/**
 * 기억 → 폼(AppState에 한 번 채울 값). 기억이 없으면(처음) 월급통장은 계좌가 하나뿐일 때만 미리 고른다 —
 * 가입하면 '현금' 계좌 하나가 생기므로 새 사용자는 그 계좌가 골라진 채로 시작한다.
 */
export function salarySplitFormOf(
  plan: SalarySplitPlanResponse | null,
  accounts: AccountResponse[],
  incomeWrittenThisMonth: boolean,
): { sourceId: number | null; incomeOn: boolean; incomeSubcategoryId: number | null; salary: number; rows: SalarySplitRow[] } {
  if (!plan) {
    return { sourceId: accounts.length === 1 ? accounts[0].id : null, incomeOn: true, incomeSubcategoryId: null, salary: 0, rows: [] }
  }
  // 서버 기억과 앱이 들고 있는 계좌 목록(캐시)이 잠깐 어긋날 수 있다 — 목록에 없는 계좌는 이름·잔액을 그릴 수 없으니 뺀다
  const known = new Set(accounts.map((a) => a.id))
  return {
    sourceId: plan.sourceAccountId !== null && known.has(plan.sourceAccountId) ? plan.sourceAccountId : null,
    // 지난번에 체크를 풀었는지(includeIncome)는 보지 않는다 — 파일 상단 규칙
    incomeOn: plan.lastSalaryAmount !== null && !incomeWrittenThisMonth,
    incomeSubcategoryId: plan.incomeSubcategoryId,
    salary: plan.lastSalaryAmount ?? 0,
    rows: plan.lines.filter((line) => known.has(line.accountId)).map((line) => ({
      accountId: line.accountId,
      type: line.type,
      subcategoryId: line.type === 'SAVING' ? line.subcategoryId : null,
      amount: line.lastAmount ?? 0,
      on: true,
    })),
  }
}

/** 보낼 줄 — 체크돼 있고 금액이 있는 줄. */
export function isSendingRow(row: SalarySplitRow): boolean {
  return row.on && row.amount > 0
}

export interface SalarySplitTotals {
  /** 보낼 통장 수 */
  count: number
  /** 보낼 합계 */
  sum: number
  /** 월급을 적는가(체크 + 금액) */
  incomeOk: boolean
  /** 월급에서 남는 돈 = 월급 − 보낼 합계 */
  remain: number
  /** 보낸 뒤 월급통장 원화 잔액. 월급통장을 고르기 전이면 null */
  sourceAfter: number | null
}

export function salarySplitTotalsOf(
  form: { incomeOn: boolean; salary: number; rows: SalarySplitRow[] },
  sourceKrwBalance: number | null,
): SalarySplitTotals {
  const sending = form.rows.filter(isSendingRow)
  const sum = sending.reduce((acc, row) => acc + row.amount, 0)
  const incomeOk = form.incomeOn && form.salary > 0
  return {
    count: sending.length,
    sum,
    incomeOk,
    remain: form.salary - sum,
    sourceAfter: sourceKrwBalance === null ? null : sourceKrwBalance + (incomeOk ? form.salary : 0) - sum,
  }
}

/** 받는 통장 줄 아래 한 줄 — 보낼 줄이면 "보낸 뒤 ○원"(지금 원화 잔액 + 금액), 건너뛰는 줄이면 "지금 ○원". */
export function receivingAfterOf(row: SalarySplitRow, krwBalance: number | null): { sending: boolean; amount: number } | null {
  if (krwBalance === null) return null
  return isSendingRow(row) ? { sending: true, amount: krwBalance + row.amount } : { sending: false, amount: krwBalance }
}

/** 버튼 상태 — 잠겼으면 왜 잠겼는지를 문구로 말한다. */
export function salarySplitButtonOf(input: {
  pending: boolean
  hasError: boolean
  sourceId: number | null
  incomeOn: boolean
  salary: number
  incomeSubcategoryId: number | null
  rows: SalarySplitRow[]
  totals: SalarySplitTotals
}): { label: string; enabled: boolean } {
  const { pending, hasError, sourceId, incomeOn, salary, incomeSubcategoryId, rows, totals } = input
  if (pending) return { label: '보내는 중…', enabled: false }
  if (sourceId === null) return { label: '월급이 들어온 통장을 골라 주세요', enabled: false }
  if (incomeOn && salary <= 0) return { label: '월급을 적어 주세요', enabled: false }
  if (incomeOn && incomeSubcategoryId === null) return { label: '수입 소분류를 골라 주세요', enabled: false }
  if (rows.some((row) => isSendingRow(row) && row.type === 'SAVING' && row.subcategoryId === null)) {
    return { label: '저축 소분류를 골라 주세요', enabled: false }
  }
  if (totals.count === 0 && !totals.incomeOk) {
    return { label: rows.length > 0 ? '금액을 적어 주세요' : '받는 통장을 추가해 주세요', enabled: false }
  }
  if (hasError) return { label: '다시 보내기', enabled: true }
  if (totals.incomeOk && totals.count > 0) return { label: `월급 적고 ${totals.count}곳으로 보내기`, enabled: true }
  if (totals.incomeOk) return { label: '월급만 적기', enabled: true }
  return { label: `${totals.count}곳으로 보내기`, enabled: true }
}

/** 통장 이름 뒤 조사 — 받침이 있으면 앞 글자('을'·'이'·'은'), 없으면 뒤 글자. 한글로 끝나지 않으면 받침 있는 쪽. */
export function particleOf(word: string, pair: '을를' | '이가' | '은는'): string {
  const last = word.charCodeAt(word.length - 1)
  const isHangul = last >= 0xac00 && last <= 0xd7a3
  return !isHangul || (last - 0xac00) % 28 !== 0 ? pair[0] : pair[1]
}

/** 'YYYY-MM-DD' → 'M월 D일'. */
export function monthDayLabelOf(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}월 ${d}일`
}

/** 요청 본문. 거래 내용은 보내는 날짜의 달로 "{M}월 월급"·"{M}월 한번에 이체"(보낸 뒤 내역에서 한 건씩 고칠 수 있다). */
export function salarySplitRequestOf(input: {
  sourceId: number
  isoDate: string
  incomeOn: boolean
  salary: number
  incomeSubcategoryId: number | null
  rows: SalarySplitRow[]
}): CreateSalarySplitRequest {
  const month = Number(input.isoDate.slice(5, 7))
  const incomeOk = input.incomeOn && input.salary > 0 && input.incomeSubcategoryId !== null
  return {
    sourceAccountId: input.sourceId,
    transactionDate: input.isoDate,
    description: `${month}월 한번에 이체`,
    incomeDescription: `${month}월 월급`,
    income: incomeOk ? { amount: input.salary, subcategoryId: input.incomeSubcategoryId as number } : null,
    lines: input.rows.map((row) => ({
      accountId: row.accountId,
      type: row.type,
      subcategoryId: row.type === 'SAVING' ? row.subcategoryId : null,
      amount: isSendingRow(row) ? row.amount : null,
    })),
  }
}

/** 처음 쓰는 사람에게 제안할 통장 — 예적금을 먼저, 월급통장과 이미 넣은 통장은 뺀다. */
export function salarySplitSuggestionsOf(accounts: AccountResponse[], sourceId: number | null, rows: SalarySplitRow[]): AccountResponse[] {
  const used = new Set(rows.map((row) => row.accountId))
  const candidates = accounts.filter((a) => a.id !== sourceId && !used.has(a.id))
  const deposits = candidates.filter((a) => a.type === 'DEPOSIT')
  const others = candidates.filter((a) => a.type !== 'DEPOSIT')
  return [...deposits, ...others].slice(0, SUGGESTION_LIMIT)
}
