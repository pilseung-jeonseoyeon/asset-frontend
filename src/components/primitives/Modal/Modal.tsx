// Source: secret/Asset Manager v14.dc.html L1379-1396 (modalAddAccount — the confirmed instance this
// shell is built from). Scrim (position:fixed;inset:0;background:var(--overlay-scrim)) + centered panel
// (surface/radius10/shadow-modal) is consistent structure across the 14 modals, but width/padding/
// maxHeight/overflow AND z-index are NOT uniform — modalAddAccount itself uses z-index:90, not the
// §7-1 "1st-level modal = 80" default, so every caller must pass its own literal zIndex/width/panelStyle
// read from that modal's own dc.html block. Nothing here is a safe-to-reuse default.
//
// Mobile (<=767px, docs/mobile.md §4): the panel becomes a bottom sheet. `panelStyle` is still merged in
// (so callers keep their padding/overflow tweaks), but width/borderRadius/maxHeight are re-applied AFTER
// panelStyle so a caller's desktop-only values for those three (e.g. an explicit width or 90vh maxHeight)
// can never win on mobile. zIndex is untouched — callers' §7-1 nesting order still applies.

import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'

interface ModalProps {
  // 스크림 클릭으로는 닫지 않지만(바로 아래 주석 참고), Esc 키는 Modal 자신이 처리해 이 onClose를
  // 호출한다 — 호출부는 여전히 ModalHeader나 자체 X/취소 버튼에도 같은 핸들러를 넘겨야 한다(닫을
  // 방법이 Esc뿐인 모달이 생기는 걸 막기 위해 필수로 남겨둔다).
  onClose: () => void
  zIndex: number
  width: number | string
  panelStyle?: CSSProperties
  children: ReactNode
}

// Esc 키는 "가장 위에 떠 있는 모달 하나만" 반응해야 한다(중첩 모달에서 아래 모달까지 같이 닫히면
// 예측 불가능해진다 — 지시 §3). Modal은 각자 독립된 컴포넌트 트리에서 마운트되므로, 어떤 인스턴스가
// "가장 위"인지 알려줄 공유 상태가 필요하다 — 마운트된 Modal들을 이 모듈 스코프 배열에 등록해두고,
// zIndex가 가장 큰 항목(동률이면 가장 나중에 마운트된 항목)만 Esc를 처리하게 한다. Context를 새로
// 만들지 않은 건, 이 저장소에 이미 모든 모달이 AuthenticatedApp에 항상 마운트돼 있고 zIndex 리터럴로
// 겹침 순서를 표현하는 관례(파일 상단 주석 §7-1)가 있어 그 리터럴을 그대로 재사용할 수 있기 때문이다.
let modalStack: { id: number; zIndex: number }[] = []
let nextModalId = 0

function isTopmostModal(id: number): boolean {
  if (modalStack.length === 0) return false
  const top = modalStack.reduce((a, b) => (b.zIndex > a.zIndex || (b.zIndex === a.zIndex && b.id > a.id) ? b : a))
  return top.id === id
}

export function Modal({ onClose, zIndex, width, panelStyle, children }: ModalProps) {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const idRef = useRef(0)
  if (idRef.current === 0) idRef.current = ++nextModalId

  // 마운트된 동안만 스택에 등록한다 — 언마운트(모달 닫힘) 시 반드시 해제해야 다음에 열리는 모달이
  // "가장 위"를 잘못 판정하지 않는다.
  useEffect(() => {
    const entry = { id: idRef.current, zIndex }
    modalStack.push(entry)
    return () => {
      modalStack = modalStack.filter((m) => m !== entry)
    }
  }, [zIndex])

  // onClose(호출부마다 매 렌더 새로 만들어지는 클로저)와 state.openDropdown(다른 모달/드롭다운
  // 조작에도 바뀜)을 그대로 useEffect 의존성에 두면, 이 컴포넌트가 마운트돼 있는 내내 리스너가
  // 거의 매 렌더 해제·재등록된다 — 리스너 자체는 가벼워 눈에 띄는 성능 문제는 아니지만, 등록/해제가
  // 잦을수록 "그 사이 찰나에 키 입력이 비어 있는 창"이 생길 여지가 늘어난다. 최신 값은 ref로만
  // 갱신하고 리스너는 마운트 시 한 번만 붙인다(setState는 useAppState가 useCallback([])으로 고정해
  // 두므로 이 배열 자체는 사실상 마운트 1회만 실행된다).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const openDropdownRef = useRef(state.openDropdown)
  openDropdownRef.current = state.openDropdown

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // isComposing: 한글 등 조합형 IME가 후보를 조합하는 도중의 Escape는 IME 자체가 처리해야 할
      // 취소 신호다(예: 조합 중이던 글자를 지우는 동작) — 이 시점에 모달까지 닫아버리면 입력 중이던
      // 글자만 사라지길 기대한 사용자가 모달이 닫혀 작성 내용을 통째로 잃는다.
      if (e.key !== 'Escape' || e.isComposing) return
      if (!isTopmostModal(idRef.current)) return
      // 드롭다운/달력 팝오버가 열려 있으면(§7-1 zIndex:94 스크림과 같은 openDropdown 필드) Esc는
      // 팝오버부터 닫고 모달은 그대로 둔다 — 안 그러면 폼 작성 중 날짜를 고르다 Esc 한 번에 모달
      // 전체가 닫혀 입력이 날아간다(지시 §2). 팝오버를 여는 모달은 항상 이 인스턴스와 같은(가장 위)
      // 모달이므로, 위 isTopmostModal 체크를 통과한 인스턴스가 처리하는 것으로 충분하다.
      if (openDropdownRef.current !== null) {
        setState({ openDropdown: null })
        return
      }
      onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setState])

  const basePanelStyle: CSSProperties = isMobile
    ? {
        background: 'var(--surface)',
        borderRadius: '10px 10px 0 0',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
        width: '100%',
        maxWidth: '100%',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)',
      }
    : {
        background: 'var(--surface)',
        borderRadius: 10,
        padding: 30,
        width,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'visible',
        boxShadow: 'var(--shadow-modal)',
      }

  // `padding` is forced too: EditAccountModal passes a desktop padding ('42px 30px') that would drop the
  // safe-area bottom inset, leaving the sheet's last row under the iPhone home indicator.
  const mobileForcedStyle: CSSProperties | undefined = isMobile
    ? {
        width: '100%',
        borderRadius: '10px 10px 0 0',
        maxHeight: '88vh',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
      }
    : undefined

  // 스크림(바깥 영역) 클릭으로는 닫지 않는다(2026-08-19, 사용자 피드백 — dc.html 원본과 의도적으로
  // 어긋나는 지점). 폼을 작성하던 중 배경을 실수로 눌러 입력 내용이 통째로 날아가는 사고가 실사용에서
  // 반복 보고됐다 — 닫기는 ModalHeader의 X 버튼이나 각 모달의 "취소" 버튼처럼 명시적인 조작으로만
  // 일어나야 한다. 이 컴포넌트를 쓰는 모든 호출부가 눈에 보이는 닫기 수단을 갖추고 있는지는
  // Modal을 새로 쓸 때마다 직접 확인할 것 — 스크림 클릭이 유일한 탈출구였던 곳이 있으면 안 된다.
  // 스크림 클릭을 없앤 대신 키보드 사용자를 위한 탈출구로 Esc는 남겨뒀다(위 useEffect) — 다만 Esc는
  // "가장 위 모달"에서만 동작하고, 열린 팝오버부터 닫으므로 입력 도중 실수로 폼 전체가 닫히는
  // 사고까지 재현하지는 않는다.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex,
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isMobile ? 'sheet-up' : undefined}
        style={{
          ...basePanelStyle,
          ...panelStyle,
          ...mobileForcedStyle,
        }}
      >
        {isMobile && (
          // flexShrink:0 matters for callers whose panelStyle makes the panel itself a flex container
          // (currently only TermsDetailOverlay, via `display:'flex', flexDirection:'column'`) — without it,
          // this 4px bar is a shrinkable flex item like any other, and once panel content forces the
          // maxHeight clamp to kick in, shrinkage gets distributed by flex-basis share and this shrinks
          // right along with everything else (down to ~2px, not 0, but visibly squashed). The other 15
          // Modal callers leave panelStyle's `display` at the block default, so the grabber isn't a flex
          // item there and this has no effect on them.
          <div
            aria-hidden="true"
            style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px', flexShrink: 0 }}
          />
        )}
        {children}
      </div>
    </div>
  )
}

// Source: dc.html L1387-1396 (modalAddAccount header) — icon-square + title + close button.
// Confirmed against one instance; diff against each modal's own header before reuse (extraction discipline).
interface ModalHeaderProps {
  icon: string
  title: string
  onClose: () => void
}

export function ModalHeader({ icon, title, onClose }: ModalHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="ms" style={{ fontSize: 20 }}>
            {icon}
          </span>
        </span>
        <div style={{ fontSize: 16.5, fontWeight: 700 }}>{title}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: 'none',
          background: 'var(--track)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <span className="ms" style={{ fontSize: 19, color: 'var(--text-mid)' }}>
          close
        </span>
      </button>
    </div>
  )
}
