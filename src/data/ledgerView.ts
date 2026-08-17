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

import { fmt } from '../utils/format'
import { mkDelta, type DeltaBadge } from '../utils/deltaBadge'
import {
  addDays,
  daysInMonth,
  firstWeekday,
  toISODate,
  todayYearMonth,
  weekDates,
  weekIndexInMonth,
  weekOwnerYearMonth,
  type YearMonthCursor,
} from '../utils/date'
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

export interface QueryErrorView {
  message: string
  /** true면 회색(text-weak) 안내, false면 빨간(down) 에러. */
  muted: boolean
}

export function describeQueryError(error: unknown): QueryErrorView | null {
  if (!error) return null
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

/**
 * 저축률 링 카드의 제목/부제. 링은 히어로와 같은 useGetPeriodSummary(period) 쿼리를 그대로
 * 공유한다 — 별도 요청을 추가하지 않고, "이번 달"/"올해" 탭을 누르면 히어로·랭킹 등 이 화면의
 * 다른 모든 숫자와 함께 라벨도 같이 바뀌게 만드는 쪽이 자연스럽다고 판단했다(링만 "이번 달"에
 * 고정하면 히어로가 연간 수치를 보여주는데 옆 카드만 다른 기간의 라벨을 달고 있어 더 헷갈린다).
 */
export function getSavingsRingCopy(period: LedgerPeriod): { title: string; subtitle: string } {
  return period === 'month'
    ? { title: '이번 달 저축률', subtitle: '이번 달 수입 대비' }
    : { title: '올해 저축률', subtitle: '올해 수입 대비' }
}

// ---------- 저축률 링 게이지 ----------

export interface SavingsRingView {
  ratePct: number
  /** SVG strokeDasharray. 링 둘레 100 기준(circumference 100 정규화 — 기존 마크업의 "40 60" 표기와 동일 스케일). */
  dashArray: string
  savingFmt: string
  expenseFmt: string
}

/**
 * 저축률이 계산 불가한 기간은 링 게이지 대상에서 제외한다(빈 상태로 치환).
 * 서버는 수입이 0이면 savingsRatePercent를 0이 아니라 null로 내려준다(API-SPEC §6.6) —
 * null을 그대로 Math.round에 넘기면 0%로 그려져 "저축을 하나도 안 한 달"처럼 보인다.
 */
export function buildSavingsRing(summary: PeriodSummaryResponse): SavingsRingView | null {
  if (summary.incomeTotal === 0 || summary.savingsRatePercent === null) return null
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
  // 결제일 오름차순(dc.html subscriptionsAll: 10일 → 15일 → 20일) — 금액순이 아니다.
  return [...subscriptions]
    .sort((a, b) => a.paymentDay - b.paymentDay)
    .map((s) => ({
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
  /** 목록에 "메모 있음" 표시를 하고, 수정 모달을 열 때 entryMemo 프리필에 쓴다(입력 UI가 있어
   * 더 이상 보존 전용이 아니다). */
  memo: string | null
  /** 이 화면이 편집하지 않는 필드다(외화 입력 UI 없음). PUT이 전체 교체라 그대로 다시 보내지 않으면
   * 사용자가 금액만 고쳐 저장해도 외화 정보가 조용히 지워진다 — 보존용으로 들고 다닌다. */
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
  /** 셀 클릭 시 입력 모달에 프리필할 날짜('YYYY-MM-DD'). */
  isoDate: string
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

export interface MonthCalendarResult {
  rows: (CalendarCell | null)[][]
  /**
   * true면 daily 응답에 이 달력 격자(cursor.year-cursor.month, 1~말일)에 속하지 않는 날짜가
   * 섞여 있었다는 뜻 — monthStartDay가 1이 아닌 정산월에서 서버가 이전/다음 달력월 날짜의 요약을
   * 함께 내려줄 때 발생한다(2장). 근본 해결은 서버의 정산월 경계 필드가 필요해 보류하고, 여기서는
   * "격자에 못 들어간 항목이 있다"는 사실만 화면에 캡션으로 안내한다(buildMonthCalendarRows 주석 참고).
   */
  hasOutOfGridData: boolean
}

/**
 * 거래가 없는 날은 응답 배열에서 빠질 수 있으므로(transaction.type.ts 주석) 프론트에서 날짜 축을
 * daysInMonth/firstWeekday로 채운다. 7의 배수가 되도록 뒤쪽도 빈 칸(null)으로 채워 그리드가 항상
 * 완전한 행 단위로 떨어지게 한다.
 *
 * 방어: 일(day) 두 자리만으로 칸에 매핑하면 monthStartDay가 1이 아닐 때 서버가 함께 내려주는 다른
 * 달력월 날짜(예: 정산 6월 응답에 섞인 7/1~7/14)가 엉뚱한 칸(6/1~6/14)에 그려진다. 연·월까지 대조해
 * 이 격자(cursor.year-cursor.month)에 속하지 않는 날짜는 조용히 버리고, hasOutOfGridData로 알린다.
 */
export function buildMonthCalendarRows(cursor: YearMonthCursor, daily: DailySummaryResponse[]): MonthCalendarResult {
  const dim = daysInMonth(cursor.year, cursor.month)
  const startDow = firstWeekday(cursor.year, cursor.month)
  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-`
  const byDay = new Map<number, DailySummaryResponse>()
  let hasOutOfGridData = false
  daily.forEach((d) => {
    if (!d.date.startsWith(monthPrefix)) {
      hasOutOfGridData = true
      return
    }
    byDay.set(Number(d.date.slice(8, 10)), d)
  })

  const today = todayYearMonth()
  const isCurrentMonth = today.year === cursor.year && today.month === cursor.month
  const todayDate = new Date().getDate()

  const cells: (CalendarCell | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let day = 1; day <= dim; day++) {
    cells.push({
      day,
      isoDate: `${monthPrefix}${String(day).padStart(2, '0')}`,
      label: String(day),
      lines: linesForDay(byDay.get(day)),
      highlighted: isCurrentMonth && day === todayDate,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (CalendarCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return { rows, hasOutOfGridData }
}

/**
 * 주간 뷰의 한 주(월~일, 7칸 고정 — 빈 칸 없음). 소속 달(weekOwnerYearMonth)과 실제 날짜의 달이
 * 다르면(월 경계에 걸친 주) 그 칸만 "M/D"로 표시해 어느 달인지 구분한다.
 */
export function buildWeekCalendarRow(mondayIso: string, daily: DailySummaryResponse[]): CalendarCell[] {
  const dates = weekDates(mondayIso)
  const owner = weekOwnerYearMonth(mondayIso)
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const todayIso = toISODate(new Date())

  return dates.map((iso) => {
    const year = Number(iso.slice(0, 4))
    const month = Number(iso.slice(5, 7))
    const day = Number(iso.slice(8, 10))
    return {
      day,
      isoDate: iso,
      label: year === owner.year && month === owner.month ? String(day) : `${month}/${day}`,
      lines: linesForDay(byDate.get(iso)),
      highlighted: iso === todayIso,
    }
  })
}

function formatMonthDay(iso: string): string {
  return `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`
}

/** 기간 라벨(상단 화살표 옆). 예: '2026년 6월 4주차'. */
export function weekPeriodLabel(mondayIso: string): string {
  const { year, month } = weekOwnerYearMonth(mondayIso)
  return `${year}년 ${month}월 ${weekIndexInMonth(mondayIso)}주차`
}

/** 목록 제목. 예: '6월 4주차 (6.22 – 6.28) 내역'. */
export function weekListTitle(mondayIso: string): string {
  const { month } = weekOwnerYearMonth(mondayIso)
  const sunday = addDays(mondayIso, 6)
  return `${month}월 ${weekIndexInMonth(mondayIso)}주차 (${formatMonthDay(mondayIso)} – ${formatMonthDay(sunday)}) 내역`
}
