// View-model layer for the 대시보드(Dashboard) screen: adapts GET /dashboard/{summary,trend,
// allocation,reports}, GET /goals, GET /assets/distribution?groupBy=INSTITUTION into the shapes the
// screen renders (API-SPEC §4 · §5 · §3.1). Dashboard.tsx consumes these directly.
//
// 여기 없는 것과 그 이유:
//   - 억/만 축약 캡션(예: "약 12억 8,450만 원")은 src/utils/format.ts의 formatKoreanAbbrev가 맡는다 —
//     fmt()와 마찬가지로 통화 기호 없는 범용 포맷터라 화면 레이어가 아니라 utils에 둔다.
//   - "7월 이후는 예정 구간" 같은 미래 구간 표기: 서버가 예측값을 주지 않는다.
// 추이 차트의 y축 눈금 라벨(13억/11억/9억, dc.html L919-922)은 buildTrendYAxisTicks가 formatKoreanAbbrev로
// 계산한다(2026-08-17 복원 — formatKoreanAbbrev 신설 전에는 계산 수단이 없어 생략돼 있었다).

import { fmt, formatKoreanAbbrev } from '../utils/format'
import { assetClassMetaOf } from './assetsView'
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
  /** 이번 정산월 시작일 대비. 음수 가능. 기준 스냅샷이 없으면 null — 배지를 그리지 말 것. */
  monthChangeKrw: number | null
  monthChangeFmt: string | null
  /** 올해 1월 1일 대비. 음수 가능. 기준 스냅샷이 없으면 null — 배지를 그리지 말 것. */
  yearChangeKrw: number | null
  yearChangeFmt: string | null
  /** 계좌 자체가 없는 진짜 신규 사용자 — 0원을 "자산 0원"으로 단정하지 말고 빈 상태로 안내할 것. */
  isEmpty: boolean
  /**
   * summary(스냅샷 기반)에 이력이 있는지 여부. false면 `totalAssetKrw`는 allocation 실시간 합계로
   * 보완한 값이라 `monthChangeKrw`/`yearChangeKrw`는 계산 근거(전일/연초 스냅샷)가 없다 —
   * 이 값이 false일 때는 증감 관련 UI(월 증감 배지, 올해 자산 추이)를 그리지 말 것
   * (docs/backend-requests.md 23번 — 계좌 생성 첫날 스냅샷 부재).
   */
  hasSnapshotHistory: boolean
}

/** 증감액은 부호를 명시적으로 붙인다(히어로/딥카드 배지 규칙). */
function signedFmt(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${fmt(Math.abs(n))}`
}

/**
 * `summary.totalAssetKrw === 0`은 "계좌 없음"과 "스냅샷이 아직 없는 계좌 등록 첫날"을 구분하지
 * 못한다(docs/backend-requests.md 23번). 같은 화면의 `GET /dashboard/allocation`은 잔액을 실시간
 * 집계하므로, summary가 0이어도 allocation 합계가 양수면 계좌가 있다고 판정하고 총자산 표시값을
 * allocation 합계로 보완한다. summary가 양수면(정상 스냅샷 보유) 그대로 summary 값을 쓴다.
 */
export function buildDashboardHero(
  summary: DashboardSummaryResponse,
  allocationTotalKrw: number,
): DashboardHeroView {
  const hasSnapshotHistory = summary.totalAssetKrw > 0
  const totalAssetKrw = hasSnapshotHistory ? summary.totalAssetKrw : allocationTotalKrw

  return {
    totalAssetKrw,
    totalFmt: fmt(totalAssetKrw),
    monthChangeKrw: summary.monthChangeKrw,
    monthChangeFmt: summary.monthChangeKrw === null ? null : signedFmt(summary.monthChangeKrw),
    yearChangeKrw: summary.yearChangeKrw,
    yearChangeFmt: summary.yearChangeKrw === null ? null : signedFmt(summary.yearChangeKrw),
    isEmpty: totalAssetKrw <= 0,
    hasSnapshotHistory,
  }
}

/**
 * allocation 응답의 실시간 총자산 합계. summary가 0일 때 히어로 판정을 보완하는 데 쓴다.
 * `buildAllocationSegments`와 같은 기준(0/음수 항목 제외)으로 합산해야 히어로 총자산과 도넛 합계가
 * 어긋나지 않는다 — 스펙상 음수가 실제 오는지는 미확정이지만 방어적으로 통일한다.
 */
export function sumAllocationKrw(allocation: AllocationResponse[]): number {
  return allocation.filter((a) => a.totalValueKrw > 0).reduce((sum, a) => sum + a.totalValueKrw, 0)
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
  // API-SPEC §4.2는 예시만 오름차순이고 정렬을 보장하지 않는다. x좌표를 배열 인덱스로 매기므로
  // 순서가 어긋나면 선이 앞뒤로 튄다 — buildAccountTrendPath(assetsView.ts)와 같은 이유의 방어적
  // 정렬이며, 원본 dc.html에 직접 대응하는 근거는 없다.
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const dates = sorted.map((p) => p.date)
  if (sorted.length < 2) return { path: null, lastPoint: null, dates }

  const values = sorted.map((p) => p.totalValueKrw)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const usable = height - padding * 2

  const coords = sorted.map((p, i) => {
    const x = (width * i) / (sorted.length - 1)
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

/**
 * 추이 차트 왼쪽의 y축 눈금 라벨 3개(원본 dc.html L919-922, 위→아래 = 최댓값→최솟값). 그리드선
 * y좌표(6/46/86, buildTrendChart와 동일한 viewBox 92)와 짝을 맞춰 값을 등간격(최대/중간/최소)으로
 * 배치한다. `formatKoreanAbbrev`가 억 단위 미만은 "0"을 돌려주므로(만 원 단위 반올림), 세 값이 전부
 * 그렇게 뭉개지는 소액 구간에서는 원 단위 그대로(`fmt`)로 대체해 "0/0/0"이 찍히지 않게 한다.
 * 포인트가 2개 미만이면(선을 그릴 수 없음) null.
 */
export function buildTrendYAxisTicks(points: TrendPointResponse[]): [string, string, string] | null {
  if (points.length < 2) return null
  const values = points.map((p) => p.totalValueKrw)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mid = (min + max) / 2

  const abbrevs = [max, mid, min].map((v) => formatKoreanAbbrev(v))
  const allCollapsed = abbrevs.every((a) => a === '0')
  return allCollapsed
    ? ([fmt(max), fmt(mid), fmt(min)] as [string, string, string])
    : (abbrevs as [string, string, string])
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
 * 단순 반올림만 하면 합이 99나 101이 되어 도넛 마지막 조각이나 유동성 막대(assetsView.ts
 * buildLiquidityView)에 틈/오버플로가 생긴다 — 두 화면이 이 함수를 공유한다.
 */
export function toPercentages(values: number[]): number[] {
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
 * 도넛 세그먼트. 라벨은 서버 값을 쓰지 않고 항상 `ASSET_CLASS_META`의 프론트 고정 표기를 쓴다
 * (assetsView.ts 참고 — 화면 표기는 프론트가 소유).
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
    // 매핑에 없는 코드가 오면(assetsView.ts assetClassMetaOf 참고) 라벨만 코드값으로 폴백하고
    // 나머지는 그대로 그린다.
    label: assetClassMetaOf(a.assetClass).label,
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

/**
 * 보관처 목록이 비었을 때 쓰는 안내 문구. 대시보드 카드와 InstitutionsModal(전체 보기)이 같은
 * 상황(보유 자산 0)을 가리키므로 문구를 하나로 공유한다.
 */
export const DASHBOARD_INSTITUTIONS_EMPTY_TEXT = '계좌를 추가하면 보관처별 자산을 볼 수 있어요.'

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
 * `/assets/distribution?groupBy=INSTITUTION` 결과를 금액 내림차순으로 정리한다. `groups`를
 * 기준으로 순회하므로(institutions를 기준으로 순회하지 않으므로) 기관 미연결 버킷
 * (institutionId: null, "미지정")도 자연히 포함된다 — InstitutionsModal.tsx도 같은 이유로
 * 이 함수를 재사용한다(limit만 다르고 나머지 규칙은 동일).
 * 아이콘 키는 이 응답에 없어 `GET /institutions`와 institutionId로 조인한다 — 조인에 실패하면
 * 빈 문자열로 두고 BankIcon의 기본 아이콘 폴백에 맡긴다(가짜 값 금지).
 * 보유액이 0 이하인 그룹은 제외한다 — 서버가 0원 그룹을 내려줘도 "자산이 있는 곳"만 보여준다.
 */
export function buildDashboardInstitutions(
  groups: AssetInstitutionGroup[],
  institutions: InstitutionResponse[],
  limit = 4,
): DashboardInstitutionView[] {
  return [...groups]
    .filter((g) => g.totalValueKrw > 0)
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
  color: string
  /**
   * `null`이면 이 축은 진행률 계산 근거가 없다는 뜻이다(`0`과 구분 — GoalDetail 주석 참고).
   * 이때는 pct/진행률 바/currentFmt/targetFmt를 그리지 말고 subCaption만 보여줄 것.
   */
  pct: number | null
  /** 진행률 바 길이. progressPercent는 100을 넘을 수 있어(clamp 안 함) 여기서만 잘라 쓴다. pct가
   * null이면 의미 없는 값(0)이니 hasProgressData로 먼저 분기할 것. */
  barPct: number
  currentFmt: string | null
  targetFmt: string | null
  subCaption: string
  /** `pct !== null`과 동치 — 호출부 가독성을 위한 별도 플래그. */
  hasProgressData: boolean
}

/** 진행률 근거가 없을 때(hasProgressData === false) 두 줄이 공유하는 중립 안내 문구. */
const GOAL_PROGRESS_UNKNOWN_CAPTION = '자산 이력이 쌓이면 진행률을 확인할 수 있어요'
/** status === 'ACHIEVED'일 때 두 줄이 공유하는 안내 문구. */
const GOAL_ACHIEVED_CAPTION = '목표를 달성했어요 · 새 목표를 세워볼까요?'
/** status === 'EXPIRED'일 때(월간 축이 계산 근거 없이 null로 오는 경우) 쓰는 안내 문구. */
const GOAL_EXPIRED_CAPTION = '목표 기간이 끝났어요 · 새 목표를 세워볼까요?'

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
 * 각 축(GoalDetail)은 계산 근거가 없으면 세 값(targetAmount/currentValue/progressPercent)이
 * 모두 null로 온다 — `EXPIRED` 상태면 monthly 쪽이 이 경우다. annual/monthly는 서로 독립적으로
 * null일 수 있으므로 각자 따로 분기한다(과거처럼 한쪽 값으로 둘 다 판정하지 않는다).
 * 목표 미설정(targetDate === null)이면 빈 배열 — 화면에서 등록 유도 UI를 띄울 것.
 */
export function buildAssetGoals(goal: GoalResponse, today: Date = new Date()): AssetGoalView[] {
  if (goal.targetDate === null) return []

  const dDay = goalDDay(goal.targetDate, today)
  const isAchieved = goal.status === 'ACHIEVED'
  const isExpired = goal.status === 'EXPIRED'

  const annualHasData = goal.annual.progressPercent !== null
  const monthlyHasData = goal.monthly.progressPercent !== null
  const monthlyTargetFmt = goal.monthly.targetAmount === null ? null : fmt(goal.monthly.targetAmount)
  const surplus =
    goal.monthly.currentValue === null || goal.monthly.targetAmount === null
      ? null
      : goal.monthly.currentValue - goal.monthly.targetAmount

  return [
    {
      id: 'annual',
      name: '연간 · 총자산',
      color: 'var(--accent)',
      pct: goal.annual.progressPercent,
      barPct: annualHasData ? Math.max(0, Math.min(100, goal.annual.progressPercent as number)) : 0,
      currentFmt: goal.annual.currentValue === null ? null : fmt(goal.annual.currentValue),
      targetFmt: goal.annual.targetAmount === null ? null : fmt(goal.annual.targetAmount),
      hasProgressData: annualHasData,
      subCaption: isAchieved
        ? GOAL_ACHIEVED_CAPTION
        : !annualHasData
          ? GOAL_PROGRESS_UNKNOWN_CAPTION
          : monthlyTargetFmt === null
            ? dDay === null
              ? '월 필요 저축액을 계산할 수 없어요'
              : dDay < 0
                ? '목표일이 지났어요'
                : `D−${dDay}`
            : dDay === null
              ? `월 ${monthlyTargetFmt}원 필요`
              : dDay < 0
                ? `목표일이 지났어요 · 월 ${monthlyTargetFmt}원 필요`
                : `D−${dDay} · 월 ${monthlyTargetFmt}원 필요`,
    },
    {
      id: 'monthly',
      name: '월간 · 필요 저축',
      color: 'var(--accent)',
      pct: goal.monthly.progressPercent,
      barPct: monthlyHasData ? Math.max(0, Math.min(100, goal.monthly.progressPercent as number)) : 0,
      currentFmt: goal.monthly.currentValue === null ? null : fmt(goal.monthly.currentValue),
      targetFmt: monthlyTargetFmt,
      hasProgressData: monthlyHasData,
      subCaption: isAchieved
        ? GOAL_ACHIEVED_CAPTION
        : isExpired
          ? GOAL_EXPIRED_CAPTION
          : !monthlyHasData
            ? GOAL_PROGRESS_UNKNOWN_CAPTION
            : surplus === null
              ? GOAL_PROGRESS_UNKNOWN_CAPTION
              : surplus >= 0
                ? `+${fmt(surplus)}원 초과`
                : `${fmt(Math.abs(surplus))}원 부족`,
    },
  ]
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
