// 회원가입 1단계(약관 동의)의 '보기 ›'로 열리는 약관 전문 오버레이.
//
// 컴포넌트 primitives/Modal은 스크림 + 가운데 정렬 카드 + 모바일 바텀시트 전환 + Esc 닫기를 그대로
// 재사용할 수 있어 그 위에 얹는다(바깥 클릭으로는 닫히지 않으므로 닫기는 X 버튼과 Esc뿐이다). 다만
// Modal은 createPortal을 쓰지 않고 트리 제자리에 렌더되므로, DOM 순서상 이 오버레이 뒤에 오는
// 배경 요소(SignupForm의 '다음' 버튼 등)가 Tab으로 여전히 도달 가능하다 — 포커스 가능 요소가
// 닫기 버튼 하나뿐이라도 Tab/Shift+Tab이 그 버튼 안에서 순환하도록 이 컴포넌트가 직접 트랩한다
// (포커스 이동/복귀는 Modal이 제공하지 않아 함께 처리한다 — 이 저장소의 다른 모달도 아직 이걸
// 하는 곳이 없다).
// AppState의 modalOpen에는 묶지 않는다 — 회원가입 화면을 벗어나면 함께 사라져야 하는 화면 전용
// UI 상태라서 SignupForm의 로컬 useState로 관리한다.

import { useEffect, useId, useRef } from 'react'
import type { RefObject } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Modal } from '../../components/primitives/Modal/Modal'
import { useIsMobile } from '../../utils/useMediaQuery'
import { TERMS_DOCUMENTS } from './termsContent'
import type { TermsDocumentKey, TermsSection } from './termsContent'

interface TermsDetailOverlayProps {
  documentKey: TermsDocumentKey
  onClose: () => void
  /** 닫힐 때 포커스를 되돌려줄, 이 오버레이를 연 "보기 ›" 버튼. */
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function TermsDetailOverlay({ documentKey, onClose, returnFocusRef }: TermsDetailOverlayProps) {
  const doc = TERMS_DOCUMENTS[documentKey]
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // 열리면 닫기 버튼으로 포커스를 옮기고 배경 스크롤을 잠근다. 언마운트(닫힘) 시 스크롤 잠금을
  // 반드시 풀고, 포커스를 원래 눌렀던 "보기 ›" 버튼으로 되돌린다 — 안 그러면 스크린리더/키보드
  // 사용자가 오버레이를 닫은 뒤 포커스를 잃고 문서 맨 위부터 다시 탐색해야 한다.
  useEffect(() => {
    closeBtnRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      // returnFocusRef는 SignupForm에 항상 떠 있는 버튼(언마운트되는 React 노드가 아니다)을
      // 가리킨다 — 마운트 시점 값을 캡처해두면, 열려 있는 동안 그 값이 갱신된 경우(예: 포커스
      // 트랩이 뚫려 다른 "보기 ›"가 눌린 경우) 엉뚱한 버튼으로 돌아간다. 실제로 닫히는 지금
      // 시점의 최신 값을 그대로 읽는다.
      //
      // 아래 두 지시어는 살아 있는 억제다 — 이 저장소의 린터는 oxlint지만 eslint-disable 지시어를
      // 그대로 인식하고, .oxlintrc.json의 react 플러그인에 exhaustive-deps가 켜져 있다(지우면 경고
      // 2개가 뜬다). 규칙이 권하는 "effect 안에서 변수로 복사" 조언은 ref가 **언마운트되는 노드**를
      // 가리킬 때의 이야기라 이 경우엔 오히려 위에 적은 문제를 만든다.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      returnFocusRef.current?.focus()
    }
    // deps를 비운 것도 마운트/언마운트에만 반응시키려는 의도다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 포커스 트랩(Tab만). Esc 닫기는 primitives/Modal이 이제 자체적으로 처리하므로(Modal.tsx의
  // document keydown 리스너) 여기서 다시 onClose를 걸면 Escape 한 번에 두 리스너가 같은 onClose를
  // 중복 호출한다 — 결과는 같지만(둘 다 setViewDoc(null)) 불필요하므로 Tab 트랩만 남긴다. Modal이
  // createPortal 없이 트리 제자리에 렌더되므로, 트랩이 없으면 Tab이 오버레이를 넘어 배경(SignupForm의
  // "다음" 버튼 등)까지 도달해 aria-modal="true" 선언과 어긋난다. 포커스 가능 요소가 닫기 버튼
  // 하나뿐이어도 그 버튼 안에서 순환시킨다.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const container = dialogRef.current
      if (!container) return
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const withinContainer = active instanceof Node && container.contains(active)
      if (e.shiftKey) {
        if (!withinContainer || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (!withinContainer || active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Modal
      onClose={onClose}
      zIndex={90}
      width={560}
      panelStyle={{ padding: 0, maxHeight: '86vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div
          className="terms-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '22px 26px 16px',
            borderBottom: '0.5px solid var(--border)',
            flex: 'none',
          }}
        >
          <div>
            <div id={titleId} style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-strong)' }}>
              {doc.title}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }}>시행일 {doc.effectiveDate}</div>
          </div>
          {/* Outer button stays transparent/unsized on desktop (its box == the 34x34 visual span) so it
              only grows into an invisible 44x44 hit area via .tap-44 on mobile — the visible circle
              (inner span) never changes size. */}
          <button ref={closeBtnRef} type="button" onClick={onClose} aria-label="닫기" className="tap-44" style={{ border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--track)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </span>
          </button>
        </div>

        <div className="terms-body" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '20px 26px 26px' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.7, margin: '0 0 18px' }}>{doc.summary}</p>
          <div style={{ borderBottom: '0.5px solid var(--border)', marginBottom: 18 }} />

          {doc.sections.map((section, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 8 }}>{section.heading}</div>
              <TermsSectionBody section={section} />
            </div>
          ))}

          <div style={{ fontSize: 11, color: 'var(--text-weak)', lineHeight: 1.6, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
            {doc.basis}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function TermsSectionBody({ section }: { section: TermsSection }) {
  // 라벨 고정폭(120px) + 값 두 칸짜리 표는 320~360px 폭에서 값 칸이 너무 좁아진다(docs/mobile.md
  // §6) — 모바일에서는 라벨을 위, 값을 아래로 쌓는 1열로 바꾼다.
  const isMobile = useIsMobile()

  return (
    <>
      {section.paragraphs?.map((paragraph, i) => (
        <p key={i} style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.8, margin: i === 0 ? '0 0 10px' : '10px 0' }}>
          {paragraph}
        </p>
      ))}

      {section.bullets && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {section.bullets.map((bullet, i) => (
            <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.8, marginBottom: 6 }}>
              <span aria-hidden="true" style={{ flex: 'none' }}>
                ·
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <div>
          {section.table.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: isMobile ? 4 : '4px 12px',
                padding: '10px 0',
                borderBottom: '0.5px solid var(--track)',
              }}
            >
              <div style={{ flex: isMobile ? 'none' : '0 0 120px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{row.label}</div>
              <div style={{ flex: isMobile ? 'none' : '1 1 160px', minWidth: 0, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.8, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
