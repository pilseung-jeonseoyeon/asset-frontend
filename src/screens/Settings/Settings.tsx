// 설정 화면(카드 3개 그리드).
// 모달 4개(modalGeneral/modalData/modalCustom/modalCategorySettings)는 다른 모달과 마찬가지로
// AppShell 레벨에 마운트된다(모달을 화면 안에 중첩하지 않는 이유는 AppShell.tsx 주석 참고).

import { Icon } from '../../components/primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'

interface SettingsCardDef {
  icon: string
  title: string
  desc: string
  modal: string
}

const CARDS: SettingsCardDef[] = [
  { icon: 'tune', title: '일반 및 디스플레이', desc: '앱의 시각적인 테마와 기본적인 사용 환경을 세팅합니다.', modal: 'general' },
  { icon: 'database', title: '데이터 관리 및 백업', desc: '기록을 안전하게 이관하고 보존합니다.', modal: 'data' },
  { icon: 'dashboard_customize', title: '자산 · 가계부 맞춤 설정', desc: '라이프스타일에 맞게 자산 관리 기준을 조율합니다.', modal: 'custom' },
]

export function Settings() {
  const { setState } = useAppState()

  return (
    <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
      {CARDS.map((card) => (
        <section
          key={card.modal}
          onClick={() => setState({ modalOpen: card.modal })}
          style={{
            cursor: 'pointer', background: 'var(--surface)', borderRadius: 10, border: '0.5px solid var(--border)',
            boxShadow: 'var(--shadow-card)', padding: 28, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name={card.icon} size={22} />
            </span>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{card.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.5 }}>{card.desc}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
            자세히 보기
            <Icon name="chevron_right" size={16} />
          </div>
        </section>
      ))}
    </div>
  )
}
