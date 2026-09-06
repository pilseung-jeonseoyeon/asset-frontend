// 자산 목표 카드 — GET /goals의 연간·월간 진행률 두 줄. 목표 미설정이면 등록 유도.

import { Card } from '../../../components/primitives/Card/Card'
import { useAppState } from '../../../state/AppStateContext'
import { buildAssetGoals } from '../../../data/dashboardView'
import { useGetGoal } from '@/services/goal'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState } from './shared'

export function GoalCard() {
  const { setState } = useAppState()
  const goalQuery = useGetGoal({})
  const assetGoals = goalQuery.goal ? buildAssetGoals(goalQuery.goal) : []
  const openAddGoal = () => setState({ openModal: 'addGoal', addGoalReturnTo: null })

  return (
    <Card aria-busy={goalQuery.isPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={CARD_TITLE_STYLE}>자산 목표</div>
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
                // 이 축(annual/monthly)의 progressPercent가 null인 경우(계산 근거 없음, EXPIRED
                // 목표의 monthly 등) — 진행률을 단정하지 않고 subCaption의 중립 안내만 보여준다.
                <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>{ag.subCaption}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
