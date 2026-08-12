// Source: secret/Asset Manager v14.dc.html L840-1038 (isDash block) — layout transcribed verbatim,
// then wired to GET /dashboard/{summary,trend,allocation}, GET /goals, GET /assets/distribution?
// groupBy=INSTITUTION + GET /institutions (previously hardcoded mock data — see git history for
// src/data/mockDashboard.ts). View-model conversion lives in src/data/dashboardView.ts.
//
// Dropped vs. the old mock (server genuinely doesn't send these, or the source never computed them
// generically — CLAUDE.md forbids inventing a general abbreviation/axis-label helper the source
// didn't have):
//   - 총자산 추이 y축 눈금 라벨(13억/11억/9억): dashboardView.ts가 명시적으로 생략.
//   - "7월 이후는 예정 구간" 미래 구간 음영·기준선: 서버가 예측값을 주지 않는다.
// 신규 사용자를 위한 빈 상태는 카드 단위로 처리한다(자산은 있는데 목표만 없는 중간 상태 포함) —
// Assets.tsx의 EmptyAccountsState / Stocks.tsx의 딥카드 빈 상태와 같은 패턴(로딩 "—", 에러
// var(--down), 빈 상태 안내문+버튼).

import type { CSSProperties } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { StatBadge } from '../../components/primitives/StatBadge/StatBadge'
import { BankIcon } from '../../components/primitives/BankIcon/BankIcon'
import { DonutChart } from '../../components/primitives/DonutChart/DonutChart'
import { useAppState } from '../../state/AppStateContext'
import { useIsMobile } from '../../utils/useMediaQuery'
import { fmt, formatKoreanAbbrev } from '../../utils/format'
import { isoDateToDisplay, todayYearMonth, toISODate } from '../../utils/date'
import {
  buildAllocationSegments,
  buildAssetGoals,
  buildDashboardHero,
  buildDashboardInstitutions,
  buildTrendChart,
  pickTopAllocation,
} from '../../data/dashboardView'
import {
  useGetDashboardAllocation,
  useGetDashboardSummary,
  useGetDashboardTrend,
} from '@/services/dashboard'
import { useGetAssetDistributionByInstitution } from '@/services/asset'
import { useGetInstitutions } from '@/services/institution'
import { useGetGoal } from '@/services/goal'

const EMPTY_TEXT_STYLE: CSSProperties = { fontSize: 12.5, color: 'var(--text-weak)' }
const EMPTY_TEXT_STYLE_DEEP: CSSProperties = { fontSize: 12.5, color: 'var(--deep-label)' }
const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)' }
const ERROR_TEXT_STYLE_DEEP: CSSProperties = { fontSize: 11.5, color: 'var(--deep-down)' }
const DASHED_CTA_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 10, border: '0.5px dashed var(--text-weak)',
  background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s',
}
const DASHED_CTA_STYLE_DEEP: CSSProperties = {
  ...DASHED_CTA_STYLE,
  border: '0.5px dashed var(--deep-label)',
  color: 'var(--deep-label)',
}

// 1억 원 미만 금액에는 축약 캡션을 병기하지 않는다(ds_rules §4-2).
const ABBREV_THRESHOLD = 100_000_000

function AbbrevCaption({ amountKrw, deep }: { amountKrw: number; deep?: boolean }) {
  if (Math.abs(amountKrw) < ABBREV_THRESHOLD) return null
  const sign = amountKrw < 0 ? '−' : ''
  const style = deep
    ? { fontSize: 12, color: 'var(--deep-label)', fontWeight: 500, marginTop: 4 }
    : { fontSize: 11.5, color: 'var(--text-weak)' }
  return (
    <div style={style}>
      약 {sign}
      {formatKoreanAbbrev(amountKrw)} 원
    </div>
  )
}

function EmptyState({
  text,
  ctaLabel,
  onCta,
  deep,
  style,
}: {
  text: string
  ctaLabel?: string
  onCta?: () => void
  deep?: boolean
  style?: CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={deep ? EMPTY_TEXT_STYLE_DEEP : EMPTY_TEXT_STYLE}>{text}</div>
      {ctaLabel && onCta && (
        <button onClick={onCta} className="qbtn" style={deep ? DASHED_CTA_STYLE_DEEP : DASHED_CTA_STYLE}>
          <Icon name="add" size={16} />
          {ctaLabel}
        </button>
      )}
    </div>
  )
}

export function Dashboard() {
  const { setState } = useAppState()
  const isMobile = useIsMobile()

  const openAddAccount = () => setState({ quickAddOpen: false, modalOpen: 'addAccount' })
  const openAddGoal = () => setState({ modalOpen: 'addGoal', addGoalReturnTo: null })

  const summaryQuery = useGetDashboardSummary()
  const hero = summaryQuery.data ? buildDashboardHero(summaryQuery.data) : null

  const currentYear = todayYearMonth().year
  const trendRange = { from: `${currentYear}-01-01`, to: toISODate(new Date()) }
  const trendQuery = useGetDashboardTrend(trendRange, 'MONTH')
  const trendChart = buildTrendChart(trendQuery.points)
  const trendAsOf = trendChart.dates.length > 0 ? trendChart.dates[trendChart.dates.length - 1] : null
  const monthLabels = trendChart.dates.map((d) => `${Number(d.slice(5, 7))}월`)

  let trendPctFmt: string | null = null
  let trendPositive = true
  if (trendQuery.points.length >= 2) {
    const first = trendQuery.points[0].totalValueKrw
    const last = trendQuery.points[trendQuery.points.length - 1].totalValueKrw
    if (first !== 0) {
      const pct = ((last - first) / first) * 100
      trendPositive = pct >= 0
      trendPctFmt = `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(1)}%`
    }
  }

  const allocationQuery = useGetDashboardAllocation()
  const allocationSegments = buildAllocationSegments(allocationQuery.allocation)
  const topAllocation = pickTopAllocation(allocationSegments)
  const hasAllocationData = allocationSegments.length > 0

  const institutionDistribution = useGetAssetDistributionByInstitution()
  const institutionsQuery = useGetInstitutions()
  const dashboardInstitutions = buildDashboardInstitutions(
    institutionDistribution.groups,
    institutionsQuery.data ?? [],
  )
  const institutionsPending = institutionDistribution.isPending || institutionsQuery.isPending
  const institutionsError = institutionDistribution.error ?? institutionsQuery.error

  const goalQuery = useGetGoal({})
  const assetGoals = goalQuery.goal ? buildAssetGoals(goalQuery.goal) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* 월간 리포트 배너 */}
      <button
        onClick={() => setState({ reportOpen: true, reportSlide: 0 })}
        className="qbtn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 18px',
          borderRadius: 10,
          border: '0.5px solid var(--border)',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: 'var(--fill-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Icon name="auto_awesome" size={17} color="var(--text-strong)" />
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>
            이번 달 리포트 보기
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 400 }}>
            이번 달 내 자산이 어떻게 움직였는지 확인해보세요
          </span>
        </div>
        <Icon name="chevron_right" size={20} color="var(--text-mid)" />
      </button>

      {/* ROW 1: 총자산 히어로 + 목표버킷 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 26, alignItems: 'stretch' }}>
        <DeepCard aria-busy={summaryQuery.isPending}>
          {summaryQuery.isPending ? (
            <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
          ) : summaryQuery.error ? (
            <div style={ERROR_TEXT_STYLE_DEEP}>{summaryQuery.error.message}</div>
          ) : !hero || hero.isEmpty ? (
            <EmptyState
              deep
              text="등록된 자산이 없어요. 계좌를 추가하면 총자산을 확인할 수 있어요."
              ctaLabel="계좌 추가"
              onCta={openAddAccount}
            />
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>총 자산</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
                <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
                  {hero.totalFmt}
                  <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
                </div>
              </div>
              <AbbrevCaption amountKrw={hero.totalAssetKrw} deep />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <span style={{ fontSize: 12.5, color: 'var(--deep-label)', fontWeight: 400 }}>이번 달 증감액</span>
                <StatBadge
                  direction={hero.monthChangeKrw >= 0 ? 'up' : 'down'}
                  text={`${fmt(Math.abs(hero.monthChangeKrw))}원`}
                  bg="var(--deep-chip)"
                  color={hero.monthChangeKrw >= 0 ? 'var(--deep-up)' : 'var(--deep-down)'}
                />
              </div>
            </div>
          )}
        </DeepCard>

        <Card aria-busy={goalQuery.isPending}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>자산 목표</div>
          </div>
          {goalQuery.isPending ? (
            <div aria-busy style={{ ...EMPTY_TEXT_STYLE, flex: 1, display: 'flex', alignItems: 'center' }}>—</div>
          ) : goalQuery.error ? (
            <div style={{ ...ERROR_TEXT_STYLE, flex: 1, display: 'flex', alignItems: 'center' }}>{goalQuery.error.message}</div>
          ) : goalQuery.isUnset ? (
            <EmptyState
              style={{ flex: 1, justifyContent: 'center' }}
              text="아직 목표를 설정하지 않았어요. 목표를 설정하면 진행 상황을 확인할 수 있어요."
              ctaLabel="목표 설정"
              onCta={openAddGoal}
            />
          ) : (
            <div
              onClick={openAddGoal}
              style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center', cursor: 'pointer' }}
            >
              {assetGoals.map((ag) => (
                <div key={ag.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ag.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>{ag.pct}%</div>
                  </div>
                  <div style={{ height: 6, background: 'var(--track)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${ag.barPct}%`, background: ag.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                    {ag.currentFmt} / {ag.targetFmt}원
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{ag.subCaption}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ROW 2: 구성비율 + 이번달 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <Card style={{ padding: 24 }} aria-busy={summaryQuery.isPending}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>올해 자산 현황</div>
            {trendAsOf && <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{isoDateToDisplay(trendAsOf)} 기준</span>}
          </div>
          {summaryQuery.isPending ? (
            <div aria-busy style={{ ...EMPTY_TEXT_STYLE, marginTop: 14 }}>—</div>
          ) : summaryQuery.error ? (
            <div style={{ ...ERROR_TEXT_STYLE, marginTop: 14 }}>{summaryQuery.error.message}</div>
          ) : !hero || hero.isEmpty ? (
            <EmptyState
              style={{ marginTop: 14 }}
              text="계좌를 추가하면 올해 자산 현황을 볼 수 있어요."
              ctaLabel="계좌 추가"
              onCta={openAddAccount}
            />
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
                {hero.yearChangeFmt}원
              </div>
              <AbbrevCaption amountKrw={hero.yearChangeKrw} />
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
                      <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>올해 {currentYear}년 총자산 추이</span>
                      {trendPctFmt && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: trendPositive ? 'var(--up)' : 'var(--down)' }}>
                          {trendPctFmt}
                        </span>
                      )}
                    </div>
                    <svg viewBox="0 0 600 92" preserveAspectRatio="none" style={{ width: '100%', height: 92, display: 'block' }}>
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
                      {monthLabels.map((m, i) => (
                        <span
                          key={`${m}-${i}`}
                          style={i === monthLabels.length - 1 ? { fontWeight: 700, color: 'var(--accent)' } : undefined}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </Card>

        <Card style={{ padding: 24 }} aria-busy={allocationQuery.isPending}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>자산 구성 비율</div>
          {allocationQuery.isPending ? (
            <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
          ) : allocationQuery.error ? (
            <div style={ERROR_TEXT_STYLE}>{allocationQuery.error.message}</div>
          ) : !hasAllocationData ? (
            <EmptyState text="계좌를 추가하면 자산 구성 비율을 볼 수 있어요." ctaLabel="계좌 추가" onCta={openAddAccount} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 26, flex: 1 }}>
                <DonutChart segments={allocationSegments} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, flex: 1, whiteSpace: 'nowrap' }}>
                  {allocationSegments
                    .filter((seg) => seg.showLegend)
                    .map((seg) => (
                      <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 4, background: seg.color }} />
                        <span style={{ color: 'var(--text-mid)', flex: 1 }}>{seg.label}</span>
                        <b>{seg.pct}%</b>
                      </div>
                    ))}
                </div>
              </div>
              {topAllocation && (
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
                  최대 비중 <b style={{ color: 'var(--text-strong)' }}>{topAllocation.label} {topAllocation.pct}%</b>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ROW 3: 주요 자산 보관처 */}
      <Card style={{ padding: 24 }} aria-busy={institutionsPending}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>주요 자산 보관처</div>
          <span
            onClick={() => setState({ modalOpen: 'institutions' })}
            style={
              isMobile
                ? { fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', display: 'inline-block', padding: '15px 10px', margin: '-15px -10px' }
                : { fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer' }
            }
          >
            전체 보기 ›
          </span>
        </div>
        {institutionsPending ? (
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        ) : institutionsError ? (
          <div style={ERROR_TEXT_STYLE}>{institutionsError.message}</div>
        ) : dashboardInstitutions.length === 0 ? (
          <EmptyState text="계좌를 추가하면 보관처별 자산을 볼 수 있어요." ctaLabel="계좌 추가" onCta={openAddAccount} />
        ) : (
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
            {dashboardInstitutions.map((inst) => (
              <div key={inst.key} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <BankIcon tokenKey={inst.tokenKey} size={30} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{inst.name}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
                  {inst.amountFmt}
                  <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>원</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
