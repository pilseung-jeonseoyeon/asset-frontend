// B안 대표 카드 — 총자산 + 올해 변화율 배지를 왼쪽에, 이번 달 증감·연초 대비를 오른쪽에 두고
// 그 아래 올해 1월~12월 총자산 추이를 큰 캔버스로 그린다. 상태 분기는 TotalAssetDeepCard와 같은
// 기준(로딩 '—', 에러, 빈 상태, 스냅샷 이력 없음)을 쓰고, 추이 자체의 로딩·에러·데이터 부족은
// YearStatusCard처럼 그래프 자리에서만 따로 처리한다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { DeepCard } from '../../../components/primitives/DeepCard/DeepCard'
import { StatBadge } from '../../../components/primitives/StatBadge/StatBadge'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { isoDateToDisplay } from '../../../utils/date'
import { useDashboardHero } from '../hooks/useDashboardHero'
import { useDashboardTrend } from '../hooks/useDashboardTrend'
import { DASHED_CTA_STYLE_DEEP, EMPTY_TEXT_STYLE_DEEP, ERROR_TEXT_STYLE_DEEP, TREND_MONTH_LABELS } from './cardStyles'
import { KoreanUnitsCaption } from './shared'

export function TrendCanvasDeepCard() {
  const { setState } = useAppState()
  const isMobile = useIsMobile()
  const { hero, isHeroPending, heroError } = useDashboardHero()
  const {
    trendQuery, trendChart, trendAsOf, yAxisTicks, currentMonth, trendFutureFromMonth, hasFutureRange,
    trendPercentText, trendPositive,
  } = useDashboardTrend()
  const openAddAccount = () => setState({ quickAddOpen: false, openModal: 'addAccount' })
  const chartHeight = isMobile ? 140 : 180

  return (
    <DeepCard aria-busy={isHeroPending}>
      {isHeroPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
      ) : heroError ? (
        <div style={ERROR_TEXT_STYLE_DEEP}>{heroError.message}</div>
      ) : !hero || hero.isEmpty ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: 'var(--deep-chip)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="add_card" size={20} color="var(--deep-value)" />
          </span>
          <div style={EMPTY_TEXT_STYLE_DEEP}>계좌를 추가하고 총자산을 한눈에 확인해보세요</div>
          <button onClick={openAddAccount} className="qbtn" style={DASHED_CTA_STYLE_DEEP}>
            <Icon name="add" size={16} />
            계좌 추가
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'flex-start',
              justifyContent: 'space-between',
              gap: isMobile ? 18 : 24,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>총 자산</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
                <div
                  style={{
                    fontSize: isMobile ? 32 : 42,
                    fontWeight: 700,
                    letterSpacing: '-.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hero.totalText}
                  <span style={{ fontSize: isMobile ? 17 : 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
                </div>
                {trendPercentText && (
                  <div style={{ paddingBottom: 8 }}>
                    <StatBadge
                      direction={trendPositive ? 'up' : 'down'}
                      text={trendPercentText}
                      bg="var(--deep-chip)"
                      color={trendPositive ? 'var(--deep-up)' : 'var(--deep-down)'}
                    />
                  </div>
                )}
              </div>
              <KoreanUnitsCaption amountKrw={hero.totalAssetKrw} deep />
            </div>

            <div style={{ display: 'flex', gap: 28, paddingTop: isMobile ? 0 : 6, textAlign: isMobile ? 'left' : 'right' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>이번 달 증감</div>
                {hero.hasSnapshotHistory && hero.monthChangeKrw !== null && hero.monthChangeText !== null ? (
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: hero.monthChangeKrw >= 0 ? 'var(--deep-up)' : 'var(--deep-down)',
                      letterSpacing: '-.01em',
                      marginTop: 6,
                    }}
                  >
                    {hero.monthChangeText}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
                  </div>
                ) : (
                  <div style={{ ...EMPTY_TEXT_STYLE_DEEP, marginTop: 6 }}>자산 이력이 쌓이면 확인할 수 있어요</div>
                )}
              </div>
              <div style={{ width: 0.5, background: 'var(--deep-divider)' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500 }}>연초 대비</div>
                {hero.hasSnapshotHistory && hero.yearChangeKrw !== null && hero.yearChangeText !== null ? (
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: hero.yearChangeKrw >= 0 ? 'var(--deep-up)' : 'var(--deep-down)',
                      letterSpacing: '-.01em',
                      marginTop: 6,
                    }}
                  >
                    {hero.yearChangeText}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
                  </div>
                ) : (
                  <div style={{ ...EMPTY_TEXT_STYLE_DEEP, marginTop: 6 }}>자산 이력이 쌓이면 확인할 수 있어요</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            {trendQuery.isPending ? (
              <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
            ) : trendQuery.error ? (
              <div style={ERROR_TEXT_STYLE_DEEP}>{trendQuery.error.message}</div>
            ) : !trendChart.path || !trendChart.lastPoint ? (
              <div style={EMPTY_TEXT_STYLE_DEEP}>데이터가 더 쌓이면 총자산 추이를 볼 수 있어요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--deep-label)' }}>
                    {isMobile ? '올해 총자산 추이' : '올해 1월~12월 총자산 추이'}
                    {hasFutureRange ? (isMobile ? ` · ${trendFutureFromMonth}월 이후 예정` : ` · ${trendFutureFromMonth}월 이후는 예정 구간`) : ''}
                  </span>
                  {trendAsOf && <span style={{ fontSize: 11.5, color: 'var(--deep-label)' }}>{isoDateToDisplay(trendAsOf)} 기준</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {yAxisTicks && (
                    <div
                      style={{
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        height: chartHeight, fontSize: 10, color: 'var(--deep-label)', flex: 'none', whiteSpace: 'nowrap', textAlign: 'right',
                      }}
                    >
                      <span>{yAxisTicks[0]}</span>
                      <span>{yAxisTicks[1]}</span>
                      <span>{yAxisTicks[2]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <svg viewBox="0 0 600 92" preserveAspectRatio="none" style={{ width: '100%', height: chartHeight, display: 'block' }}>
                      {trendChart.futureFromX !== null && (
                        <rect
                          x={trendChart.futureFromX}
                          y="0"
                          width={600 - trendChart.futureFromX}
                          height="92"
                          style={{ fill: 'var(--deep-chip)' }}
                          opacity="0.7"
                        />
                      )}
                      <g style={{ stroke: 'var(--deep-divider)' }}>
                        <line x1="0" y1="6" x2="600" y2="6" />
                        <line x1="0" y1="46" x2="600" y2="46" />
                        <line x1="0" y1="86" x2="600" y2="86" />
                      </g>
                      <path
                        d={trendChart.path}
                        fill="none"
                        style={{ stroke: 'var(--deep-value)' }}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={trendChart.lastPoint.x}
                        cy={trendChart.lastPoint.y}
                        r="4"
                        style={{ fill: 'var(--deep-value)', stroke: 'var(--deep-bg)' }}
                        strokeWidth="2"
                      />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 9 : 10.5, color: 'var(--deep-label)', marginTop: 5 }}>
                      {TREND_MONTH_LABELS.map((m, i) => (
                        <span
                          key={m}
                          style={i + 1 === currentMonth ? { fontWeight: 700, color: 'var(--deep-value)' } : undefined}
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
        </div>
      )}
    </DeepCard>
  )
}
