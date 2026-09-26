// 가계부 화면의 뷰모델 레이어 — 서버 응답(GET /transactions, /transactions/summary,
// /transactions/summaries/*, /transactions/rankings, /subscriptions, /categories)을 화면·모달이
// 그릴 형태로 바꾼다.
//
// 아래 막대·순위·링 계산(barPercent, changePercent, changeSign, 램프 색 순서, 저축률 링·막대)은 디자인
// 시스템 규칙이다(ds_rules_v2_5.md §1-6/§3-1/§3-2) — 임의로 바꾸지 말 것.
// 모든 숫자가 서버에서 오므로 각 식에는 0으로 나누기·"이전 값이 0" 방어가 붙어 있다
// (갓 만든 분류는 expenseTotalPrevious가 0이라 그대로 두면 Infinity%가 된다).

import { formatNumber } from '../utils/format'
import { makeDeltaBadge, type DeltaBadge } from '../utils/deltaBadge'
import { addDays, toISODate, weekDates, weekIndexInMonth, monthOfWeek } from '../utils/date'
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
import type { CategoryKind, DateRange, EditableTransactionType, TransactionType } from '@/services/common.type'

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

/** 이체(transfer)는 카테고리가 없다(TRANSFER는 subcategoryId 지정 불가) — 매핑에 없음. */
export const ENTRY_TYPE_TO_CATEGORY_KIND: Record<'income' | 'saving' | 'expense', CategoryKind> = {
  income: 'INCOME',
  saving: 'SAVING',
  expense: 'EXPENSE',
}

/**
 * EntryType(화면 탭 값) ↔ TransactionType(서버 값). ADJUSTMENT(잔액 조정)는 계좌 잔액을 정정할 때
 * 서버가 자동으로 만드는 거래라 화면 탭에 대응하는 값이 없다 — 두 표 모두 사용자가 만들 수 있는
 * 4종만 다룬다.
 *
 * **현재 서버는 ADJUSTMENT를 GET /transactions 응답에서 아예 제외한다**("가계부 거래가 아니라
 * 목록에서 제외한다" — 라이브 OpenAPI). 그래도 이 파일과 Ledger.tsx의 ADJUSTMENT 처리(중립색,
 * 읽기 전용)는 남겨 둔다 — 매매 예수금 정산도 같은 유형을 만들고, 서버가 나중에 내려주기 시작해도
 * 화면이 깨지지 않아야 하기 때문이다.
 */
export const ENTRY_TYPE_TO_TRANSACTION_TYPE: Record<'income' | 'expense' | 'saving' | 'transfer', EditableTransactionType> = {
  income: 'INCOME',
  expense: 'EXPENSE',
  saving: 'SAVING',
  transfer: 'TRANSFER',
}

export const TRANSACTION_TYPE_TO_ENTRY_TYPE: Record<EditableTransactionType, 'income' | 'expense' | 'saving' | 'transfer'> = {
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
 * 딥 카드 증감 배지. hexToRgba/makeDeltaBadge가 요구하는 고정 다크 hex(#7FE0B6/#F5A29B/#B9B2F4)는
 * src/utils/deltaBadge.ts 헤더 주석대로 라이트/다크 무관하게 그대로 쓴다.
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
  let text = `${periodDeltaLabel(period)} 대비 ${sign}${formatNumber(Math.abs(diff))}원`
  if (withPercent && previous !== 0) {
    const percent = Math.round((diff / previous) * 1000) / 10
    // 증감이 작아 0.0%로 반올림되면 부호를 금액 방향(sign)으로 붙이고 '0.1% 미만'으로 적는다 — 예전엔 지출이
    // 늘었는데 '(−0.0%)'로 찍혔다(2026-09-26 통합테스트).
    text += percent === 0 ? ` (${sign}0.1% 미만)` : ` (${sign}${Math.abs(percent).toFixed(1)}%)`
  }
  return makeDeltaBadge(text, up, colorHex)
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
  /** 링 채움용(0~100으로 자름). */
  ratePercent: number
  /** 화면에 적는 실제 저축률 — 100%를 넘을 수 있다(히어로의 서버 저축률과 같은 값). */
  displayPercent: number
  /** SVG strokeDasharray. 링 둘레 100 기준(circumference 100 정규화 — 기존 마크업의 "40 60" 표기와 동일 스케일). */
  dashArray: string
  savingText: string
  expenseText: string
}

/**
 * 저축률이 계산 불가한 기간은 링 게이지 대상에서 제외한다(빈 상태로 치환).
 * 서버는 수입이 0이면 savingsRatePercent를 0이 아니라 null로 내려준다 —
 * null을 그대로 Math.round에 넘기면 0%로 그려져 "저축을 하나도 안 한 달"처럼 보인다.
 */
export function buildSavingsRing(summary: PeriodSummaryResponse): SavingsRingView | null {
  if (summary.incomeTotal === 0 || summary.savingsRatePercent === null) return null
  const ratePercent = Math.max(0, Math.min(100, Math.round(summary.savingsRatePercent)))
  return {
    ratePercent,
    // 링은 100%에서 꽉 차지만 글자는 실제 값을 적는다 — 예전엔 120%를 저축해도 '100%'로 적혀 히어로 숫자와 달랐다.
    displayPercent: Math.round(summary.savingsRatePercent),
    dashArray: `${ratePercent} ${100 - ratePercent}`,
    savingText: formatNumber(summary.savingTotal),
    expenseText: formatNumber(summary.expenseTotal),
  }
}

// ---------- 월별 저축률 막대 ----------

export interface SavingsBar {
  month: number
  /** 0~100. 미래 월은 0(트랙만 표시). */
  percent: number
  isFuture: boolean
  isCurrent: boolean
  /** 막대를 누르면 뜨는 말풍선의 금액 줄에 쓴다(원 단위 그대로). */
  savingTotal: number
  incomeTotal: number
}

/** ds_rules §3-2: 미래(데이터 없는) 월은 트랙만, 진행 중인 현재 월은 막대 + accent 라벨. */
export function buildSavingsBars(monthly: MonthlySummaryResponse[], currentMonth: number): SavingsBar[] {
  return [...monthly]
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const isFuture = m.month > currentMonth
      const percent = !isFuture && m.incomeTotal > 0 ? Math.max(0, Math.min(100, (m.savingTotal / m.incomeTotal) * 100)) : 0
      return { month: m.month, percent, isFuture, isCurrent: m.month === currentMonth, savingTotal: m.savingTotal, incomeTotal: m.incomeTotal }
    })
}

export interface SavingsBarLabel {
  /** "9월 · 9%" */
  title: string
  /** "저축 300,000원 · 수입 3,200,000원" 또는 "수입 없음" */
  detail: string
  /** 스크린리더용 한 문장 */
  ariaLabel: string
}

/**
 * 월별 저축률 막대 말풍선 문구. 비율 표기는 월간 리포트(reportView.ts)와 같은 규칙이다 —
 * 수입이 없어 계산할 수 없는 달은 0%가 아니라 '—', 반올림하면 0%지만 저축이 있으면 '1% 미만'.
 * 막대 높이는 100%에서 자르지만(buildSavingsBars) 여기서는 실제 비율을 그대로 적는다(예: 120%).
 */
export function buildSavingsBarLabel(bar: SavingsBar): SavingsBarLabel {
  const monthText = `${bar.month}월`
  if (bar.incomeTotal <= 0) {
    return { title: `${monthText} · —`, detail: '수입 없음', ariaLabel: `${monthText}, 수입이 없어 저축률을 계산할 수 없어요` }
  }
  const rounded = Math.round((bar.savingTotal / bar.incomeTotal) * 100)
  const rateText = rounded === 0 && bar.savingTotal > 0 ? '1% 미만' : `${rounded}%`
  const detail = `저축 ${formatNumber(bar.savingTotal)}원 · 수입 ${formatNumber(bar.incomeTotal)}원`
  return { title: `${monthText} · ${rateText}`, detail, ariaLabel: `${monthText}, 저축률 ${rateText}, ${detail}` }
}

/**
 * ds_rules §3-2: 저축률 차트에 목표선은 없다 — 기준선이 필요하면 "최근 6개월 평균" 캡션 문장으로만 표기.
 *
 * 지난 6개월 중 **수입이 있던 달만** 평균한다. 수입이 없는 달은 저축률을 계산할 수 없는 달이지(말풍선도
 * '—'로 적는다, buildSavingsBarLabel) 0%인 달이 아니다 — 0%로 넣으면 가계부를 막 시작한 사람이 9%를
 * 저축해도 '평균 2%'로 보였다(2026-09-26 통합테스트). 계산할 달이 하나도 없으면 null(캡션을 숨긴다).
 */
export function computeRecentAverageSavingsRate(bars: SavingsBar[]): number | null {
  const recent = bars.filter((b) => !b.isFuture).slice(-6)
  const measurable = recent.filter((b) => b.incomeTotal > 0)
  if (measurable.length === 0) return null
  return Math.round(measurable.reduce((sum, b) => sum + b.percent, 0) / measurable.length)
}

// ---------- 전월 대비 분류별 지출 랭킹 ----------

// 지출 순위 막대 색. 월간 리포트(reportView.ts)의 지출 상위 3개 막대도 이 배열을 그대로 써서
// 가계부·대시보드·리포트 세 곳의 순위 색이 갈라지지 않게 한다.
export const RAMP_SCALE = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

export interface LedgerCategoryRow {
  categoryId: number
  name: string
  amountText: string
  barPercent: number
  /** expenseTotalPrevious === 0(신규 카테고리) — 증감률 계산 불가. */
  isNew: boolean
  changePercent: number | null
  changePercentText: string | null
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
      const changePercent = isNew ? null : Math.round(((r.expenseTotal - prev) / prev) * 1000) / 10
      return {
        categoryId: r.categoryId,
        name: r.categoryName,
        amountText: formatNumber(r.expenseTotal),
        barPercent: maxAmt > 0 ? Math.round((r.expenseTotal / maxAmt) * 100) : 0,
        isNew,
        changePercent,
        changePercentText: changePercent === null ? null : Math.abs(changePercent).toFixed(1),
        // 0.0%는 늘지도 줄지도 않은 것이라 부호를 붙이지 않는다(예전엔 '−0.0%').
        changeSign: changePercent === null || Math.abs(changePercent) < 0.05 ? '' : changePercent > 0 ? '+' : '−',
        rampColor: RAMP_SCALE[Math.min(i, RAMP_SCALE.length - 1)],
      }
    })
}

/** 상승 폭이 가장 큰 카테고리 라벨. 신규 카테고리(증감률 없음)나 실제로 증가한 곳이 없으면 null(배지 숨김). */
export function pickTopIncreaseLabel(rows: LedgerCategoryRow[]): string | null {
  const candidates = rows.filter((r): r is LedgerCategoryRow & { changePercent: number } => r.changePercent !== null && r.changePercent > 0)
  if (candidates.length === 0) return null
  const top = [...candidates].sort((a, b) => b.changePercent - a.changePercent)[0]
  return `${top.name} +${top.changePercentText}%`
}

export function formatCategoryDetailChange(current: number, previous: number): string {
  if (previous === 0) return '신규 지출'
  const percent = Math.round(((current - previous) / previous) * 1000) / 10
  const sign = percent > 0 ? '+' : '−'
  return `전월 대비 ${sign}${Math.abs(percent).toFixed(1)}%`
}

// ---------- 구독 · 정기결제 / 고정 지출 ----------

export interface SubscriptionRow {
  id: number
  name: string
  icon: string
  dayLabel: string
  /** institutionName 우선, 없으면 계좌명. 계좌를 못 찾으면 빈 문자열(가짜 값 금지). */
  accountLabel: string
  amountText: string
  /** 아래 4개는 표시용이 아니라 수정 모달 프리필 전용 — 서버에 단일 구독 조회가 없어, 이미 이 목록
   * 조회로 받아둔 원본 값을 그대로 재사용한다. */
  amount: number
  paymentDay: number
  accountId: number
  subcategoryId: number
  /** 'YYYY-MM-DD' | null — 수정 모달 프리필용. PUT이 전체 교체라 수정 저장 때 다시 보내야 지워지지 않는다. */
  startedAt: string | null
  /** 아직 시작 전인 항목의 '10월 1일부터' 표기. 이미 시작했거나 시작일이 없으면 null. */
  startsLabel: string | null
}

function accountLabelOf(accountId: number, accounts: AccountResponse[], fallbackName?: string): string {
  const account = accounts.find((a) => a.id === accountId)
  // 계좌 목록을 아직 못 받았거나 해지된 계좌면 서버가 준 accountName으로 대신 적는다.
  return account?.institutionName || account?.name || fallbackName || ''
}

// 서버 icon 값의 허용 집합이 스펙에 없다. Material Symbols 리거처가 아닌 값(예: 'netflix')이 오면
// 폰트가 매칭에 실패해 배지 안에 글자가 그대로 노출된다 — 형태 검증을 통과한 값만 아이콘으로 쓴다.
const MATERIAL_SYMBOL_NAME = /^[a-z0-9_]+$/

/** 아이콘을 고르지 않은(서버 icon이 null이거나 형식이 깨진) 항목의 기본 아이콘. */
export const DEFAULT_SUBSCRIPTION_ICON = 'event_repeat'

function subscriptionIconOf(icon: string | null): string {
  return icon && MATERIAL_SYMBOL_NAME.test(icon) ? icon : DEFAULT_SUBSCRIPTION_ICON
}

/**
 * 고정 지출·구독 추가/수정 모달의 아이콘 선택 창(SubscriptionIconPicker)에 보여줄 아이콘을 분류별로
 * 묶은 것(Material Symbols Rounded 이름). 서버는 icon을 자유 문자열로 받지만 사용자가 이름을 직접 칠
 * 수는 없으니 이 목록으로 제안한다(2026-09-26 사용자 요청). 폰트는 서브셋하지 않은 전체 글꼴이라
 * (fonts.css) 아무 이름이나 렌더되고, 여기 없는 이름이 서버에 저장돼 있어도 목록 화면은 그대로
 * 그린다 — 이 목록은 '고를 수 있는 것'이지 '허용되는 것'이 아니다. label은 스크린리더·툴팁용.
 */
export interface SubscriptionIconGroup {
  label: string
  icons: { name: string; label: string }[]
}

export const SUBSCRIPTION_ICON_GROUPS: SubscriptionIconGroup[] = [
  {
    label: '생활·주거',
    icons: [
      { name: DEFAULT_SUBSCRIPTION_ICON, label: '기본' },
      { name: 'home', label: '월세·집' },
      { name: 'apartment', label: '관리비' },
      { name: 'bolt', label: '전기' },
      { name: 'water_drop', label: '수도' },
      { name: 'local_fire_department', label: '가스' },
      { name: 'heat_pump', label: '냉난방' },
      { name: 'cleaning_services', label: '청소' },
      { name: 'local_laundry_service', label: '세탁' },
      { name: 'chair', label: '가구·렌탈' },
      { name: 'key', label: '보관·열쇠' },
      { name: 'construction', label: '수리' },
    ],
  },
  {
    label: '통신·IT',
    icons: [
      { name: 'smartphone', label: '휴대폰' },
      { name: 'phone_iphone', label: '아이폰' },
      { name: 'sim_card', label: '유심·요금제' },
      { name: 'wifi', label: '인터넷' },
      { name: 'router', label: '공유기' },
      { name: 'cloud', label: '클라우드' },
      { name: 'computer', label: '컴퓨터' },
      { name: 'laptop_mac', label: '노트북' },
      { name: 'vpn_key', label: 'VPN·보안' },
      { name: 'code', label: '개발 도구' },
      { name: 'work', label: '업무 도구' },
      { name: 'smart_toy', label: 'AI' },
    ],
  },
  {
    label: '금융·보험',
    icons: [
      { name: 'shield', label: '보험' },
      { name: 'health_and_safety', label: '건강보험' },
      { name: 'account_balance', label: '대출·은행' },
      { name: 'real_estate_agent', label: '주택대출' },
      { name: 'credit_card', label: '카드' },
      { name: 'savings', label: '저금' },
      { name: 'payments', label: '납부' },
      { name: 'receipt_long', label: '세금·고지서' },
      { name: 'request_quote', label: '할부' },
      { name: 'currency_exchange', label: '환전·해외' },
    ],
  },
  {
    label: '교통',
    icons: [
      { name: 'directions_car', label: '자동차' },
      { name: 'directions_bus', label: '버스' },
      { name: 'subway', label: '지하철' },
      { name: 'train', label: '기차' },
      { name: 'local_taxi', label: '택시' },
      { name: 'local_gas_station', label: '주유' },
      { name: 'ev_station', label: '전기차 충전' },
      { name: 'local_parking', label: '주차' },
      { name: 'two_wheeler', label: '오토바이' },
      { name: 'flight', label: '항공' },
    ],
  },
  {
    label: '건강·운동',
    icons: [
      { name: 'fitness_center', label: '헬스' },
      { name: 'directions_run', label: '러닝' },
      { name: 'pool', label: '수영' },
      { name: 'sports_tennis', label: '테니스' },
      { name: 'sports_golf', label: '골프' },
      { name: 'self_improvement', label: '요가·명상' },
      { name: 'spa', label: '마사지·스파' },
      { name: 'medical_services', label: '병원' },
      { name: 'local_hospital', label: '의료' },
      { name: 'medication', label: '약' },
    ],
  },
  {
    label: '교육·가족',
    icons: [
      { name: 'school', label: '학원·교육' },
      { name: 'menu_book', label: '책' },
      { name: 'child_care', label: '육아' },
      { name: 'family_restroom', label: '가족' },
      { name: 'elderly', label: '부모님' },
      { name: 'pets', label: '반려동물' },
      { name: 'favorite', label: '모임·데이트' },
      { name: 'cake', label: '기념일' },
      { name: 'volunteer_activism', label: '기부·후원' },
      { name: 'church', label: '헌금' },
    ],
  },
  {
    label: '구독·엔터',
    icons: [
      { name: 'movie', label: '영화·OTT' },
      { name: 'smart_display', label: '동영상' },
      { name: 'live_tv', label: 'TV' },
      { name: 'theaters', label: '공연' },
      { name: 'music_note', label: '음악' },
      { name: 'headphones', label: '오디오' },
      { name: 'podcasts', label: '팟캐스트' },
      { name: 'auto_stories', label: '웹툰·전자책' },
      { name: 'newspaper', label: '뉴스' },
      { name: 'sports_esports', label: '게임' },
      { name: 'photo_camera', label: '사진' },
      { name: 'palette', label: '디자인' },
    ],
  },
  {
    label: '쇼핑·음식',
    icons: [
      { name: 'shopping_cart', label: '쇼핑 멤버십' },
      { name: 'shopping_bag', label: '쇼핑' },
      { name: 'storefront', label: '마트' },
      { name: 'redeem', label: '선물' },
      { name: 'local_cafe', label: '카페' },
      { name: 'restaurant', label: '식사' },
      { name: 'delivery_dining', label: '배달' },
      { name: 'fastfood', label: '패스트푸드' },
      { name: 'local_pizza', label: '피자' },
      { name: 'bakery_dining', label: '빵' },
      { name: 'local_bar', label: '술' },
      { name: 'lunch_dining', label: '도시락' },
    ],
  },
]

/** 아이콘 이름 → 사람이 읽는 이름. 목록에 없는(서버에 따로 저장된) 이름이면 null. */
export function subscriptionIconLabel(name: string): string | null {
  for (const group of SUBSCRIPTION_ICON_GROUPS) {
    const found = group.icons.find((i) => i.name === name)
    if (found) return found.label
  }
  return null
}

/**
 * 고정 지출·구독 카드의 '월 N원'과 그 아래 '다음 달부터 +N원 예정'.
 *
 * - thisMonth: 이번 정산월 안에 시작했거나(시작일 ≤ 이번 정산월 마지막 날) 시작일이 없는 항목 — 목록에서
 *   '지금 매달 나가는 돈'이다.
 * - nextMonth: 시작일이 **바로 다음 정산월** 안에 있는 항목. 카드 아래에 가볍게 '예정'으로만 알린다.
 * - 그보다 더 뒤에 시작하는 항목은 어느 합계에도 넣지 않는다(목록에는 '○월 ○일부터'로 남는다).
 *
 * 예전엔 활성 항목을 전부 더해, 다음 달부터 시작하는 구독을 등록하면 이번 달 합계가 바로 늘었다
 * (2026-09-26 통합테스트, 사용자 결정). 서버 GET /subscriptions/summary는 고정·구독을 나눠 주지 않고
 * '이번 정산월에 실제 결제된 금액'(오늘 종료한 항목도 포함)이라 카드별 합계·목록 합과 맞지 않아 쓰지 않는다.
 */
export function buildRecurringTotals(
  subscriptions: SubscriptionResponse[],
  currentPeriod: DateRange,
  nextPeriod: DateRange,
): { thisMonth: number; nextMonth: number } {
  let thisMonth = 0
  let nextMonth = 0
  for (const s of subscriptions) {
    if (!s.startedAt || s.startedAt <= currentPeriod.to) thisMonth += s.amount
    else if (s.startedAt >= nextPeriod.from && s.startedAt <= nextPeriod.to) nextMonth += s.amount
  }
  return { thisMonth, nextMonth }
}

function startsLabelOf(startedAt: string | null, todayIso: string): string | null {
  if (!startedAt || startedAt <= todayIso) return null
  const [y, m, d] = startedAt.split('-').map(Number)
  // 올해가 아니면 연도를 붙인다 — '1월 1일부터'만 보면 올해 1월(이미 지남)로 읽힌다.
  const yearText = y !== Number(todayIso.slice(0, 4)) ? `${y}년 ` : ''
  return `${yearText}${m}월 ${d}일부터`
}

export function buildSubscriptionRows(
  subscriptions: SubscriptionResponse[],
  accounts: AccountResponse[],
  todayIso: string = toISODate(new Date()),
): SubscriptionRow[] {
  // 결제일 오름차순(10일 → 15일 → 20일) — 금액순이 아니다.
  return [...subscriptions]
    .sort((a, b) => a.paymentDay - b.paymentDay)
    .map((s) => ({
      id: s.id,
      name: s.name,
      icon: subscriptionIconOf(s.icon),
      dayLabel: `매월 ${s.paymentDay}일`,
      accountLabel: accountLabelOf(s.accountId, accounts, s.accountName),
      amountText: formatNumber(s.amount),
      amount: s.amount,
      paymentDay: s.paymentDay,
      accountId: s.accountId,
      subcategoryId: s.subcategoryId,
      startedAt: s.startedAt,
      startsLabel: startsLabelOf(s.startedAt, todayIso),
    }))
}

// ---------- 내역(거래 목록) ----------

export interface LedgerTransactionRow {
  id: number
  /** 'YYYY-MM-DD' — 수정 모달을 열 때 날짜를 프리필하는 데 쓴다(isoDateToDisplay와 함께). */
  isoDate: string
  dateLabel: string
  description: string
  tag: string
  type: TransactionType
  amount: string
  amountColor: string
  key: string
  /** 아래 4개는 표시용이 아니라 수정 모달 프리필 전용 — 이미 이 목록 조회로 받아둔 원본 값을 그대로
   * 재사용한다(클릭 시점에 이미 화면에 떠 있는 값이라 단건 재조회가 불필요하다). */
  accountId: number
  subcategoryId: number | null
  transferAccountId: number | null
  amountRaw: number
  /** 목록에 "메모 있음" 표시를 하고, 수정 모달을 열 때 entryMemo 프리필에 쓴다(입력 UI가 있어
   * 더 이상 보존 전용이 아니다). */
  memo: string | null
}

const TX_TYPE_COLOR: Record<TransactionType, string> = {
  INCOME: 'var(--inc-text)',
  EXPENSE: 'var(--exp-text)',
  SAVING: 'var(--sav-text)',
  TRANSFER: 'var(--text-strong)',
  // 잔액 조정은 수입도 지출도 아니다(수지 집계에서 빠지고 총자산에만 반영된다) — 이체와 마찬가지로
  // 전용 색 없이 중립색으로 둔다. 현재 서버는 목록에서 제외하므로 실제로는 쓰이지 않지만,
  // Record가 TransactionType 전부를 요구하고 방어용으로도 필요해 남겨 둔다.
  ADJUSTMENT: 'var(--text-strong)',
  // 환전도 수입·지출이 아니라 통화만 바뀌는 이동이라 중립색이다.
  EXCHANGE: 'var(--text-strong)',
}

function shortDateLabel(isoDate: string): string {
  return isoDate.slice(5).replace('-', '.')
}

/**
 * TRANSFER는 subcategoryName이 없어 상대 계좌명을 태그로 쓴다 — 서버가 주는 transferAccountName을 먼저 쓰고,
 * 없으면(옛 응답) 계좌 목록과 transferAccountId로 조인한다. 둘 다 없으면 "계좌 이체"로 폴백.
 */
export function buildLedgerTransactions(transactions: TransactionResponse[], accounts: AccountResponse[]): LedgerTransactionRow[] {
  return transactions.map((t) => {
    const sign = t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '−' : ''
    const tag =
      t.type === 'TRANSFER'
        ? (t.transferAccountName ?? accounts.find((a) => a.id === t.transferAccountId)?.name ?? '계좌 이체')
        : (t.subcategoryName ?? '')
    return {
      id: t.id,
      isoDate: t.transactionDate,
      dateLabel: shortDateLabel(t.transactionDate),
      description: t.description,
      tag,
      type: t.type,
      amount: sign + formatNumber(t.amount),
      amountColor: TX_TYPE_COLOR[t.type],
      key: String(t.id),
      accountId: t.accountId,
      subcategoryId: t.subcategoryId,
      transferAccountId: t.transferAccountId,
      amountRaw: t.amount,
      memo: t.memo,
    }
  })
}

// ---------- 입력 모달: 최근 내역 기반 추천 ----------
//
// 서버 GET /transactions에는 제목(description) 검색이 없어(조건은 정산월·날짜 구간·유형·소분류·계좌뿐),
// 입력 모달이 최근 N개월치를 한 번 받아 두고 브라우저에서 제목을 비교한다. "거의 같은 제목"은
// 공백·대소문자를 무시한 포함 일치로 잡고, 앞부분이 일치하는 것을 먼저 보여준다. 같은 제목은 가장 최근
// 거래 하나로 합친다(금액은 그 최근 값). 사용자가 칩을 눌렀을 때만 채우고, 자동으로 채우지는 않는다 —
// 엉뚱한 값이 들어가면 지우는 쪽이 더 번거롭다(사용자 결정).

export interface EntrySuggestion {
  key: string
  description: string
  amount: number
  /** 칩 꼬리표 — 수입·지출·저축은 소분류명, 이체는 상대 계좌명(없으면 빈 문자열). */
  tag: string
  accountId: number
  subcategoryId: number | null
  transferAccountId: number | null
}

/** 이 글자 수(공백 제거 기준) 미만이면 추천하지 않는다 — 한 글자는 거의 모든 내역에 걸려 소음만 된다. */
export const ENTRY_SUGGESTION_MIN_CHARS = 2
export const ENTRY_SUGGESTION_LIMIT = 3

function normalizeDescription(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

/**
 * 입력 중인 제목(query)과 비슷한 최근 거래를 최대 limit개 고른다. 현재 입력 유형(txType)과 같은 거래만
 * 본다 — 지출 입력 중에 수입 내역이 추천되면 소분류 종류(CategoryKind)가 달라 채울 수 없기 때문이다.
 * transactions는 최신순이라고 가정하지 않고 여기서 다시 정렬한다(서버 기본 정렬이 바뀌어도 안전하게).
 */
export function buildEntrySuggestions(
  transactions: TransactionResponse[],
  accounts: AccountResponse[],
  query: string,
  txType: EditableTransactionType,
  limit: number = ENTRY_SUGGESTION_LIMIT,
): EntrySuggestion[] {
  const q = normalizeDescription(query)
  if (q.length < ENTRY_SUGGESTION_MIN_CHARS) return []

  const sorted = transactions
    .filter((t) => t.type === txType)
    .slice()
    .sort((a, b) => (a.transactionDate === b.transactionDate ? b.id - a.id : a.transactionDate < b.transactionDate ? 1 : -1))

  const seen = new Set<string>()
  const prefix: EntrySuggestion[] = []
  const contains: EntrySuggestion[] = []
  for (const t of sorted) {
    const n = normalizeDescription(t.description)
    if (!n || seen.has(n) || !n.includes(q)) continue
    seen.add(n)
    const tag =
      t.type === 'TRANSFER'
        ? (accounts.find((a) => a.id === t.transferAccountId)?.name ?? '')
        : (t.subcategoryName ?? '')
    const item: EntrySuggestion = {
      key: String(t.id),
      description: t.description.trim(),
      amount: t.amount,
      tag,
      accountId: t.accountId,
      subcategoryId: t.subcategoryId,
      transferAccountId: t.transferAccountId,
    }
    ;(n.startsWith(q) ? prefix : contains).push(item)
    if (prefix.length >= limit) break
  }
  return [...prefix, ...contains].slice(0, limit)
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
  /**
   * 기간 합계(sumCalendarTotals) 계산용 원본 금액. lines는 이미 포맷된 문자열이라 더할 수 없고,
   * 합계를 서버 응답에서 따로 다시 계산하면 "달력에 그려진 칸"과 "상단 합계"가 어긋날 수 있다
   * (월간은 정산월 경계 때문에 그리지 못하고 버리는 날짜가 있다 — buildMonthCalendarRows 주석).
   * 그려지는 셀 자체에 숫자를 실어 두 값이 구조적으로 같아지게 한다.
   */
  income: number
  expense: number
  highlighted: boolean
}

function dayLine(kind: 'income' | 'saving' | 'expense' | 'transfer', amount: number): DayLine {
  // 이체는 부호를 붙이지 않는다 — 번 돈도 쓴 돈도 아니고 내 계좌 사이를 옮겨간 것이라
  // +/−를 붙이면 수입·지출처럼 읽힌다. 대신 방향 기호(⇄)를 앞에 달아 한눈에 구분되게 한다.
  const sign = kind === 'income' ? '+' : kind === 'expense' ? '−' : kind === 'transfer' ? '⇄ ' : ''
  return {
    text: sign + formatNumber(amount),
    // 이체는 디자인 시스템에 전용 색이 없다(CLAUDE.md 도메인 컨텍스트) — 수입·지출·저축보다
    // 한 톤 낮은 --text-mid로 렌더해 세 종류의 색 대비를 흐리지 않게 한다.
    color:
      kind === 'income' ? 'var(--inc-text)'
      : kind === 'saving' ? 'var(--sav-text)'
      : kind === 'transfer' ? 'var(--text-mid)'
      : 'var(--exp-text)',
  }
}

/**
 * 날짜별 이체 합계. 서버의 일별 요약(GET /transactions/summaries/daily)은 수입·지출·저축 세 가지만
 * 내려주므로(DailySummaryResponse) 이체는 거래 목록에서 따로 받아 여기서 날짜별로 합산한다.
 * 서버가 일별 요약에 이체 합계를 추가해주면 이 함수와 별도 조회는 지울 수 있다.
 */
export function buildTransferTotalsByDate(txs: TransactionResponse[]): Map<string, number> {
  const byDate = new Map<string, number>()
  txs.forEach((t) => {
    if (t.type !== 'TRANSFER') return
    byDate.set(t.transactionDate, (byDate.get(t.transactionDate) ?? 0) + t.amount)
  })
  return byDate
}

function linesForDay(d: DailySummaryResponse | undefined, transferAmt: number): DayLine[] {
  const out: DayLine[] = []
  if (d) {
    if (d.incomeAmount > 0) out.push(dayLine('income', d.incomeAmount))
    if (d.savingAmount > 0) out.push(dayLine('saving', d.savingAmount))
    if (d.expenseAmount > 0) out.push(dayLine('expense', d.expenseAmount))
  }
  // 이체는 늘 마지막 줄 — 네 종류가 모두 있는 날에도 수입·지출·저축이 먼저 눈에 들어와야 한다.
  if (transferAmt > 0) out.push(dayLine('transfer', transferAmt))
  return out
}

export interface MonthCalendarResult {
  rows: (CalendarCell | null)[][]
  /**
   * true면 daily 응답에 이 달력 격자(정산월 첫날~마지막 날)에 속하지 않는 날짜가 섞여 있었다는 뜻.
   * 격자를 서버와 같은 정산월 경계로 그리므로 정상이라면 생기지 않는다 — 서버 라벨링 규칙이 바뀌어
   * settlementPeriodOf(date.ts)와 어긋났을 때를 위한 방어로 남겨 두고, 그땐 화면에 캡션으로 알린다.
   */
  hasOutOfGridData: boolean
}

/**
 * 정산월 달력 격자. 칸은 정산월 첫날(period.from)부터 마지막 날(period.to)까지이고, 월요일 시작
 * 주 단위로 앞뒤를 빈 칸(null)으로 채워 항상 7칸 행으로 떨어지게 한다. monthStartDay가 1이면 예전처럼
 * 그 달 1일~말일 격자와 같다.
 *
 * 월 시작일이 1이 아니면 격자가 두 달력월에 걸친다(예: 28일 시작 → 8/28~9/27). 날짜 숫자만 보면
 * 어느 달인지 헷갈리므로 정산월 첫날과 달력월이 바뀌는 1일에는 'M/D'로 달을 붙인다.
 *
 * 거래가 없는 날은 응답 배열에서 빠질 수 있으므로(transaction.type.ts 주석) 날짜 축은 여기서 채운다.
 */
export function buildMonthCalendarRows(
  period: DateRange,
  daily: DailySummaryResponse[],
  transferByDate: Map<string, number>,
): MonthCalendarResult {
  const byDate = new Map<string, DailySummaryResponse>()
  let hasOutOfGridData = false
  daily.forEach((d) => {
    if (d.date < period.from || d.date > period.to) {
      hasOutOfGridData = true
      return
    }
    byDate.set(d.date, d)
  })

  const todayIso = toISODate(new Date())
  const startsMidMonth = period.from.slice(8, 10) !== '01'

  const cells: (CalendarCell | null)[] = []
  const startDow = (new Date(`${period.from}T00:00:00`).getDay() + 6) % 7 // 월요일 시작 격자(firstWeekday와 같은 기준)
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let iso = period.from; iso <= period.to; iso = addDays(iso, 1)) {
    const day = Number(iso.slice(8, 10))
    const showMonth = startsMidMonth && (iso === period.from || day === 1)
    const d = byDate.get(iso)
    cells.push({
      day,
      isoDate: iso,
      label: showMonth ? `${Number(iso.slice(5, 7))}/${day}` : String(day),
      lines: linesForDay(d, transferByDate.get(iso) ?? 0),
      income: d?.incomeAmount ?? 0,
      expense: d?.expenseAmount ?? 0,
      highlighted: iso === todayIso,
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (CalendarCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return { rows, hasOutOfGridData }
}

/**
 * 주간 뷰의 한 주(월~일, 7칸 고정 — 빈 칸 없음). 소속 달(monthOfWeek)과 실제 날짜의 달이
 * 다르면(월 경계에 걸친 주) 그 칸만 "M/D"로 표시해 어느 달인지 구분한다.
 */
export function buildWeekCalendarRow(
  mondayIso: string,
  daily: DailySummaryResponse[],
  transferByDate: Map<string, number>,
): CalendarCell[] {
  const dates = weekDates(mondayIso)
  const owner = monthOfWeek(mondayIso)
  const byDate = new Map(daily.map((d) => [d.date, d]))
  const todayIso = toISODate(new Date())

  return dates.map((iso) => {
    const year = Number(iso.slice(0, 4))
    const month = Number(iso.slice(5, 7))
    const day = Number(iso.slice(8, 10))
    const d = byDate.get(iso)
    return {
      day,
      isoDate: iso,
      label: year === owner.year && month === owner.month ? String(day) : `${month}/${day}`,
      lines: linesForDay(d, transferByDate.get(iso) ?? 0),
      income: d?.incomeAmount ?? 0,
      expense: d?.expenseAmount ?? 0,
      highlighted: iso === todayIso,
    }
  })
}

export interface CalendarTotals {
  income: number
  expense: number
}

/**
 * 달력 우측 상단에 띄우는 기간(주/월) 수입·지출 합계. **달력에 실제로 그려진 칸만** 더한다 —
 * 그래야 칸을 눈으로 다 더한 값과 상단 합계가 항상 일치한다(월간은 정산월 경계 때문에 격자에
 * 넣지 못한 날짜가 있을 수 있고, 그 사실은 hasOutOfGridData 캡션이 따로 안내한다).
 * 저축·이체는 제외한다(사용자 결정) — 달력 칸에는 그대로 4종이 모두 그려진다.
 * 빈 칸(null)은 건너뛴다.
 */
export function sumCalendarTotals(cells: (CalendarCell | null)[]): CalendarTotals {
  return cells.reduce<CalendarTotals>(
    (acc, cell) => (cell ? { income: acc.income + cell.income, expense: acc.expense + cell.expense } : acc),
    { income: 0, expense: 0 },
  )
}

function formatMonthDay(iso: string): string {
  return `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`
}

/** 기간 라벨(상단 화살표 옆). 예: '2026년 6월 4주차'. 몇 월·몇째 주는 정산월 기준(monthOfWeek 주석). */
export function weekPeriodLabel(mondayIso: string, monthStartDay: number): string {
  const { year, month } = monthOfWeek(mondayIso, monthStartDay)
  return `${year}년 ${month}월 ${weekIndexInMonth(mondayIso, monthStartDay)}주차`
}

/**
 * 달력에서 하루를 골랐을 때 목록 제목. 예: '8월 12일 (수) 내역'.
 * 요일까지 붙이는 이유는 사용자가 고른 칸이 맞는지 목록 제목만 보고 확인할 수 있어야 하기 때문이다.
 */
export function dayListTitle(iso: string): string {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(`${iso}T00:00:00`).getDay()]
  return `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일 (${weekday}) 내역`
}

/** 목록 제목. 예: '6월 4주차 (6.22 – 6.28) 내역'. 몇 월·몇째 주는 정산월 기준. */
export function weekListTitle(mondayIso: string, monthStartDay: number): string {
  const { month } = monthOfWeek(mondayIso, monthStartDay)
  const sunday = addDays(mondayIso, 6)
  return `${month}월 ${weekIndexInMonth(mondayIso, monthStartDay)}주차 (${formatMonthDay(mondayIso)} – ${formatMonthDay(sunday)}) 내역`
}
