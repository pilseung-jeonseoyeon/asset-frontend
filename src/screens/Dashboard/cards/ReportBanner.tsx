// 월간 리포트 배너 — 누르면 ReportOverlay(GET /dashboard/reports)를 현재 정산월로 연다.
// 계좌가 없는 신규 사용자에게는 숨긴다("자산이 있어야 볼 리포트가 있다"는 최소 조건).
// hero.isEmpty는 allocation 실시간 합계까지 반영하므로 계좌 등록 첫날에도 계좌가 있으면
// 정상 노출된다 — 의도된 동작. hero가 아직 없는 로딩/에러 상태에서도 숨겨서 데이터 도착 시
// 배너가 깜빡이며 나타났다 사라지는 것을 막는다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { useAppState } from '../../../state/AppStateContext'
import { useDashboardHero } from '../hooks/useDashboardHero'

export function ReportBanner() {
  const { setState } = useAppState()
  const { hero } = useDashboardHero()
  if (!hero || hero.isEmpty) return null

  // 열 때마다 reportPeriod를 null(현재 정산월)로 되돌린다 — 지난달을 보다 닫은 뒤 다시 열면
  // "이번 달 리포트"라는 배너 문구와 다른 달이 뜨면 안 된다.
  const openReport = () => setState({ reportOpen: true, reportPeriod: null, reportSlide: 0 })

  return (
    <button
      type="button"
      onClick={openReport}
      className="qbtn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '11px 18px',
        borderRadius: 10,
        border: '0.5px solid var(--border)',
        textAlign: 'left',
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'inherit',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: 'var(--accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        <Icon name="auto_awesome" size={17} color="var(--accent)" ariaHidden />
      </span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>이번 달 리포트</span>
        <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 400 }}>
          이번 달 내 자산이 어떻게 움직였는지 확인해 보세요
        </span>
      </span>
      <Icon name="chevron_right" size={18} color="var(--text-weak)" ariaHidden />
    </button>
  )
}
