// C안 총자산 요약 카드(흰 카드) — A안의 TotalAssetDeepCard보다 작게, 이번 달 증감·연초 대비·최대
// 비중까지 한 카드에 담는다. 히어로 판정은 useDashboardHero를 그대로 공유(React Query가 요청을 합친다).

import { useNavigate } from 'react-router-dom'
import { Card } from '../../../components/primitives/Card/Card'
import { useAppState } from '../../../state/AppStateContext'
import { buildAllocationSegments, pickTopAllocation } from '../../../data/dashboardView'
import { useDashboardHero } from '../hooks/useDashboardHero'
import { CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState, KoreanUnitsCaption } from './shared'

export function TotalCompactCard() {
  const navigate = useNavigate()
  const { setState } = useAppState()
  const { hero, isHeroPending, heroError, allocationQuery } = useDashboardHero()
  const openAddAccount = () => setState({ quickAddOpen: false, openModal: 'addAccount' })

  const allocationSegments = buildAllocationSegments(allocationQuery.allocation)
  const topAllocation = pickTopAllocation(allocationSegments)

  return (
    <Card style={{ padding: 22 }} aria-busy={isHeroPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={CARD_TITLE_STYLE}>총 자산</div>
        <button type="button" onClick={() => navigate('/assets')} style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', padding: 0 }}>
          자산 ›
        </button>
      </div>
      {isHeroPending ? (
        <div aria-busy style={{ ...EMPTY_TEXT_STYLE, flex: 1, display: 'flex', alignItems: 'center' }}>—</div>
      ) : heroError ? (
        <div style={{ ...ERROR_TEXT_STYLE, flex: 1, display: 'flex', alignItems: 'center' }}>{heroError.message}</div>
      ) : !hero || hero.isEmpty ? (
        <EmptyState
          style={{ flex: 1, justifyContent: 'center' }}
          text="계좌를 추가하고 총자산을 한눈에 확인해보세요"
          ctaLabel="계좌 추가"
          onCta={openAddAccount}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              {hero.totalText}
              <span style={{ fontSize: 13, color: 'var(--text-weak)', fontWeight: 600, marginLeft: 2 }}>원</span>
            </div>
            <KoreanUnitsCaption amountKrw={hero.totalAssetKrw} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '0.5px solid var(--track)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-mid)' }}>이번 달 증감</span>
              {hero.hasSnapshotHistory && hero.monthChangeText !== null ? (
                <b style={{ color: hero.monthChangeKrw !== null && hero.monthChangeKrw >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {hero.monthChangeText}원
                </b>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>이력이 쌓이면 확인할 수 있어요</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-mid)' }}>연초 대비</span>
              {hero.hasSnapshotHistory && hero.yearChangeText !== null ? (
                <b style={{ color: hero.yearChangeKrw !== null && hero.yearChangeKrw >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {hero.yearChangeText}원
                </b>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>이력이 쌓이면 확인할 수 있어요</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-mid)' }}>최대 비중</span>
              {topAllocation ? (
                <b>
                  {topAllocation.label} {topAllocation.percent}%
                </b>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>이력이 쌓이면 확인할 수 있어요</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
