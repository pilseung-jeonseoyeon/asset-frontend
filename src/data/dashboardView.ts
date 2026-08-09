// View-model layer for the 대시보드(Dashboard) screen: adapts GET /dashboard/{summary,trend,
// allocation,reports}, GET /goals, GET /assets/distribution?groupBy=INSTITUTION into the shapes the
// screen renders (API-SPEC §4 · §5 · §3.1).
//
// 화면(src/screens/Dashboard/Dashboard.tsx)은 아직 src/data/mockDashboard.ts를 쓰고 있다 —
// 모바일 대응 작업과 파일이 겹쳐 이번에는 데이터 레이어만 준비했다. 화면을 붙일 때 훅만
// 갈아끼울 수 있도록 반환 타입의 필드명을 mockDashboard.ts와 맞춰 두었다.
//
// 여기 없는 것과 그 이유:
//   - "약 12억 8,450만 원" 같은 억/만 축약 캡션: 목업마다 하드코딩된 리터럴이고 공용 계산 함수가
//     없다(CLAUDE.md). 임의로 축약 헬퍼를 만들지 않았다.
//   - 추이 차트의 y축 눈금 라벨(13억/11억/9억): 같은 이유로 생략했다.
//   - "7월 이후는 예정 구간" 같은 미래 구간 표기: 서버가 예측값을 주지 않는다.

import { fmt } from '../utils/format'
import { ASSET_CLASS_META } from './assetsView'
import type {
  AllocationResponse,
  DashboardSummaryResponse,
  MonthlyReportResponse,
  TrendPointResponse,
} from '@/services/dashboard'
import type { AssetInstitutionGroup } from '@/services/asset'
import type { GoalResponse } from '@/services/goal'
import type { InstitutionResponse } from '@/services/institution'

// assetsView.ts에도 같은 배열이 있지만 그쪽은 export하지 않는다. 도넛/트리맵이 공유하는
// 디자인 토큰 순서(ds_rules §1-6의 ramp 순서)라 값이 갈라지면 두 화면의 색이 어긋난다 —
// 한쪽을 고치면 반드시 다른 쪽도 함께 고칠 것.
const RAMP = [
  'var(--ramp-1)',
  'var(--ramp-2)',
  'var(--ramp-3)',
  'var(--ramp-4)',
  'var(--ramp-5)',
  'var(--ramp-6)',
]

// ---------- 히어로: 총자산과 증감 ----------

export interface DashboardHeroView {
  totalAssetKrw: number
  totalFmt: string
  /** 이번 정산월 시작일 대비. 음수 가능. */
  monthChangeKrw: number
  monthChangeFmt: string
  /** 올해 1월 1일 대비. 음수 가능. */
  yearChangeKrw: number
  yearChangeFmt: string
  /** 스냅샷 이력이 아예 없는 신규 사용자 — 0원을 "자산 0원"으로 단정하지 말고 빈 상태로 안내할 것. */
  isEmpty: boolean
}

/** 증감액은 부호를 명시적으로 붙인다(히어로/딥카드 배지 규칙). */
function signedFmt(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${fmt(Math.abs(n))}`
}

export function buildDashboardHero(summary: DashboardSummaryResponse): DashboardHeroView {
  return {
    totalAssetKrw: summary.totalAssetKrw,
    totalFmt: fmt(summary.totalAssetKrw),
    monthChangeKrw: summary.monthChangeKrw,
    monthChangeFmt: signedFmt(summary.monthChangeKrw),
    yearChangeKrw: summary.yearChangeKrw,
    yearChangeFmt: signedFmt(summary.yearChangeKrw),
    isEmpty: summary.totalAssetKrw === 0,
  }
}

// ---------- 총자산 추이 스파크라인 ----------

export interface TrendChartView {
  /** SVG path의 d 속성. 점이 2개 미만이면 null(선을 그릴 수 없음). */
  path: string | null
  /** 마지막 점의 좌표 — 원본 마크업이 여기에 강조용 원을 찍는다. */
  lastPoint: { x: number; y: number } | null
  /** 원본 응답 순서 그대로의 날짜 축(x축 라벨용). */
  dates: string[]
}

/**
 * 스냅샷 추이를 viewBox 좌표계로 정규화한다.
 *
 * 주의: `unit=MONTH`로 받은 응답의 `date`는 그 달의 말일이 아니라 **데이터가 있는 마지막
 * 날짜**다(API-SPEC §4.2). 이 함수는 날짜를 등간격으로만 배치하므로 화면에서 "월말 값"이라고
 * 라벨링하지 말 것.
 */
export function buildTrendChart(
  points: TrendPointResponse[],
  width = 600,
  height = 92,
  padding = 6,
): TrendChartView {
  const dates = points.map((p) => p.date)
  if (points.length < 2) return { path: null, lastPoint: null, dates }

  const values = points.map((p) => p.totalValueKrw)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const usable = height - padding * 2

  const coords = points.map((p, i) => {
    const x = (width * i) / (points.length - 1)
    // 값이 전부 같으면(span 0) 0으로 나누지 말고 가운데 높이에 평평하게 그린다.
    const ratio = span === 0 ? 0.5 : (p.totalValueKrw - min) / span
    // SVG는 y가 아래로 커지므로 값이 클수록 y가 작아야 한다.
    const y = padding + usable * (1 - ratio)
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  })

  return {
    path: coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x} ${c.y}`).join(' '),
    lastPoint: coords[coords.length - 1],
    dates,
  }
}

// ---------- 자산 구성 도넛 ----------

export interface DonutLegendItem {
  label: string
  pct: number
  color: string
  showLegend: boolean
}

/**
 * 반올림해도 합이 정확히 100이 되도록 최대잔여법(largest remainder)으로 배분한다.
 * 단순 반올림만 하면 도넛의 dasharray 합이 99나 101이 되어 마지막 조각에 틈이 생긴다.
 */
function toPercentages(values: number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0)
  if (total <= 0) return values.map(() => 0)

  const exact = values.map((v) => (v / total) * 100)
  const floors = exact.map((v) => Math.floor(v))
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0)

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)

  const result = [...floors]
  for (const { i } of order) {
    if (remainder <= 0) break
    result[i] += 1
    remainder -= 1
  }
  return result
}

/**
 * 도넛 세그먼트. `/dashboard/allocation`에는 `assetClassName`(한글 라벨)이 없으므로
 * (§3.1의 자산 구성 응답과 다르다) `ASSET_CLASS_META`의 labelFallback을 쓴다.
 *
 * `showLegend`: 원본 마크업이 6개 조각 중 최하위 1개에만 범례 행을 두지 않았다
 * (mockDashboard.ts의 전사 주석 참고 — ds_rules §1-5 "receded value"). 조각이 6개 이상일 때만
 * 그 규칙을 적용하고, 그보다 적으면 전부 범례를 노출한다.
 */
export function buildAllocationSegments(allocation: AllocationResponse[]): DonutLegendItem[] {
  const sorted = [...allocation]
    .filter((a) => a.totalValueKrw > 0)
    .sort((a, b) => b.totalValueKrw - a.totalValueKrw)
  const pcts = toPercentages(sorted.map((a) => a.totalValueKrw))

  return sorted.map((a, i) => ({
    // 서버가 6분류에 없는 코드를 내려주면(UNMAPPED_ACCOUNT_TYPE급 서버 버그) 매핑이 undefined가
    // 되어 화면이 통째로 죽는다 — 라벨만 코드값으로 폴백하고 나머지는 그대로 그린다.
    label: ASSET_CLASS_META[a.assetClass]?.labelFallback ?? a.assetClass,
    pct: pcts[i],
    color: RAMP[Math.min(i, RAMP.length - 1)],
    showLegend: sorted.length < 6 || i < sorted.length - 1,
  }))
}

/** "최대 비중 연금·기타 23%" 캡션용. 항목이 없으면 null(캡션 자체를 그리지 않을 것). */
export function pickTopAllocation(segments: DonutLegendItem[]): DonutLegendItem | null {
  return segments[0] ?? null
}

// ---------- 주요 자산 보관처 ----------

export interface DashboardInstitutionView {
  /** 기관 미연결 버킷은 institutionId가 null이라 key로 쓸 수 없다 — 여기서 안정적인 문자열로 만든다. */
  key: string
  /** BankIcon용. 서버 institution.icon을 그대로 쓰고, 못 찾으면 빈 문자열(기본 아이콘 폴백). */
  tokenKey: string
  name: string
  amount: number
  amountFmt: string
}

/**
 * `/assets/distribution?groupBy=INSTITUTION` 결과를 금액 내림차순으로 정리한다.
 * 아이콘 키는 이 응답에 없어 `GET /institutions`와 institutionId로 조인한다 — 조인에 실패하면
 * 빈 문자열로 두고 BankIcon의 기본 아이콘 폴백에 맡긴다(가짜 값 금지).
 */
export function buildDashboardInstitutions(
  groups: AssetInstitutionGroup[],
  institutions: InstitutionResponse[],
  limit = 4,
): DashboardInstitutionView[] {
  return [...groups]
    .sort((a, b) => b.totalValueKrw - a.totalValueKrw)
    .slice(0, limit)
    .map((g) => {
      const institution =
        g.institutionId === null
          ? undefined
          : institutions.find((i) => i.id === g.institutionId)
      return {
        key: g.institutionId === null ? 'unassigned' : String(g.institutionId),
        tokenKey: institution?.icon ?? '',
        name: g.institutionName ?? '미지정',
        amount: g.totalValueKrw,
        amountFmt: fmt(g.totalValueKrw),
      }
    })
}

// ---------- 자산 목표 위젯 ----------

export interface AssetGoalView {
  id: 'annual' | 'monthly'
  name: string
  current: number
  target: number
  color: string
  pct: number
  /** 진행률 바 길이. progressPercent는 100을 넘을 수 있어(clamp 안 함) 여기서만 잘라 쓴다. */
  barPct: number
  currentFmt: string
  targetFmt: string
  subCaption: string
}

/** 목표 시점까지 남은 일수. targetDate가 null(목표 미설정)이면 null. */
export function goalDDay(targetDate: string | null, today: Date = new Date()): number | null {
  if (!targetDate) return null
  // LocalDate는 타임존이 없다. 로컬 자정 기준으로 날짜끼리만 뺀다.
  const [y, m, d] = targetDate.split('-').map(Number)
  const target = new Date(y, m - 1, d).getTime()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((target - base) / 86_400_000)
}

/**
 * 대시보드 "자산 목표" 위젯 두 줄. 서버 GoalsRes의 annual/monthly가 각 줄에 그대로 대응한다.
 * 서브 캡션의 계산식은 API-SPEC §5.1 각주에 명시된 것만 쓴다(D-Day, 월 필요 저축, 초과 저축).
 * 목표 미설정(targetDate === null)이면 빈 배열 — 화면에서 등록 유도 UI를 띄울 것.
 */
export function buildAssetGoals(goal: GoalResponse, today: Date = new Date()): AssetGoalView[] {
  if (goal.targetDate === null) return []

  const dDay = goalDDay(goal.targetDate, today)
  const surplus = goal.monthly.currentValue - goal.monthly.targetAmount

  return [
    {
      id: 'annual',
      name: '연간 · 총자산',
      current: goal.annual.currentValue,
      target: goal.annual.targetAmount,
      color: 'var(--accent)',
      pct: goal.annual.progressPercent,
      barPct: Math.min(100, goal.annual.progressPercent),
      currentFmt: fmt(goal.annual.currentValue),
      targetFmt: fmt(goal.annual.targetAmount),
      subCaption:
        dDay === null
          ? `월 ${fmt(goal.monthly.targetAmount)}원 필요`
          : dDay < 0
            ? `목표일이 지났어요 · 월 ${fmt(goal.monthly.targetAmount)}원 필요`
            : `D−${dDay} · 월 ${fmt(goal.monthly.targetAmount)}원 필요`,
    },
    {
      id: 'monthly',
      name: '월간 · 필요 저축',
      current: goal.monthly.currentValue,
      target: goal.monthly.targetAmount,
      color: 'var(--accent)',
      pct: goal.monthly.progressPercent,
      barPct: Math.min(100, goal.monthly.progressPercent),
      currentFmt: fmt(goal.monthly.currentValue),
      targetFmt: fmt(goal.monthly.targetAmount),
      subCaption: surplus >= 0 ? `+${fmt(surplus)}원 초과` : `${fmt(Math.abs(surplus))}원 부족`,
    },
  ]
}

/** 월 지출 가능액 = 월평균 수입 − 월 필요 저축액 (API-SPEC §5.1 각주). 음수 가능. */
export function monthlySpendable(goal: GoalResponse): number {
  return goal.monthlyIncome - goal.monthly.targetAmount
}

// ---------- 월간 리포트 ----------

export interface MonthlyReportView {
  totalAssetChangeKrw: number
  totalAssetChangeFmt: string
  /** 증가한 계좌가 없으면 null — 그 줄을 그리지 말 것. */
  topGaining: { name: string; amountFmt: string } | null
  /** 지출이 없으면 null. */
  topExpense: { name: string; amountFmt: string } | null
  /** 수입이 0이면 서버가 0이 아니라 null을 준다 — '—'로 폴백할 것. */
  savingsRatePercent: number | null
}

export function buildMonthlyReport(report: MonthlyReportResponse): MonthlyReportView {
  return {
    totalAssetChangeKrw: report.totalAssetChangeKrw,
    totalAssetChangeFmt: signedFmt(report.totalAssetChangeKrw),
    topGaining:
      report.topGainingAccountName !== null && report.topGainingAmountKrw !== null
        ? { name: report.topGainingAccountName, amountFmt: fmt(report.topGainingAmountKrw) }
        : null,
    topExpense:
      report.topExpenseCategoryName !== null && report.topExpenseAmountKrw !== null
        ? { name: report.topExpenseCategoryName, amountFmt: fmt(report.topExpenseAmountKrw) }
        : null,
    savingsRatePercent: report.savingsRatePercent,
  }
}
