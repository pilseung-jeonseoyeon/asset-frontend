// C안 "이번 달 목표" 카드 — GET /goals의 월 지출 가능액·월 필요 저축액 두 칸 + 월간/연간 진행률
// 두 줄(월간 → 연간 순서, GoalCard.tsx와 같은 줄 렌더링).

import { Card } from '../../../components/primitives/Card/Card'
import { useAppState } from '../../../state/AppStateContext'
import { buildAssetGoals } from '../../../data/dashboardView'
import { formatNumber } from '../../../utils/format'
import { useGetGoal } from '@/services/goal'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState } from './shared'

function StatBox({ label, valueText }: { label: string; valueText: string | null }) {
  return (
    <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{label}</div>
      {valueText === null ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginTop: 6 }}>계산할 수 없어요</div>
      ) : (
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', marginTop: 6 }}>
          {valueText}
          <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 600, marginLeft: 2 }}>원</span>
        </div>
      )}
    </div>
  )
}

export function SpendableGoalCard() {
  const { setState } = useAppState()
  const goalQuery = useGetGoal({})
  const assetGoals = goalQuery.goal ? buildAssetGoals(goalQuery.goal) : []
  // GoalCard와 반대로 여기는 월간 → 연간 순서로 보여준다.
  const orderedGoals = [...assetGoals].sort((a, b) => (a.id === 'monthly' ? -1 : 1) - (b.id === 'monthly' ? -1 : 1))
  const openAddGoal = () => setState({ openModal: 'addGoal', addGoalReturnTo: null })

  const spendableText = goalQuery.goal?.monthlySpendableAmount != null ? formatNumber(goalQuery.goal.monthlySpendableAmount) : null
  const targetText = goalQuery.goal?.monthly.targetAmount != null ? formatNumber(goalQuery.goal.monthly.targetAmount) : null

  return (
    <Card style={{ padding: 24 }} aria-busy={goalQuery.isPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={CARD_TITLE_STYLE}>이번 달 목표</div>
        <button type="button" onClick={openAddGoal} style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', padding: 0 }}>
          목표 수정 ›
        </button>
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
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
            <StatBox label="이번 달 더 써도 되는 금액" valueText={spendableText} />
            <StatBox label="월 필요 저축액" valueText={targetText} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orderedGoals.map((ag) => (
              <div key={ag.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ag.name}</div>
                  {ag.hasProgressData && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-strong)' }}>{ag.percent}%</div>
                  )}
                </div>
                {ag.hasProgressData ? (
                  <>
                    <div style={{ height: 6, background: 'var(--track)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${ag.barPercent}%`, background: ag.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                      {ag.currentText} / {ag.targetText}원
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{ag.subCaption}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{ag.subCaption}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
