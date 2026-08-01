// Source: secret/Asset Manager v14.dc.html L840-1038 (isDash block) — transcribed verbatim.
// No modals owned by this screen (리포트 슬라이드쇼 is a global overlay pattern built in Phase 10, per
// plan). openAddGoalFromDashboard/openInstitutionsAll set modalOpen state that Assets-phase modals
// (Phase 10) will render — clicking them now is a no-op until those modals exist, which is expected.

import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { StatBadge } from '../../components/primitives/StatBadge/StatBadge'
import { BankIcon } from '../../components/primitives/BankIcon/BankIcon'
import { DonutChart } from '../../components/primitives/DonutChart/DonutChart'
import { useAppState } from '../../state/AppStateContext'
import { fmt } from '../../utils/format'
import { assetCompositionSegments, assetGoals, dashboardInstitutions, totalAssetsNow } from '../../data/mockDashboard'

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function Dashboard() {
  const { setState } = useAppState()

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
            2026년 6월 리포트 보기
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 400 }}>
            이번 달 내 자산이 어떻게 움직였는지 확인해보세요
          </span>
        </div>
        <Icon name="chevron_right" size={20} color="var(--text-mid)" />
      </button>

      {/* ROW 1: 총자산 히어로 + 목표버킷 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 26, alignItems: 'stretch' }}>
        <DeepCard>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>총 자산</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
              <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
                {fmt(totalAssetsNow)}
                <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500, marginTop: 4 }}>약 12억 8,450만 원</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: 'var(--deep-label)', fontWeight: 400 }}>이번 달 증감액</span>
              <StatBadge direction="up" text="142,300,000원" bg="var(--deep-chip)" color="var(--deep-up)" />
            </div>
          </div>
        </DeepCard>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>자산 목표</div>
          </div>
          <div
            onClick={() => setState({ modalOpen: 'addGoal', addGoalReturnTo: null })}
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
        </Card>
      </div>

      {/* ROW 2: 구성비율 + 이번달 */}
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'stretch' }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>올해 자산 현황</div>
            <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>2026.07.04 기준</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--up)', letterSpacing: '-.02em', whiteSpace: 'nowrap', marginTop: 6 }}>
            +142,300,000원
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>약 1억 4,230만 원</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400 }}>연초 대비</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>올해 1월~12월 총자산 추이 · 7월 이후는 예정 구간</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--up)' }}>+12.4%</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: 92,
                  fontSize: 9.5,
                  color: 'var(--text-mid)',
                  flex: 'none',
                  width: 22,
                }}
              >
                <span>13억</span>
                <span>11억</span>
                <span>9억</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <svg viewBox="0 0 600 92" preserveAspectRatio="none" style={{ width: '100%', height: 92, display: 'block' }}>
                  <rect x="327.3" y="0" width="272.7" height="92" style={{ fill: 'var(--fill-subtle)' }} />
                  <g style={{ stroke: 'var(--track)' }}>
                    <line x1="0" y1="6" x2="600" y2="6" />
                    <line x1="0" y1="46" x2="600" y2="46" />
                    <line x1="0" y1="86" x2="600" y2="86" />
                  </g>
                  <line
                    x1="327.3"
                    y1="0"
                    x2="327.3"
                    y2="92"
                    style={{ stroke: 'var(--border)' }}
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d="M0 37.6 L54.5 32.8 L109.1 27.6 L163.6 23.0 L218.2 19.7 L272.7 14.0 L327.3 9.1"
                    fill="none"
                    style={{ stroke: 'var(--accent)' }}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx="327.3" cy="9.1" r="3.5" style={{ fill: 'var(--accent)', stroke: 'var(--surface)' }} strokeWidth="2" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-weak)', marginTop: 5 }}>
                  {MONTH_LABELS.map((m) => (
                    <span key={m} style={m === '7월' ? { fontWeight: 700, color: 'var(--accent)' } : undefined}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>자산 구성 비율</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, flex: 1 }}>
            <DonutChart segments={assetCompositionSegments} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, flex: 1, whiteSpace: 'nowrap' }}>
              {assetCompositionSegments
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
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
            최대 비중 <b style={{ color: 'var(--text-strong)' }}>연금·기타 23%</b>
          </div>
        </Card>
      </div>

      {/* ROW 3: 주요 자산 보관처 */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>주요 자산 보관처</div>
          <span
            onClick={() => setState({ modalOpen: 'institutions' })}
            style={{ fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer' }}
          >
            전체 보기 ›
          </span>
        </div>
        <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {dashboardInstitutions.map((inst) => (
            <div key={inst.tokenKey} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <BankIcon tokenKey={inst.tokenKey} size={30} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{inst.name}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
                {fmt(inst.amount)}
                <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>원</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
