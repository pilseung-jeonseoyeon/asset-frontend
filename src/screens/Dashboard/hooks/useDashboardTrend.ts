// 올해 1월~오늘 총자산 추이(GET /dashboard/trend, unit=MONTH)를 화면이 그릴 형태로 바꾼다.
// A안의 '올해 자산 현황' 카드와 B안의 추이 캔버스 딥 카드가 같은 계산을 공유한다.
//
// x축은 항상 올해 1월~12월이고, 데이터가 있는 마지막 달 이후는 '예정 구간'으로만 음영 처리한다.
// 음영은 어디까지나 '아직 값이 없는 구간' 표시이고 예측선이 아니다 — 서버는 미래 예측값을 주지
// 않으므로 선을 연장하지 말 것.

import { todayYearMonth, toISODate } from '../../../utils/date'
import { buildTrendChart, buildTrendYAxisTicks } from '../../../data/dashboardView'
import { useGetDashboardTrend } from '@/services/dashboard'

export function useDashboardTrend() {
  const currentYear = todayYearMonth().year
  const trendRange = { from: `${currentYear}-01-01`, to: toISODate(new Date()) }
  const trendQuery = useGetDashboardTrend(trendRange, 'MONTH')
  const trendChart = buildTrendChart(trendQuery.points)
  const trendAsOf = trendChart.dates.length > 0 ? trendChart.dates[trendChart.dates.length - 1] : null
  const yAxisTicks = buildTrendYAxisTicks(trendQuery.points)
  // x축 강조는 "마지막 데이터"가 아니라 오늘이 속한 달 — 데이터가 밀려 있어도 축은 달력이다.
  const currentMonth = todayYearMonth().month
  // 마지막 데이터가 있는 달의 다음 달부터가 예정 구간이다(음영 시작점은 buildTrendChart가 계산).
  const trendFutureFromMonth = trendAsOf ? Number(trendAsOf.slice(5, 7)) + 1 : null
  const hasFutureRange =
    trendChart.futureFromX !== null && trendFutureFromMonth !== null && trendFutureFromMonth <= 12

  // 올해 첫 지점 대비 마지막 지점의 변화율 — 지점이 2개 미만이거나 첫 값이 0이면 계산하지 않는다.
  let trendPercentText: string | null = null
  let trendPositive = true
  if (trendQuery.points.length >= 2) {
    const first = trendQuery.points[0].totalValueKrw
    const last = trendQuery.points[trendQuery.points.length - 1].totalValueKrw
    if (first !== 0) {
      const percent = ((last - first) / first) * 100
      trendPositive = percent >= 0
      trendPercentText = `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${Math.abs(percent).toFixed(1)}%`
    }
  }

  return {
    trendQuery,
    trendChart,
    /** 데이터가 있는 마지막 날짜('YYYY-MM-DD') — "N월 N일 기준" 표기용. 없으면 null. */
    trendAsOf,
    yAxisTicks,
    currentMonth,
    trendFutureFromMonth,
    hasFutureRange,
    trendPercentText,
    trendPositive,
  }
}
