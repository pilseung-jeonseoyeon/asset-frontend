// 설정 화면(카드 3개 그리드 + 화면 맨 아래 약관 링크·저작권 표시).
// 약관 링크는 필요한 사람만 찾아보는 정보라 카드 바로 밑이 아니라 화면 바닥에 작게 붙인다
// (2026-09-26 사용자 결정). 루트를 flex: 1 세로 flex로 두고 푸터에 marginTop: 'auto'를 줘서 바닥으로
// 민다 — 부모 main이 세로 flex라서 가능하다(AuthenticatedApp.tsx). 모바일 하단 탭바는 main의 아래
// padding이 이미 비켜 준다.
// 모달 4개(modalGeneral/modalData/modalCustom/modalCategorySettings)는 다른 모달과 마찬가지로
// AppShell 레벨에 마운트된다(모달을 화면 안에 중첩하지 않는 이유는 AppShell.tsx 주석 참고).
// 하단의 약관 링크는 가입 때 동의한 문서(data/termsContent.ts)를 언제든 다시 볼 수 있게 한다 —
// 앱 스토어 심사가 "앱 안에서 약관·개인정보 안내에 닿을 수 있을 것"을 요구하고, 회원이 동의한
// 문서를 다시 확인할 권리가 있어서다. 어떤 문서가 열려 있는지는 이 화면을 벗어나면 사라져도 되는
// UI 상태라 AppState가 아니라 로컬 useState다(SignupForm과 같은 원칙).

import { useRef, useState } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { TermsDetailOverlay } from '../../components/layout/modals/TermsDetailOverlay'
import { useAppState } from '../../state/AppStateContext'
import { TERMS_DOCUMENTS } from '../../data/termsContent'
import type { TermsDocumentKey } from '../../data/termsContent'

interface SettingsCardDef {
  icon: string
  title: string
  description: string
  modal: string
}

const CARDS: SettingsCardDef[] = [
  { icon: 'tune', title: '일반 및 디스플레이', description: '앱의 시각적인 테마와 기본적인 사용 환경을 세팅합니다.', modal: 'general' },
  { icon: 'database', title: '데이터 관리 및 백업', description: '기록을 안전하게 이관하고 보존합니다.', modal: 'data' },
  { icon: 'dashboard_customize', title: '자산 · 가계부 맞춤 설정', description: '라이프스타일에 맞게 자산 관리 기준을 조율합니다.', modal: 'custom' },
]

const TERMS_LINKS: TermsDocumentKey[] = ['service', 'privacy', 'marketing']

export function Settings() {
  const { setState } = useAppState()
  const [viewDoc, setViewDoc] = useState<TermsDocumentKey | null>(null)
  const viewTriggerRef = useRef<HTMLButtonElement | null>(null)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
        {CARDS.map((card) => (
          // 카드 전체가 하나의 버튼이다 — 예전 <section onClick>은 Tab으로 포커스가 가지 않아 키보드로 열 수 없었다.
          <button
            type="button"
            key={card.modal}
            onClick={() => setState({ openModal: card.modal })}
            style={{
              cursor: 'pointer', background: 'var(--surface)', borderRadius: 10, border: '0.5px solid var(--border)',
              boxShadow: 'var(--shadow-card)', padding: 28, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              textAlign: 'left', fontFamily: 'inherit', color: 'inherit', width: '100%',
            }}
          >
            <div>
              <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon name={card.icon} size={22} />
              </span>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.5 }}>{card.description}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
              자세히 보기
              <Icon name="chevron_right" size={16} />
            </div>
          </button>
        ))}
      </div>

      <footer style={{ marginTop: 'auto', paddingTop: 40, textAlign: 'center', fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.7 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '2px 4px' }}>
          {TERMS_LINKS.map((key, i) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span aria-hidden="true" style={{ margin: '0 6px' }}>·</span>}
              <button
                type="button"
                className="tap-44"
                onClick={(e) => {
                  viewTriggerRef.current = e.currentTarget
                  setViewDoc(key)
                }}
                style={{ border: 'none', background: 'transparent', padding: '4px 2px', font: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                {TERMS_DOCUMENTS[key].title}
              </button>
            </span>
          ))}
        </div>
        <div>© 2026 Monit</div>
      </footer>

      {viewDoc && <TermsDetailOverlay documentKey={viewDoc} onClose={() => setViewDoc(null)} returnFocusRef={viewTriggerRef} />}
    </div>
  )
}
