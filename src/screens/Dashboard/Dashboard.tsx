// Source: secret/Asset Manager v14.dc.html L840-1038 (isDash block) — layout transcribed verbatim,
// then wired to GET /dashboard/{summary,trend,allocation}, GET /goals, GET /assets/distribution?
// groupBy=INSTITUTION + GET /institutions (previously hardcoded mock data — see git history for
// src/data/mockDashboard.ts). View-model conversion lives in src/data/dashboardView.ts.
//
// 총자산 추이의 x축은 항상 올해 1월~12월이고, 데이터가 있는 마지막 달 이후는 "예정 구간"으로만
// 음영 처리한다(원본 dc.html의 표기 복원 — 2026-08-20). 음영은 어디까지나 "아직 값이 없는 구간"
// 표시이고 예측선이 아니다 — 서버는 미래 예측값을 주지 않으므로 선을 연장하지 말 것.
// 총자산 추이 y축 눈금 라벨(13억/11억/9억, dc.html L919-922)은 buildTrendYAxisTicks(dashboardView.ts)로
// 복원했다(2026-08-17) — formatKoreanAbbrev 신설 전에는 계산 수단이 없어 생략돼 있었다.
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
  buildTrendYAxisTicks,
  DASHBOARD_INSTITUTIONS_EMPTY_TEXT,
  pickTopAllocation,
  sumAllocationKrw,
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

// 총자산 추이 x축은 데이터 개수와 무관하게 항상 올해 12달 전부다(Ledger.tsx의 MONTH_LABELS와
// 같은 규칙 — 두 화면의 월 축 표기가 갈라지지 않도록 문자열을 맞춰 둔다).
const TREND_MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

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
  const allocationQuery = useGetDashboardAllocation()
  // summary(스냅샷 기반)가 0이면 "계좌 없음"과 "계좌 등록 첫날이라 스냅샷이 아직 없음"을 구분할 수
  // 없다(docs/backend-requests.md 23번) — allocation(실시간 집계) 합계로 보완해서 판정한다.
  // allocation이 아직 로딩 중일 때 곧바로 판정해버리면 "빈 상태" → "실제 데이터"로 바뀌는 깜빡임이
  // 생기므로, summary가 0인 동안은 allocation이 정착(settle)할 때까지 히어로 판정을 보류한다
  // (아래 리포트 배너가 hero 자체로 자신을 게이트하는 것과 같은 이유).
  const summaryIsZero = summaryQuery.data?.totalAssetKrw === 0
  const heroBlockedByAllocation = summaryIsZero && allocationQuery.isPending
  // summary가 0인데 allocation 조회 자체가 실패하면 "계좌가 없어서 0"인지 "있는데 못 가져와서
  // 0"인지 알 수 없다 — 빈 상태로 잘못 단정하지 말고 에러로 보여준다(도넛 카드와 같은 에러
  // 메시지 소스라 화면 안에서 모순된 상태가 뜨지 않는다).
  const heroAllocationErrored = summaryIsZero && !!allocationQuery.error
  const hero =
    summaryQuery.data && !heroBlockedByAllocation
      ? buildDashboardHero(summaryQuery.data, sumAllocationKrw(allocationQuery.allocation))
      : null

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
      {/* 월간 리포트 배너 — ReportOverlay가 아직 전부 목업이라(CLAUDE.md "아직 목업인 곳은 월간
          리포트 오버레이 한 곳뿐") 실제 값처럼 읽히는 화면을 열지 않고 "준비 중"만 알린다.
          클릭 대상이 아니므로 button이 아닌 div로 두고 hover(qbtn)도 붙이지 않는다 — 배지 표기는
          AccountModal의 "준비 중" 행과 같은 규격.
          계좌가 없는 신규 사용자에게는 여전히 숨긴다("자산이 있어야 볼 리포트가 있다"는 최소 조건).
          hero.isEmpty는 allocation 실시간 합계까지 반영하므로 계좌 등록 첫날에도 계좌가 있으면
          정상 노출된다 — 의도된 동작. hero가 아직 없는 로딩/에러 상태에서도 숨겨서 데이터 도착 시
          배너가 깜빡이며 나타났다 사라지는 것을 막는다. */}
      {hero && !hero.isEmpty && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 18px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            textAlign: 'left',
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
            <Icon name="auto_awesome" size={17} color="var(--text-mid)" />
          </span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
              이번 달 리포트
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 400 }}>
              이번 달 내 자산이 어떻게 움직였는지 곧 보여드릴게요
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-weak)',
              background: 'var(--track)',
              borderRadius: 8,
              padding: '5px 10px',
              flex: 'none',
            }}
          >
            준비 중
          </span>
        </div>
      )}

      {/* ROW 1: 총자산 히어로 + 목표버킷 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 26, alignItems: 'stretch' }}>
        <DeepCard aria-busy={summaryQuery.isPending || heroBlockedByAllocation}>
          {summaryQuery.isPending || heroBlockedByAllocation ? (
            <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
          ) : summaryQuery.error ? (
            <div style={ERROR_TEXT_STYLE_DEEP}>{summaryQuery.error.message}</div>
          ) : heroAllocationErrored ? (
            <div style={ERROR_TEXT_STYLE_DEEP}>{allocationQuery.error?.message}</div>
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
              <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>총 자산</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
                <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
                  {hero.totalFmt}
                  <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
                </div>
              </div>
              <AbbrevCaption amountKrw={hero.totalAssetKrw} deep />
              {/* summary 스냅샷이 아직 없으면(계좌 등록 첫날) 증감액을 계산할 근거가 없다 — 0원으로
                  단정하지 않되, 줄이 말없이 사라지면 "올해 자산 현황" 카드와 설명 수준이 어긋나므로
                  같은 톤의 안내 문구로 대체한다(시점을 약속하지 않는다 — 배치 실행 시각 미확정). */}
              {hero.hasSnapshotHistory && hero.monthChangeKrw !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--deep-label)', fontWeight: 400 }}>이번 달 증감액</span>
                  <StatBadge
                    direction={hero.monthChangeKrw >= 0 ? 'up' : 'down'}
                    text={`${fmt(Math.abs(hero.monthChangeKrw))}원`}
                    bg="var(--deep-chip)"
                    color={hero.monthChangeKrw >= 0 ? 'var(--deep-up)' : 'var(--deep-down)'}
                  />
                </div>
              ) : (
                <div style={{ ...EMPTY_TEXT_STYLE_DEEP, marginTop: 14 }}>
                  자산 이력이 쌓이면 이번 달 증감을 확인할 수 있어요
                </div>
              )}
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
                    {ag.hasProgressData && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>{ag.pct}%</div>
                    )}
                  </div>
                  {ag.hasProgressData ? (
                    <>
                      <div style={{ height: 6, background: 'var(--track)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${ag.barPct}%`, background: ag.color, borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                        {ag.currentFmt} / {ag.targetFmt}원
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{ag.subCaption}</div>
                    </>
                  ) : (
                    // 이 축(annual/monthly)의 progressPercent가 null인 경우(계산 근거 없음, EXPIRED
                    // 목표의 monthly 등) — 진행률을 단정하지 않고 subCaption의 중립 안내만 보여준다.
                    <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{ag.subCaption}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ROW 2: 구성비율 + 이번달 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <Card style={{ padding: 24 }} aria-busy={summaryQuery.isPending || heroBlockedByAllocation}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>올해 자산 현황</div>
            {trendAsOf && <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{isoDateToDisplay(trendAsOf)} 기준</span>}
          </div>
          {summaryQuery.isPending || heroBlockedByAllocation ? (
            <div aria-busy style={{ ...EMPTY_TEXT_STYLE, marginTop: 14 }}>—</div>
          ) : summaryQuery.error ? (
            <div style={{ ...ERROR_TEXT_STYLE, marginTop: 14 }}>{summaryQuery.error.message}</div>
          ) : heroAllocationErrored ? (
            <div style={{ ...ERROR_TEXT_STYLE, marginTop: 14 }}>{allocationQuery.error?.message}</div>
          ) : !hero || hero.isEmpty ? (
            <EmptyState style={{ marginTop: 14 }} text="계좌를 추가하면 올해 자산 현황을 볼 수 있어요." />
          ) : !hero.hasSnapshotHistory || hero.yearChangeKrw === null || hero.yearChangeFmt === null ? (
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
                      {/* 모바일에서는 카드 폭이 좁아 두 줄로 접히므로 같은 뜻의 짧은 문구로 줄인다. */}
                      <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>
                        {isMobile ? '올해 총자산 추이' : '올해 1월~12월 총자산 추이'}
                        {hasFutureRange ? (isMobile ? ` · ${trendFutureFromMonth}월 이후 예정` : ` · ${trendFutureFromMonth}월 이후는 예정 구간`) : ''}
                      </span>
                      {trendPctFmt && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: trendPositive ? 'var(--up)' : 'var(--down)' }}>
                          {trendPctFmt}
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

        <Card style={{ padding: 24 }} aria-busy={allocationQuery.isPending}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>자산 구성 비율</div>
          {allocationQuery.isPending ? (
            <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
          ) : allocationQuery.error ? (
            <div style={ERROR_TEXT_STYLE}>{allocationQuery.error.message}</div>
          ) : !hasAllocationData ? (
            <EmptyState text="계좌를 추가하면 자산 구성 비율을 볼 수 있어요." />
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
          {/* 로딩 중에는 아직 목록 길이를 알 수 없어 숨긴 채로 시작하고(깜빡임 방지), 데이터가
              없다고 확정된 경우(빈 배열)에만 계속 숨긴다 — 에러 상태는 목록 길이와 무관하게
              "다시 볼 것"이 있을 수 있으므로 그대로 노출한다. */}
          {!institutionsPending && (institutionsError || dashboardInstitutions.length > 0) && (
            <button
              type="button"
              onClick={() => setState({ modalOpen: 'institutions' })}
              style={
                isMobile
                  ? { border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', display: 'inline-block', padding: '15px 10px', margin: '-15px -10px' }
                  : { border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', padding: 0 }
              }
            >
              전체 보기 ›
            </button>
          )}
        </div>
        {institutionsPending ? (
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        ) : institutionsError ? (
          <div style={ERROR_TEXT_STYLE}>{institutionsError.message}</div>
        ) : dashboardInstitutions.length === 0 ? (
          <EmptyState text={DASHBOARD_INSTITUTIONS_EMPTY_TEXT} />
        ) : (
          // rgrid-cards가 아니라 전용 클래스를 쓴다 — 그 클래스의 <=900px 규칙(1fr로 강제)이
          // 여기서 원하는 모바일(<=767px) 2열 규칙과 달라, 같이 쓰면 !important 우선순위 때문에
          // 모바일 2열이 항상 이겨야 할 규칙에 절대 도달하지 못한다(base.css 참고).
          <div className="rgrid-institutions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
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
