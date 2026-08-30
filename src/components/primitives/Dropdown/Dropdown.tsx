// 드롭다운 트리거 + 옵션 목록 패널. maxHeight는 인스턴스마다 다르므로(분류 드롭다운 200px,
// 계좌 드롭다운 180px) 하드코딩하지 않고 prop으로 받는다.
// 부모 요소에 `position:relative`가 있어야 한다.
//
// 패널은 모바일·데스크톱 모두 `position:absolute`가 아니라 `position:fixed` 뷰포트 앵커
// (usePopoverAnchor)를 쓴다. Modal.tsx의 기본 패널 스타일은 overflow:visible이지만 대부분의
// 호출부가 panelStyle로 `maxHeight:86vh; overflow:auto`를 덮어쓰기 때문에
// (`grep -rn "panelStyle=" src/`), position:absolute인 패널은 모달의 스크롤 박스에 갇혀 잘리고
// 모달 자체에 스크롤이 생긴다. 트리거의 화면 좌표(rect)에 fixed로 앵커링하면 조상의 overflow
// 클리핑을 통째로 벗어나 모달 밖으로 넘쳐 떠 있을 수 있다. 폭은 DatePicker(고정 240px)와 달리
// **트리거 자신의 폭**을 그대로 쓴다 — 기존 데스크톱 스타일이 left:0/right:0으로 필드 폭에
// 맞춰져 있었으므로 그 겉모습을 유지하는 값이다. 오른쪽 뷰포트 밖으로 나가지 않게 left는 클램프한다.
// 측정 전(anchor.rect === undefined, dd.open이 막 켜진 첫 렌더)에는 원래의 position:absolute 배치가
// 폴백으로 남아 팝오버가 스타일 없이 그려지지 않는다.
//
// 열림 방향(openAbove)은 패널의 실측 높이(panelRef.scrollHeight를 maxHeight로 clamp한 값)를
// preferredHeight로 넘겨 결정한다 — usePopoverAnchor의 기본값(160px 상수)은 옵션이 많은 목록의 실제
// 높이보다 작아서, 아래로 열어도 '충분한 공간이 있다'고 판단해놓고 정작 마지막 행이 잘리는 경우가
// 생긴다(DatePicker.tsx가 같은 이유로 실측값을 넘긴다).
//
// o.meta/o.leading: 옵션에 보조 정보 한 줄(기관명)과 아이콘(BankIcon)을 함께 실을 수 있다.
// key는 o.id가 있으면 그걸, 없으면 o.name으로 폴백한다(계좌처럼 이름이 겹칠 수 있는 목록에서
// o.name만 쓰면 React key가 충돌한다).
//
// 렌더 분기는 옵션 하나 단위가 아니라 **드롭다운 전체(dd.options) 단위**다 — meta/leading을 쓰는
// 옵션이 하나도 없는 목록(가계부 분류·종목·기관·계좌·환전 등)은 display:'block'인 예전 렌더를
// 그대로 쓴다(줄바꿈 허용, ellipsis 없음). o.name span에 항상 ellipsis를 걸면 '배달음식/야식'처럼
// 자유 입력 옵션명이 있는 목록에서 줄바꿈되던 이름이 전부 잘린다. 옵션 하나라도 meta/leading을
// 쓰면 그 목록 전체를 새 2줄 레이아웃으로 통일해서, 아이콘이 있는 행과 없는 행(leading 없는 행은
// 그 폭만큼 스페이서로 메워 시작선을 맞춘다)이 한 목록에 섞여도 정렬이 흐트러지지 않게 한다.
// ellipsis도 이 새 레이아웃에만 적용된다.

import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon/Icon'
import type { DropdownState } from '../../../state/selectors/dropdown'
import { stopPropagation } from '../../../state/selectors/modal'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { POPOVER_VIEWPORT_MARGIN, usePopoverAnchor } from '../usePopoverAnchor'

// leading을 쓰는 옵션이 있을 때, leading이 없는 다른 옵션 행에 같은 폭의 빈 스페이서를 넣어 이름
// 시작선을 맞춘다 — 지금 leading을 넘기는 유일한 호출부(QuickStockModal 계좌 드롭다운)가
// BankIcon size=28을 쓰므로 그 값을 그대로 슬롯 폭으로 삼는다.
const LEADING_SLOT_WIDTH = 28

interface DropdownProps {
  dd: DropdownState
  maxHeight?: number
  icon?: string
  footer?: ReactNode
}

export function Dropdown({ dd, maxHeight = 200, icon = 'expand_more', footer }: DropdownProps) {
  const isMobile = useIsMobile()
  const panelRef = useRef<HTMLDivElement>(null)
  // 패널의 실측 높이. scrollHeight는 overflow로 잘려 있어도 잘리기 전 전체 높이를 돌려주므로, 아직
  // 잘못된 방향으로 열려 있는 렌더에서 재도 정확하다. 실제로 화면을 차지하는 높이는 maxHeight로
  // clamp된 값이라 그쪽을 openAbove 판단 기준(preferredHeight)으로 넘긴다. 닫히면 다음에 열릴 때
  // (옵션 목록이 바뀌어 있을 수 있음) 새로 재기 위해 리셋한다.
  const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    if (!dd.open) {
      setNaturalHeight(undefined)
      return
    }
    const el = panelRef.current
    if (el) setNaturalHeight(Math.min(el.scrollHeight, maxHeight))
  }, [dd.open, dd.options.length, isMobile, maxHeight])

  // 모바일·데스크톱 둘 다 position:fixed 앵커링이 필요해 dd.open만으로 활성화한다(위 헤더 주석 참고).
  const anchor = usePopoverAnchor(dd.open, naturalHeight)
  const panelMaxHeight = anchor.maxHeight !== undefined ? Math.min(maxHeight, anchor.maxHeight) : maxHeight
  // 데스크톱: 트리거의 화면 좌표에 트리거와 같은 폭으로 앵커링하되, 오른쪽 뷰포트 밖으로 넘치지 않게
  // 클램프한다. top/bottom은 anchor.style(모바일 풀블리드용)이 이미 같은 GAP 공식으로 계산해둔 값을
  // 그대로 쓴다.
  const triggerWidth = anchor.rect ? anchor.rect.right - anchor.rect.left : 0
  const desktopFixedStyle = !isMobile && anchor.rect && anchor.style
    ? {
        position: 'fixed' as const,
        left: Math.max(POPOVER_VIEWPORT_MARGIN, Math.min(anchor.rect.left, window.innerWidth - triggerWidth - POPOVER_VIEWPORT_MARGIN)),
        right: 'auto' as const,
        width: triggerWidth,
        top: anchor.style.top,
        bottom: anchor.style.bottom,
        maxHeight: panelMaxHeight,
        overflowY: 'auto' as const,
      }
    : undefined
  // 목록 전체(dd.options) 단위 분기 — 위 헤더 주석 참고.
  const hasExtra = dd.options.some((o) => o.meta || o.leading)
  const hasLeading = dd.options.some((o) => o.leading)

  return (
    <>
      {/* minWidth:0 3곳(트리거 flex 컨테이너 + 아래 span) — 계좌 드롭다운처럼 dd.value가 "기관명 ·
          계좌명"으로 길어질 수 있는 호출부가 좁은 flex:1 열(QuickStockModal 계좌/매수일 반반)에 있으면,
          minWidth:0이 없는 flex item은 내용 크기 밑으로 줄어들지 않아 두 줄로 꺾여 옆 필드보다 트리거가
          커진다. ellipsis로 자르려면 컨테이너부터 span까지 min-width 체인을 0으로 열어줘야
          한다 — dd.value가 짧은 기존 드롭다운은 애초에 줄바꿈될 만큼 길지 않아 겉모습이 그대로다. */}
      <div
        ref={anchor.anchorRef}
        onClick={dd.toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer', minWidth: 0 }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{dd.value}</span>
        <Icon name={icon} size={20} color="var(--text-weak)" style={{ flex: 'none' }} />
      </div>
      {dd.open && (
        <div
          ref={panelRef}
          onClick={stopPropagation}
          style={{
            // position:absolute + calc(100%+6px) 아래는 앵커 측정 전(anchor.rect === undefined) 첫
            // 렌더에만 쓰이는 폴백이다 — 측정이 끝나면 아래 두 분기가 덮어쓴다.
            position: 'absolute', left: 0, right: 0, background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 6,
            zIndex: 95, maxHeight: panelMaxHeight, overflow: 'auto',
            ...(anchor.openAbove ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            ...(isMobile ? { ...anchor.style, maxHeight: panelMaxHeight } : desktopFixedStyle),
          }}
        >
          {/* meta/leading을 하나도 안 쓰는 목록은 예전 렌더(display:'block', 줄바꿈 허용)를 그대로
              쓰고, 하나라도 쓰는 목록만 새 2줄 레이아웃 + ellipsis + leading 스페이서를 적용한다
              (hasExtra/hasLeading은 위에서 목록 전체 기준으로 미리 계산해둔다). */}
          {dd.options.map((o) =>
            !hasExtra ? (
              <button
                key={o.id ?? o.name}
                className="mini-hov"
                onClick={o.pick}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit',
                  ...(isMobile ? { minHeight: 44, display: 'flex', alignItems: 'center' } : undefined),
                }}
              >
                {o.name}
              </button>
            ) : (
              <button
                key={o.id ?? o.name}
                className="mini-hov"
                onClick={o.pick}
                style={{
                  display: 'flex', alignItems: 'center', gap: hasLeading ? 8 : 0, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  ...(isMobile ? { minHeight: 44 } : undefined),
                }}
              >
                {hasLeading && (o.leading ?? <span style={{ width: LEADING_SLOT_WIDTH, flex: 'none' }} />)}
                <span style={{ display: 'flex', flexDirection: 'column', gap: o.meta ? 1 : 0, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                  {o.meta && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.meta}</span>}
                </span>
              </button>
            ),
          )}
          {footer}
        </div>
      )}
    </>
  )
}
