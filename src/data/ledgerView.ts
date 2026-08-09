// View-model layer for the 가계부(Ledger) screen: adapts server responses (GET /transactions,
// /transactions/summary, /transactions/summaries/*, /transactions/rankings, /subscriptions,
// /categories) into the shapes the screen/modals render. Replaces src/data/mockLedger.ts.
//
// The bar/ranking/ring calculations below (barPct, changePct, changeSign, ramp color order,
// savings-rate ring, savings-rate bar) are the same formulas as the old mockLedger.ts — those are
// design-system rules (ds_rules_v2_5.md §1-6/§3-1/§3-2), transcribed verbatim, not reinvented. What
// changed is the input: mockLedger.ts hardcoded literals; here every number comes from a server
// response, so each formula gets a divide-by-zero / "previous is 0" guard the mock never needed
// (a brand-new category has expenseTotalPrevious: 0, which would otherwise produce Infinity%).

import { isSettingsMissing } from '@/services/user'
import { fmt } from '../utils/format'
import { mkDelta, type DeltaBadge } from '../utils/deltaBadge'
import { daysInMonth, firstWeekday, todayYearMonth, type YearMonthCursor } from '../utils/date'
import type { LedgerPeriod } from '../state/types'
import type { AccountResponse } from '@/services/account'
import type { CategoryResponse, SubcategoryResponse } from '@/services/category'
import type { SubscriptionResponse } from '@/services/subscription'
import type {
  CategoryRankingResponse,
  DailySummaryResponse,
  MonthlySummaryResponse,
  PeriodSummaryResponse,
  TransactionResponse,
} from '@/services/transaction'
import type { CategoryKind, Currency, TransactionType } from '@/services/common.type'

// ---------- 공용: 요청 실패 표시 ----------
// USER_SETTINGS_NOT_FOUND(404)는 에러가 아니라 "정산월 설정이 아직 없음"이라 회색 안내로 렌더한다
// (docs/api-conventions.md "에러가 아닌 실패" 절, services/user의 isSettingsMissing 재사용).

export interface QueryErrorView {
  message: string
  /** true면 회색(text-weak) 안내, false면 빨간(down) 에러. */
  muted: boolean
}

export function describeQueryError(error: unknown): QueryErrorView | null {
  if (!error) return null
  if (isSettingsMissing(error)) {
    return { message: '가계부를 쓰려면 먼저 사용자 설정이 필요해요.', muted: true }
  }
  return { message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.', muted: false }
}

// ---------- 카테고리 구분(CategoryKind) ↔ 한글 ----------

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  INCOME: '수입',
  SAVING: '저축',
  EXPENSE: '지출',
}

export const CATEGORY_KIND_ORDER: CategoryKind[] = ['INCOME', 'SAVING', 'EXPENSE']

/** 이체(transfer)는 카테고리가 없다(API-SPEC §6 — TRANSFER는 subcategoryId 지정 불가) — 매핑에 없음. */
export const ENTRY_TYPE_TO_CATEGORY_KIND: Record<'income' | 'saving' | 'expense', CategoryKind> = {
  income: 'INCOME',
  saving: 'SAVING',
  expense: 'EXPENSE',
}

/** EntryType(화면 탭 값) ↔ TransactionType(서버 값). */
export const ENTRY_TYPE_TO_TX_TYPE: Record<'income' | 'expense' | 'saving' | 'transfer', TransactionType> = {
  income: 'INCOME',
  expense: 'EXPENSE',
  saving: 'SAVING',
  transfer: 'TRANSFER',
}

export const TX_TYPE_TO_ENTRY_TYPE: Record<TransactionType, 'income' | 'expense' | 'saving' | 'transfer'> = {
  INCOME: 'income',
  EXPENSE: 'expense',
  SAVING: 'saving',
  TRANSFER: 'transfer',
}

export function findSubcategoryById(
  categories: CategoryResponse[],
  subcategoryId: number | null,
): { category: CategoryResponse; subcategory: SubcategoryResponse } | null {
  if (subcategoryId === null) return null
  for (const category of categories) {
    const subcategory = category.subcategories.find((s) => s.id === subcategoryId)
    if (subcategory) return { category, subcategory }
  }
  return null
}

// ---------- 이번달/올해 수지 하이라이트 (deep-card hero) ----------

function periodDeltaLabel(period: LedgerPeriod): string {
  return period === 'month' ? '전월' : '작년'
}

/**
 * 딥 카드 증감 배지. hexToRgba/mkDelta가 요구하는 고정 다크 hex(#7FE0B6/#F5A29B/#B9B2F4)는
 * src/utils/deltaBadge.ts 헤더 주석대로 라이트/다크 무관하게 그대로 쓴다(원본 동작 유지).
 * current===previous(둘 다 0인 "데이터 없음" 포함)면 의미 있는 배지가 없으므로 null.
 */
function buildAmountDelta(
  current: number,
  previous: number,
  period: LedgerPeriod,
  colorHex: string,
  withPercent: boolean,
): DeltaBadge | null {
  if (current === previous) return null
  const diff = current - previous
  const up = diff > 0
  const sign = up ? '+' : '−'
  let text = `${periodDeltaLabel(period)} 대비 ${sign}${fmt(Math.abs(diff))}원`
  if (withPercent && previous !== 0) {
    const pct = Math.round((diff / previous) * 1000) / 10
    text += ` (${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%)`
  }
  return mkDelta(text, up, colorHex)
}

export interface PeriodDeltas {
  income: DeltaBadge | null
  expense: DeltaBadge | null
  saving: DeltaBadge | null
}

export function buildPeriodDeltas(summary: PeriodSummaryResponse, period: LedgerPeriod): PeriodDeltas {
  return {
    income: buildAmountDelta(summary.incomeTotal, summary.incomeTotalPrevious, period, '#7FE0B6', false),
    expense: buildAmountDelta(summary.expenseTotal, summary.expenseTotalPrevious, period, '#F5A29B', true),
    saving: buildAmountDelta(summary.savingTotal, summary.savingTotalPrevious, period, '#B9B2F4', false),
  }
}

export function getLedgerHeroTitle(period: LedgerPeriod, year: number): string {
  return period === 'month' ? '이번 달, 이렇게 돈이 흘렀어요' : `${year}년, 이렇게 돈이 흘렀어요`
}

// ---------- 저축률 링 게이지 ----------

export interface SavingsRingView {
  ratePct: number
  /** SVG strokeDasharray. 링 둘레 100 기준(circumference 100 정규화 — 기존 마크업의 "40 60" 표기와 동일 스케일). */
  dashArray: string
  savingFmt: string
  expenseFmt: string
}

/** incomeTotal이 0이면 저축률 자체가 계산 불가 — ds_rules §3-1의 "단일 링 게이지" 대상에서 제외(빈 상태로 치환). */
export function buildSavingsRing(summary: PeriodSummaryResponse): SavingsRingView | null {
  if (summary.incomeTotal === 0) return null
  const ratePct = Math.max(0, Math.min(100, Math.round(summary.savingsRatePercent)))
  return {
    ratePct,
    dashArray: `${ratePct} ${100 - ratePct}`,
    savingFmt: fmt(summary.savingTotal),
    expenseFmt: fmt(summary.expenseTotal),
  }
}

// ---------- 월별 저축률 막대 ----------

export interface SavingsBar {
  month: number
  /** 0~100. 미래 월은 0(트랙만 표시). */
  pct: number
  isFuture: boolean
  isCurrent: boolean
}

/** ds_rules §3-2: 미래(데이터 없는) 월은 트랙만, 진행 중인 현재 월은 막대 + accent 라벨. */
export function buildSavingsBars(monthly: MonthlySummaryResponse[], currentMonth: number): SavingsBar[] {
  return [...monthly]
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const isFuture = m.month > currentMonth
      const pct = !isFuture && m.incomeTotal > 0 ? Math.max(0, Math.min(100, (m.savingTotal / m.incomeTotal) * 100)) : 0
      return { month: m.month, pct, isFuture, isCurrent: m.month === currentMonth }
    })
}

/** ds_rules §3-2: 저축률 차트에 목표선은 없다 — 기준선이 필요하면 "최근 6개월 평균" 캡션 문장으로만 표기. */
export function computeRecentAvgSavingsRate(bars: SavingsBar[]): number | null {
  const elapsed = bars.filter((b) => !b.isFuture)
  const recent = elapsed.slice(-6)
  if (recent.length === 0) return null
  return Math.round(recent.reduce((sum, b) => sum + b.pct, 0) / recent.length)
}

// ---------- 전월 대비 분류별 지출 랭킹 ----------

const RAMP_SCALE = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

export interface LedgerCategoryRow {
  categoryId: number
  name: string
  amtFmt: string
  barPct: number
  /** expenseTotalPrevious === 0(신규 카테고리) — 증감률 계산 불가. */
  isNew: boolean
  changePct: number | null
  changePctFmt: string | null
  changeSign: string
  rampColor: string
}

export function buildLedgerCategories(rankings: CategoryRankingResponse[]): LedgerCategoryRow[] {
  if (rankings.length === 0) return []
  const maxAmt = Math.max(...rankings.map((r) => r.expenseTotal))
  return [...rankings]
    .sort((a, b) => b.expenseTotal - a.expenseTotal)
    .map((r, i) => {
      const prev = r.expenseTotalPrevious
      const isNew = prev === 0
      const changePct = isNew ? null : Math.round(((r.expenseTotal - prev) / prev) * 1000) / 10
      return {
        categoryId: r.categoryId,
        name: r.categoryName,
        amtFmt: fmt(r.expenseTotal),
        barPct: maxAmt > 0 ? Math.round((r.expenseTotal / maxAmt) * 100) : 0,
        isNew,
        changePct,
        changePctFmt: changePct === null ? null : Math.abs(changePct).toFixed(1),
        changeSign: changePct !== null && changePct > 0 ? '+' : '−',
        rampColor: RAMP_SCALE[Math.min(i, RAMP_SCALE.length - 1)],
      }
    })
}

/** 상승 폭이 가장 큰 카테고리 라벨. 신규 카테고리(증감률 없음)나 실제로 증가한 곳이 없으면 null(배지 숨김). */
export function pickTopIncreaseLabel(rows: LedgerCategoryRow[]): string | null {
  const candidates = rows.filter((r): r is LedgerCategoryRow & { changePct: number } => r.changePct !== null && r.changePct > 0)
  if (candidates.length === 0) return null
  const top = [...candidates].sort((a, b) => b.changePct - a.changePct)[0]
  return `${top.name} +${top.changePctFmt}%`
}

export function formatCategoryDetailChange(current: number, previous: number): string {
  if (previous === 0) return '신규 지출'
  const pct = Math.round(((current - previous) / previous) * 1000) / 10
  const sign = pct > 0 ? '+' : '−'
  return `전월 대비 ${sign}${Math.abs(pct).toFixed(1)}%`
}

// ---------- 구독 · 정기결제 / 고정 지출 ----------

export interface SubscriptionRow {
  id: number
  name: string
  icon: string
  dayLabel: string
  /** institutionName 우선, 없으면 계좌명. 계좌를 못 찾으면 빈 문자열(가짜 값 금지). */
  accountLabel: string
  amtFmt: string
  /** 아래 4개는 표시용이 아니라 수정 모달 프리필 전용 — 서버에 단일 구독 조회가 없어, 이미 이 목록
   * 조회로 받아둔 원본 값을 그대로 재사용한다. */
  amount: number
  paymentDay: number
  accountId: number
  subcategoryId: number
}

function accountLabelOf(accountId: number, accounts: AccountResponse[]): string {
  const account = accounts.find((a) => a.id === accountId)
  return account?.institutionName || account?.name || ''
}

// 서버 icon 값의 허용 집합이 스펙에 없다. Material Symbols 리거처가 아닌 값(예: 'netflix')이 오면
// 폰트가 매칭에 실패해 배지 안에 글자가 그대로 노출된다 — 형태 검증을 통과한 값만 아이콘으로 쓴다.
const MATERIAL_SYMBOL_NAME = /^[a-z0-9_]+$/

function subscriptionIconOf(icon: string | null): string {
  return icon && MATERIAL_SYMBOL_NAME.test(icon) ? icon : 'event_repeat'
}

export function buildSubscriptionRows(subscriptions: SubscriptionResponse[], accounts: AccountResponse[]): SubscriptionRow[] {
  return subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    icon: subscriptionIconOf(s.icon),
    dayLabel: `매월 ${s.paymentDay}일`,
    accountLabel: accountLabelOf(s.accountId, accounts),
    amtFmt: fmt(s.amount),
    amount: s.amount,
    paymentDay: s.paymentDay,
    accountId: s.accountId,
    subcategoryId: s.subcategoryId,
  }))
}

// ---------- 내역(거래 목록) ----------

export interface LedgerTxRow {
  id: number
  /** 'YYYY-MM-DD' — 수정 모달을 열 때 날짜를 프리필하는 데 쓴다(isoDateToDisplay와 함께). */
  isoDate: string
  dateLabel: string
  desc: string
  tag: string
  type: TransactionType
  amount: string
  amountColor: string
  key: string
  /** 아래 4개는 표시용이 아니라 수정 모달 프리필 전용 — 서버에 단일 거래 조회(GET /transactions/{id})가
   * 없어, 이미 이 목록 조회로 받아둔 원본 값을 그대로 재사용한다(클릭 시점에 이미 화면에 떠 있는 값이라
   * 재조회가 불필요하다). */
  accountId: number
  subcategoryId: number | null
  transferAccountId: number | null
  amountRaw: number
  /** 아래 3개는 이 화면이 편집하지 않는 필드다. PUT이 전체 교체라 그대로 다시 보내지 않으면
   * 사용자가 금액만 고쳐 저장해도 메모와 외화 정보가 조용히 지워진다 — 보존용으로 들고 다닌다. */
  memo: string | null
  nativeAmount: number | null
  nativeCurrency: Currency | null
}

const TX_TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: 'var(--inc-text)',
  EXPENSE: 'var(--exp-text)',
  SAVING: 'var(--sav-text)',
  TRANSFER: 'var(--text-strong)',
}

function shortDateLabel(isoDate: string): string {
  return isoDate.slice(5).replace('-', '.')
}

/**
 * TRANSFER는 subcategoryName이 없고(API-SPEC §6) 상대 계좌명도 응답에 없어(transaction.type.ts 주석)
 * 계좌 목록과 transferAccountId로 조인한다. 조인 실패 시 "계좌 이체"로 폴백.
 */
export function buildLedgerTx(transactions: TransactionResponse[], accounts: AccountResponse[]): LedgerTxRow[] {
  return transactions.map((t) => {
    const sign = t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '−' : ''
    const tag =
      t.type === 'TRANSFER'
        ? (accounts.find((a) => a.id === t.transferAccountId)?.name ?? '계좌 이체')
        : (t.subcategoryName ?? '')
    return {
      id: t.id,
      isoDate: t.transactionDate,
      dateLabel: shortDateLabel(t.transactionDate),
      desc: t.description,
      tag,
      type: t.type,
      amount: sign + fmt(t.amount),
      amountColor: TX_TYPE_COLOR[t.type],
      key: String(t.id),
      accountId: t.accountId,
      subcategoryId: t.subcategoryId,
      transferAccountId: t.transferAccountId,
      amountRaw: t.amount,
      memo: t.memo,
      nativeAmount: t.nativeAmount,
      nativeCurrency: t.nativeCurrency,
    }
  })
}

// ---------- 캘린더 일별 수입/저축/지출 ----------

export interface DayLine {
  text: string
  color: string
}

export interface CalendarCell {
  day: number
  label: string
  lines: DayLine[]
  highlighted: boolean
}

function dayLine(kind: 'income' | 'saving' | 'expense', amt: number): DayLine {
  return {
    text: (kind === 'expense' ? '−' : '+') + fmt(amt),
    color: kind === 'income' ? 'var(--inc-text)' : kind === 'saving' ? 'var(--sav-text)' : 'var(--exp-text)',
  }
}

function linesForDay(d: DailySummaryResponse | undefined): DayLine[] {
  if (!d) return []
  const out: DayLine[] = []
  if (d.incomeAmount > 0) out.push(dayLine('income', d.incomeAmount))
  if (d.savingAmount > 0) out.push(dayLine('saving', d.savingAmount))
  if (d.expenseAmount > 0) out.push(dayLine('expense', d.expenseAmount))
  return out
}

/**
 * 거래가 없는 날은 응답 배열에서 빠질 수 있으므로(transaction.type.ts 주석) 프론트에서 날짜 축을
 * daysInMonth/firstWeekday로 채운다. 7의 배수가 되도록 뒤쪽도 빈 칸(null)으로 채워 그리드가 항상
 * 완전한 행 단위로 떨어지게 한다.
 */
export function buildMonthCalendarRows(cursor: YearMonthCursor, daily: DailySummaryResponse[]): (CalendarCell | null)[][] {
  const dim = daysInMonth(cursor.year, cursor.month)
  const startDow = firstWeekday(cursor.year, cursor.month)
  const byDay = new Map<number, DailySummaryResponse>()
  daily.forEach((d) => byDay.set(Number(d.date.slice(8, 10)), d))

  const today = todayYearMonth()
  const isCurrentMonth = today.year === cursor.year && today.month === cursor.month
  const todayDate = new Date().getDate()

  const cells: (CalendarCell | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let day = 1; day <= dim; day++) {
    cells.push({
      day,
      label: String(day),
      lines: linesForDay(byDay.get(day)),
      highlighted: isCurrentMonth && day === todayDate,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (CalendarCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/**
 * 주간 뷰에서 보여줄 한 주(행)를 고른다. 서버에는 월별 정산 커서만 있고 "몇째 주"라는 별도 커서가
 * 없다 — 선택된 월이 실제 이번 달이면 오늘이 포함된 주를, 아니면 그 달의 첫째 주를 보여준다(판단
 * 근거: 다른 달로 이동했을 때 "이번 주"라는 개념 자체가 없으므로, 그 달을 훑어보기 시작하는
 * 자연스러운 지점인 첫째 주가 낫다).
 */
export function pickCalendarWeek(cursor: YearMonthCursor, daily: DailySummaryResponse[]): (CalendarCell | null)[] {
  const rows = buildMonthCalendarRows(cursor, daily)
  const today = todayYearMonth()
  if (today.year === cursor.year && today.month === cursor.month) {
    const todayDate = new Date().getDate()
    const row = rows.find((r) => r.some((c) => c?.day === todayDate))
    if (row) return row
  }
  return rows[0] ?? []
}
