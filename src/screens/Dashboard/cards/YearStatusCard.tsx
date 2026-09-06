// 올해 자산 현황 카드(A안) — 연초 대비 증감 + 올해 1월~12월 총자산 추이 스파크라인.
// y축 눈금 라벨(13억/11억/9억)은 buildTrendYAxisTicks(dashboardView.ts)가 계산한다.

import { Card } from '../../../components/primitives/Card/Card'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { isoDateToDisplay } from '../../../utils/date'
import { useDashboardHero } from '../hooks/useDashboardHero'
import { useDashboardTrend } from '../hooks/useDashboardTrend'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE, TREND_MONTH_LABELS } from './cardStyles'
import { EmptyState, KoreanUnitsCaption } from './shared'

export function YearStatusCard() {
  const isMobile = useIsMobile()
  const { hero, isHeroPending, heroError } = useDashboardHero()
  const {
    trendQuery, trendChart, trendAsOf, yAxisTicks, currentMonth, trendFutureFromMonth, hasFutureRange,
    trendPercentText, trendPositive,
  } = useDashboardTrend()

  return (
    <Card style={{ padding: 24 }} aria-busy={isHeroPending}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
        <div style={CARD_TITLE_STYLE}>올해 자산 현황</div>
        {trendAsOf && <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{isoDateToDisplay(trendAsOf)} 기준</span>}
      </div>
      {isHeroPending ? (
        <div aria-busy style={{ ...EMPTY_TEXT_STYLE, marginTop: 14 }}>—</div>
      ) : heroError ? (
        <div style={{ ...ERROR_TEXT_STYLE, marginTop: 14 }}>{heroError.message}</div>
      ) : !hero || hero.isEmpty ? (
        <EmptyState style={{ marginTop: 14 }} text="계좌를 추가하면 올해 자산 현황을 볼 수 있어요." />
      ) : !hero.hasSnapshotHistory || hero.yearChangeKrw === null || hero.yearChangeText === null ? (
        // 계좌는 있지만(allocation 실시간 합계로 확인) 스냅샷 이력이 아직 없어 연초 대비 증감을
        // 계산할 근거가 없다 — "계좌를 추가하면"이 아니라 이력이 쌓이면 보인다는 문구로 구분.
        <EmptyState style={{ marginTop: 14 }} text="자산 이력이 쌓이면 올해 자산 현황을 볼 수 있어요." />
      ) : (
        <>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: hero.yearChangeKrw >= 0 ? 'var(--up)' : 'var(--down)',
              letterSpacing: '-.02em',
              whiteSpace: 'nowrap',
              marginTop: 6,
            }}
          >
            {hero.yearChangeText}원
          </div>
          <KoreanUnitsCaption amountKrw={hero.yearChangeKrw} />
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400 }}>연초 대비</div>
          <div style={{ marginTop: 14 }}>
            {trendQuery.isPending ? (
              <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
            ) : trendQuery.error ? (
              <div style={ERROR_TEXT_STYLE}>{trendQuery.error.message}</div>
            ) : !trendChart.path || !trendChart.lastPoint ? (
              <div style={EMPTY_TEXT_STYLE}>데이터가 더 쌓이면 총자산 추이를 볼 수 있어요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  {/* 모바일에서는 카드 폭이 좁아 두 줄로 접히므로 같은 뜻의 짧은 문구로 줄인다. */}
                  <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>
                    {isMobile ? '올해 총자산 추이' : '올해 1월~12월 총자산 추이'}
                    {hasFutureRange ? (isMobile ? ` · ${trendFutureFromMonth}월 이후 예정` : ` · ${trendFutureFromMonth}월 이후는 예정 구간`) : ''}
                  </span>
                  {trendPercentText && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: trendPositive ? 'var(--up)' : 'var(--down)' }}>
                      {trendPercentText}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {yAxisTicks && (
                    <div
                      style={{
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        height: 92, fontSize: 9.5, color: 'var(--text-mid)', flex: 'none', width: 22,
                      }}
                    >
                      <span>{yAxisTicks[0]}</span>
                      <span>{yAxisTicks[1]}</span>
                      <span>{yAxisTicks[2]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <svg viewBox="0 0 600 92" preserveAspectRatio="none" style={{ width: '100%', height: 92, display: 'block' }}>
                      {trendChart.futureFromX !== null && (
                        <rect
                          x={trendChart.futureFromX}
                          y="0"
                          width={600 - trendChart.futureFromX}
                          height="92"
                          style={{ fill: 'var(--track)' }}
                          opacity="0.55"
                        />
                      )}
                      <g style={{ stroke: 'var(--track)' }}>
                        <line x1="0" y1="6" x2="600" y2="6" />
                        <line x1="0" y1="46" x2="600" y2="46" />
                        <line x1="0" y1="86" x2="600" y2="86" />
                      </g>
                      <path
                        d={trendChart.path}
                        fill="none"
                        style={{ stroke: 'var(--accent)' }}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={trendChart.lastPoint.x}
                        cy={trendChart.lastPoint.y}
                        r="3.5"
                        style={{ fill: 'var(--accent)', stroke: 'var(--surface)' }}
                        strokeWidth="2"
                      />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-weak)', marginTop: 5 }}>
                      {TREND_MONTH_LABELS.map((m, i) => (
                        <span
                          key={m}
                          style={i + 1 === currentMonth ? { fontWeight: 700, color: 'var(--accent)' } : undefined}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  )
}
