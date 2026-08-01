// Source: secret/Asset Manager v14.dc.html L3835-3880 (ledgerCatsRaw/ledgerCategories/subscriptions),
// L4034-4086 (ledgerTx/pagination), L4315-4365 (dailyTotals/monthDays/weekDays), L4595-4603
// (ledgerHeroTitle/ledgerIncomeFmt/etc, mkDelta calls) — transcribed verbatim.

import { fmt } from '../utils/format'
import { mkDelta, type DeltaBadge } from '../utils/deltaBadge'
import type { LedgerPeriod, LedgerRange } from '../state/types'

// ---------- 이번달/올해 수지 하이라이트 (deep-card hero) ----------
export function getLedgerHeroTitle(period: LedgerPeriod): string {
  return period === 'month' ? '6월, 이렇게 돈이 흘렀어요' : '2026년, 이렇게 돈이 흘렀어요'
}
export function getLedgerIncomeFmt(period: LedgerPeriod): string {
  return period === 'month' ? '8,100,000' : '96,400,000'
}
export function getLedgerExpenseFmt(period: LedgerPeriod): string {
  return period === 'month' ? '4,860,000' : '58,900,000'
}
export function getLedgerSavingFmt(period: LedgerPeriod): string {
  return period === 'month' ? '3,240,000' : '37,500,000'
}
export function getLedgerSavingsRateFmt(period: LedgerPeriod): string {
  return period === 'month' ? '40%' : '39%'
}
export function getLedgerIncomeDelta(period: LedgerPeriod): DeltaBadge {
  return period === 'month'
    ? mkDelta('전월 대비 +500,000원', true, '#7FE0B6')
    : mkDelta('작년 대비 +8,900,000원', true, '#7FE0B6')
}
export function getLedgerExpenseDelta(period: LedgerPeriod): DeltaBadge {
  return period === 'month'
    ? mkDelta('전월 대비 +200,000원 (+4.3%)', true, '#F5A29B')
    : mkDelta('작년 대비 −2,100,000원', false, '#F5A29B')
}
export function getLedgerSavingDelta(period: LedgerPeriod): DeltaBadge {
  return period === 'month'
    ? mkDelta('전월 대비 +140,000원', true, '#B9B2F4')
    : mkDelta('작년 대비 +4,300,000원', true, '#B9B2F4')
}

// ---------- 전월 대비 분류별 지출 ----------
const LEDGER_CATS_RAW = [
  { name: '주거', amt: 1340000, prev: 1420000 },
  { name: '식비', amt: 800000, prev: 620000 },
  { name: '여가', amt: 620000, prev: 510000 },
  { name: '기타', amt: 405000, prev: 460000 },
  { name: '교통비', amt: 400000, prev: 450000 },
  { name: '건강/의료', amt: 340000, prev: 300000 },
  { name: '통신비', amt: 250000, prev: 230000 },
  { name: '자기계발', amt: 200000, prev: 160000 },
  { name: '생활용품', amt: 170000, prev: 210000 },
  { name: '꾸밈비', amt: 150000, prev: 125000 },
  { name: '경조사', amt: 100000, prev: 90000 },
  { name: '보험', amt: 85000, prev: 85000 },
]

export interface LedgerCategory {
  name: string
  amt: number
  prev: number
  amtFmt: string
  barPct: number
  changePct: number
  changePctFmt: string
  changeUp: boolean
  changeSign: string
  rampColor: string
}

const RAMP_SCALE = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

function computeLedgerCategories(): LedgerCategory[] {
  const maxCatAmt = Math.max(...LEDGER_CATS_RAW.map((c) => c.amt))
  const cats = LEDGER_CATS_RAW.map((c) => {
    const changePct = Math.round(((c.amt - c.prev) / c.prev) * 1000) / 10
    return {
      ...c,
      amtFmt: fmt(c.amt),
      barPct: Math.round((c.amt / maxCatAmt) * 100),
      changePct,
      changePctFmt: Math.abs(changePct).toFixed(1),
      changeUp: changePct > 0,
      changeSign: changePct > 0 ? '+' : '−',
      rampColor: '',
    }
  }).sort((a, b) => b.amt - a.amt)
  cats.forEach((c, i) => {
    c.rampColor = RAMP_SCALE[Math.min(i, 5)]
  })
  return cats
}

export const ledgerCategories = computeLedgerCategories()

const topIncreaseCat = [...ledgerCategories].sort((a, b) => b.changePct - a.changePct)[0]
export const topIncreaseLabel = topIncreaseCat.name + ' +' + topIncreaseCat.changePctFmt + '%'

// ---------- 구독 · 정기결제 ----------
export interface Subscription {
  id: string
  name: string
  icon: string
  bg: string
  color: string
  day: string
  amt: number
  amtFmt: string
}

const SUBSCRIPTIONS_ALL: Subscription[] = [
  { id: 'sub0', name: '넷플릭스 프리미엄', icon: 'smart_display', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', day: '매월 10일', amt: 17000, amtFmt: fmt(17000) },
  { id: 'sub1', name: '유튜브 프리미엄', icon: 'smart_display', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', day: '매월 15일', amt: 14900, amtFmt: fmt(14900) },
  { id: 'sub2', name: '통신비 (SKT 5G)', icon: 'signal_cellular_alt', bg: 'var(--fill-subtle)', color: 'var(--text-mid)', day: '매월 20일', amt: 68000, amtFmt: fmt(68000) },
]

export function getSubscriptions(endedSubIds: string[]): { subscriptions: Subscription[]; subsTotalFmt: string } {
  const subscriptions = SUBSCRIPTIONS_ALL.filter((x) => !endedSubIds.includes(x.id))
  const subsTotal = subscriptions.reduce((sum, x) => sum + x.amt, 0)
  return { subscriptions, subsTotalFmt: fmt(subsTotal) }
}

// ---------- 내역 (거래 목록) ----------
export interface LedgerTx {
  date: string
  desc: string
  tag: string
  type: 'income' | 'expense' | 'saving' | 'transfer'
  tagBg: string
  tagColor: string
  amt: number
  amount: string
  amountColor: string
  key: string
}

const LEDGER_TX_RAW: Omit<LedgerTx, 'amount' | 'amountColor' | 'key'>[] = [
  { date: '06.25', desc: '급여 입금', tag: '월급', type: 'income', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 8500000 },
  { date: '06.22', desc: '업비트 비트코인 매도', tag: '계좌 이체', type: 'transfer', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 4120000 },
  { date: '06.15', desc: '자유적금 자동이체', tag: '주식', type: 'saving', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 1000000 },
  { date: '06.15', desc: '동료 결혼식 축의금', tag: '경조사', type: 'expense', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 100000 },
  { date: '06.10', desc: '넷플릭스 프리미엄', tag: '구독료', type: 'expense', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 17000 },
  { date: '06.08', desc: '외식 · 식비', tag: '외식', type: 'expense', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 68500 },
  { date: '06.03', desc: '카페', tag: '간식/카페', type: 'expense', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 12400 },
  { date: '06.01', desc: '교통카드 충전', tag: '대중교통', type: 'expense', tagBg: 'var(--fill-subtle)', tagColor: 'var(--text-mid)', amt: 50000 },
]

function computeLedgerTx(deletedTxKeys: string[]): LedgerTx[] {
  return LEDGER_TX_RAW.map((t) => {
    const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''
    const color =
      t.type === 'income' ? 'var(--inc-text)' : t.type === 'expense' ? 'var(--exp-text)' : t.type === 'saving' ? 'var(--sav-text)' : 'var(--text-strong)'
    return { ...t, amount: sign + fmt(t.amt), amountColor: color, key: t.date + '-' + t.desc }
  }).filter((t) => !deletedTxKeys.includes(t.key))
}

const LEDGER_PAGE_SIZE = 5

export function getLedgerPage(deletedTxKeys: string[], range: LedgerRange, page: number) {
  const ledgerTx = computeLedgerTx(deletedTxKeys)
  const ledgerTxFiltered = range === 'week' ? ledgerTx.filter((t) => t.date >= '06.22' && t.date <= '06.28') : ledgerTx
  const totalPages = Math.max(1, Math.ceil(ledgerTxFiltered.length / LEDGER_PAGE_SIZE))
  const pageClamped = Math.min(page || 1, totalPages)
  const ledgerTxPaged = ledgerTxFiltered.slice((pageClamped - 1) * LEDGER_PAGE_SIZE, pageClamped * LEDGER_PAGE_SIZE)
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
  return { ledgerTxPaged, pageNums, pageClamped, totalPages }
}

export function getLedgerRangeLabel(range: LedgerRange): string {
  return range === 'month' ? '2026년 6월' : '2026년 6월 4주차'
}
export function getLedgerListTitle(range: LedgerRange): string {
  return range === 'month' ? '2026년 6월 전체 내역' : '6월 4주차 (6.22 – 6.28) 내역'
}

// ---------- 캘린더 일별 수입/저축/지출 ----------
const DAILY_TOTALS: Record<number, { income?: number; saving?: number; expense?: number }> = {
  8: { expense: 68500 },
  10: { expense: 17000 },
  15: { saving: 1000000 },
  22: { income: 4120000 },
  25: { income: 8500000, saving: 200000, expense: 85000 },
  28: { expense: 2418000 },
}

interface DayLine {
  text: string
  color: string
}

function dayLine(type: 'income' | 'saving' | 'expense', amt: number): DayLine {
  return {
    text: (type === 'expense' ? '−' : '+') + fmt(amt),
    color: type === 'income' ? 'var(--inc-text)' : type === 'saving' ? 'var(--sav-text)' : 'var(--exp-text)',
  }
}

function linesForDay(day: number): DayLine[] {
  const d = DAILY_TOTALS[day]
  if (!d) return []
  const out: DayLine[] = []
  if (d.income) out.push(dayLine('income', d.income))
  if (d.saving) out.push(dayLine('saving', d.saving))
  if (d.expense) out.push(dayLine('expense', d.expense))
  return out
}

export interface CalendarCell {
  day: number
  label: string
  lines: DayLine[]
  highlighted: boolean
}

export const monthDays: CalendarCell[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  return { day, label: String(day), lines: linesForDay(day), highlighted: day === 28 }
})

const WEEK_DAY_DEFS = [
  { day: 23, label: '23 월' },
  { day: 24, label: '24 화' },
  { day: 25, label: '25 수' },
  { day: 26, label: '26 목' },
  { day: 27, label: '27 금' },
  { day: 28, label: '28 토' },
  { day: 22, label: '22 일' },
]

export const weekDays: CalendarCell[] = WEEK_DAY_DEFS.map((w) => ({
  day: w.day,
  label: w.label,
  lines: linesForDay(w.day),
  highlighted: w.day === 28,
}))
