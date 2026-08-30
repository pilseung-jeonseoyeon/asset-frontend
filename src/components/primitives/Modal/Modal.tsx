// 공용 모달 껍데기. 스크림(position:fixed;inset:0;background:var(--overlay-scrim)) + 가운데 정렬
// 패널(surface/radius 10/shadow-modal)까지는 모든 모달이 같지만, width/padding/maxHeight/overflow와
// z-index는 제각각이다 — z-index도 §7-1의 '1단계 모달 = 80' 기본값을 따르지 않는 모달이 있으므로
// 호출부가 자기 값을 직접 넘겨야 한다. 여기에 '그냥 써도 되는 기본값'은 없다.
//
// 모바일(<=767px, docs/mobile.md §4): 패널이 바텀시트가 된다. `panelStyle`은 그대로 병합되지만
// (호출부의 padding/overflow 조정은 유지) width/borderRadius/maxHeight는 panelStyle **뒤에**
// 다시 적용해, 호출부의 데스크톱 전용 값(예: 명시적 width나 90vh maxHeight)이 모바일에서 이기지
// 못하게 한다. zIndex는 건드리지 않는다 — §7-1 중첩 순서는 호출부 몫이다.
//
// 모바일 시트는 아래로 스와이프해서 내릴 수 있다(useSheetSwipeDown 참고).
//
// 스크림(배경)을 누르면 닫힌다. 자세한 근거와 pointerdown을 쓰는 이유는 아래
// handleScrimPointerDown 위 주석 참고.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'

interface ModalProps {
  // 스크림(배경)을 누르거나(바로 아래 주석 참고), Esc 키는 Modal 자신이 처리해 이 onClose를
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


// ---------- 바텀시트 아래로 스와이프해서 닫기 (모바일 전용) ----------
//
// 회색 그래버 바가 원래는 장식이었는데, 눌러서 내리는 게 안 된다는 지적을 받아 실제 제스처를 붙였다.
// 규칙:
// - 시트(또는 그 안의 스크롤 영역)를 이미 스크롤해 내려가 있으면 가로채지 않는다 — 먼저 맨 위까지
// 올라와야 드래그가 시작된다. 안 그러면 내용을 훑어 읽다가 시트가 통째로 끌려 내려간다.
// - 세로로 ACTIVATE_PX 이상, 그리고 가로 이동보다 크게 움직여야 "닫기 제스처"로 확정한다
// (탭·가로 스크롤 칩 줄과 구분).
// - 손을 뗐을 때 임계값을 넘겼으면 닫고, 아니면 제자리로 되돌아간다.
//
// React의 onTouchMove는 루트에 passive로 붙어 preventDefault가 통하지 않는다. 배경 페이지 스크롤과
// 크롬 모바일의 "당겨서 새로고침"을 막으려면 preventDefault가 꼭 필요하므로, 패널 엘리먼트에
// { passive: false } 네이티브 리스너를 직접 붙인다.
// 패널만 보는 게 아니라 터치가 시작된 지점에서 패널까지 거슬러 올라가며 "이미 스크롤해 내려간
// 영역"이 있는지 본다 — TermsDetailOverlay처럼 패널 대신 안쪽 div가 스크롤되는 모달에서, 그 글을
// 읽어 내려가던 중 아래로 훑으면 시트가 닫혀버리는 걸 막기 위해서다.
function isScrolledDown(target: EventTarget | null, panel: HTMLElement): boolean {
  let node = target instanceof Element ? target : null
  while (node) {
    if (node.scrollTop > 0) return true
    if (node === panel) return false
    node = node.parentElement
  }
  return false
}

const SHEET_DRAG_ACTIVATE_PX = 6
const SHEET_DRAG_CLOSE_PX = 96
const SHEET_DRAG_CLOSE_RATIO = 0.28

function useSheetSwipeDown(
  panelRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onCloseRef: React.RefObject<() => void>,
  // 드롭다운·달력 팝오버는 position:fixed지만 DOM상으로는 이 패널의 자손이라 터치가 여기까지
  // 버블링된다. 팝오버가 열려 있는 동안 목록을 훑어 내리면 시트가 같이 끌려 내려가므로 막는다.
  popoverOpenRef: React.RefObject<unknown>,
) {
  // dragY는 "지금 손가락을 따라 얼마나 내려와 있는가". 0이면 transform 자체를 걸지 않는다 —
  // transform이 남아 있으면 그 요소가 position:fixed 자손의 기준 상자가 되어, 시트 안에서
  // usePopoverAnchor로 띄우는 드롭다운·달력(둘 다 position:fixed)이 엉뚱한 자리에 붙는다.
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const panel = panelRef.current
    if (!enabled || !panel) return

    let startX = 0
    let startY = 0
    let tracking = false // 터치가 시작돼 후보로 지켜보는 중
    let active = false // 임계값을 넘어 닫기 제스처로 확정된 상태
    let dy = 0

    const stop = () => {
      tracking = false
      active = false
      dy = 0
      setIsDragging(false)
      setDragY(0)
    }

    const handleStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || popoverOpenRef.current != null || isScrolledDown(e.target, panel)) {
        tracking = false
        return
      }
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
      active = false
      dy = 0
    }

    const handleMove = (e: TouchEvent) => {
      if (!tracking) return
      const deltaY = e.touches[0].clientY - startY
      const deltaX = e.touches[0].clientX - startX
      if (!active) {
        // 위로 끌거나 가로로 더 많이 움직였으면 이번 터치는 시트 드래그로 쓰지 않는다.
        if (deltaY < 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
          tracking = false
          return
        }
        if (deltaY <= SHEET_DRAG_ACTIVATE_PX) return
        active = true
        setIsDragging(true)
      }
      dy = Math.max(0, deltaY)
      // 브라우저가 이미 스크롤을 시작한 뒤에는 cancelable이 false라 호출할 수 없다(콘솔 경고 방지).
      if (e.cancelable) e.preventDefault()
      setDragY(dy)
    }

    const handleEnd = () => {
      if (!active) {
        tracking = false
        return
      }
      // 짧은 시트는 96px를 못 채우고 화면 밖으로 나가버리므로 높이 비율도 함께 본다.
      const threshold = Math.min(SHEET_DRAG_CLOSE_PX, panel.offsetHeight * SHEET_DRAG_CLOSE_RATIO)
      const shouldClose = dy >= threshold
      stop()
      if (shouldClose) onCloseRef.current()
    }

    panel.addEventListener('touchstart', handleStart, { passive: true })
    panel.addEventListener('touchmove', handleMove, { passive: false })
    panel.addEventListener('touchend', handleEnd)
    panel.addEventListener('touchcancel', stop)
    return () => {
      panel.removeEventListener('touchstart', handleStart)
      panel.removeEventListener('touchmove', handleMove)
      panel.removeEventListener('touchend', handleEnd)
      panel.removeEventListener('touchcancel', stop)
    }
  }, [enabled, panelRef, onCloseRef, popoverOpenRef])

  return { dragY, isDragging }
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

  const panelRef = useRef<HTMLDivElement>(null)
  const { dragY, isDragging } = useSheetSwipeDown(panelRef, isMobile, onCloseRef, openDropdownRef)

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
        // 시트 끝까지 스크롤했을 때 그 힘이 뒤 페이지로 넘어가(또는 크롬 모바일의 당겨서 새로고침으로)
        // 이어지지 않게 막는다 — 스와이프로 닫기와 뒤 페이지 스크롤이 섞이면 둘 다 어정쩡해진다.
        overscrollBehavior: 'contain',
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

  // 스크림(바깥 영역)을 누르면 닫는다(사용자 요청으로 되돌림). 원래는 에
  // "폼 작성 중 배경을 실수로 눌러 입력이 통째로 날아간다"는 이유로 막아뒀는데, 지금은 가계부 거래
  // 입력 모달이 닫힐 때 작성 중이던 내용을 기억했다가 다시 열 때 되살리므로(LedgerEntryModal의
  // entryDraft) 그 사고의 대가가 훨씬 가벼워졌다.
  // **다만 초안 복원이 있는 곳은 아직 가계부 거래 입력 모달뿐이다** — 계좌 등록·종목 추가처럼 긴 폼을
  // 가진 다른 모달은 배경을 누르면 입력이 그대로 사라진다(사용자 확인). 그 모달들에도
  // 초안 복원을 넣자는 이야기가 나오면 같은 방식(닫기 직전 AppState에 초안 보관 → 열 때 복원)을 따른다.
  //
  // **pointerdown에서 기억해 두고 click에서 닫는다** — 두 단계로 나눈 이유가 각각 있다:
  // - pointerdown 시점에 바로 닫으면, 손을 떼는 순간 그 좌표에는 이미 모달이 없어 뒤에 드러난
  // 헤더 버튼 등이 대신 눌린다("고스트 클릭"). 모바일 바텀시트는 스크림이 화면 위쪽이라 그 자리가
  // 정확히 헤더의 알림·퀵추가 버튼이다.
  // - 반대로 click만 보면, 패널 안에서 글자를 드래그 선택하다 바깥에서 손을 뗐을 때 click의 대상이
  // 공통 조상(=스크림)이 되어 의도치 않게 닫힌다. 그래서 "누르기도 스크림에서 시작했는가"를
  // pointerdown에서 함께 확인한다.
  // - 드롭다운·달력이 열려 있으면 그 팝오버용 투명 캐처(zIndex 94)가 화면을 덮고 있어 두 이벤트의
  // target이 스크림이 아니게 된다 → 바깥을 누르면 팝오버만 닫히고 모달은 남는다(Esc와 같은 층위).
  const scrimPressedRef = useRef(false)
  const handleScrimPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    scrimPressedRef.current = e.target === e.currentTarget
  }
  const handleScrimClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrimPressedRef.current) return
    scrimPressedRef.current = false
    if (e.target !== e.currentTarget) return
    onCloseRef.current()
  }

  return (
    <div
      onPointerDown={handleScrimPointerDown}
      onClick={handleScrimClick}
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
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className={isMobile ? 'sheet-up' : undefined}
        style={{
          ...basePanelStyle,
          ...panelStyle,
          ...mobileForcedStyle,
          // dragY가 0이면 transform을 아예 걸지 않는다(위 useSheetSwipeDown 주석 — position:fixed
          // 팝오버가 이 패널 기준으로 붙어버리는 걸 피하려는 것). 손을 뗀 뒤 제자리로 돌아가는 구간만
          // transition을 준다 — 끄는 동안에는 손가락을 그대로 따라가야 한다.
          ...(dragY > 0 ? { transform: `translateY(${dragY}px)` } : null),
          ...(isMobile ? { transition: isDragging ? 'none' : 'transform .2s cubic-bezier(.2,.7,.3,1)' } : null),
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
          // 이 바 자체에 리스너를 붙이지 않는다 — 4px짜리 막대만 잡으라고 하면 너무 작다.
          // 스와이프는 패널 전체에서 받고(useSheetSwipeDown), 이 바는 "내릴 수 있다"는 표시다.
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

// 모달 공용 헤더: 아이콘 사각형 + 제목 + 닫기 버튼.
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
