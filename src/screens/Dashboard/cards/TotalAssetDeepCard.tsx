// 총자산 딥 카드(A안 대표 카드) — 총자산 + 이번 달 증감 배지. 빈 상태는 카드 단위로 처리한다
// (Assets.tsx의 EmptyAccountsState / Stocks.tsx의 딥카드 빈 상태와 같은 패턴 — 로딩 '—', 에러
// var(--deep-down), 빈 상태 안내문+버튼).

import { Icon } from '../../../components/primitives/Icon/Icon'
import { DeepCard } from '../../../components/primitives/DeepCard/DeepCard'
import { StatBadge } from '../../../components/primitives/StatBadge/StatBadge'
import { useAppState } from '../../../state/AppStateContext'
import { formatNumber } from '../../../utils/format'
import { useDashboardHero } from '../hooks/useDashboardHero'
import { DASHED_CTA_STYLE_DEEP, EMPTY_TEXT_STYLE_DEEP, ERROR_TEXT_STYLE_DEEP } from './cardStyles'
import { KoreanUnitsCaption } from './shared'

export function TotalAssetDeepCard() {
  const { setState } = useAppState()
  const { hero, isHeroPending, heroError } = useDashboardHero()
  const openAddAccount = () => setState({ quickAddOpen: false, openModal: 'addAccount' })

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
          <div style={{ fontSize: 13, color: 'var(--deep-label)', fontWeight: 500, letterSpacing: '.02em' }}>총 자산</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 10 }}>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
              {hero.totalText}
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--deep-label)', marginLeft: 2 }}>원</span>
            </div>
          </div>
          <KoreanUnitsCaption amountKrw={hero.totalAssetKrw} deep />
          {/* summary 스냅샷이 아직 없으면(계좌 등록 첫날) 증감액을 계산할 근거가 없다 — 0원으로
              단정하지 않되, 줄이 말없이 사라지면 "올해 자산 현황" 카드와 설명 수준이 어긋나므로
              같은 톤의 안내 문구로 대체한다(시점을 약속하지 않는다 — 배치 실행 시각 미확정). */}
          {hero.hasSnapshotHistory && hero.monthChangeKrw !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: 'var(--deep-label)', fontWeight: 400 }}>이번 달 증감액</span>
              <StatBadge
                direction={hero.monthChangeKrw >= 0 ? 'up' : 'down'}
                text={`${formatNumber(Math.abs(hero.monthChangeKrw))}원`}
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
  )
}
