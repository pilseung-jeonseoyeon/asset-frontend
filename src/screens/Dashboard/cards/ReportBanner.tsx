// 월간 리포트 배너 — ReportOverlay가 아직 전부 목업이라(CLAUDE.md "아직 목업인 곳은 월간 리포트
// 오버레이 한 곳뿐") 실제 값처럼 읽히는 화면을 열지 않고 "준비 중"만 알린다.
// 클릭 대상이 아니므로 button이 아닌 div로 두고 hover(qbtn)도 붙이지 않는다 — 배지 표기는
// AccountModal의 "준비 중" 행과 같은 규격.
// 계좌가 없는 신규 사용자에게는 숨긴다("자산이 있어야 볼 리포트가 있다"는 최소 조건).
// hero.isEmpty는 allocation 실시간 합계까지 반영하므로 계좌 등록 첫날에도 계좌가 있으면
// 정상 노출된다 — 의도된 동작. hero가 아직 없는 로딩/에러 상태에서도 숨겨서 데이터 도착 시
// 배너가 깜빡이며 나타났다 사라지는 것을 막는다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { useDashboardHero } from '../hooks/useDashboardHero'

export function ReportBanner() {
  const { hero } = useDashboardHero()
  if (!hero || hero.isEmpty) return null

  return (
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
  )
}
