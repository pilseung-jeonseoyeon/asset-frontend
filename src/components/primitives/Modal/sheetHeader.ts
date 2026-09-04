// 모바일 바텀시트의 상단 고정(sticky) 헤더 규격.
//
// Modal.tsx가 아니라 별도 파일인 이유: Modal.tsx는 컴포넌트만 export해야 린트
// (react/only-export-components)가 깨끗하다. 값과 순수 함수는 여기에 둔다.

import type { CSSProperties } from 'react'

/** 모바일 시트 위쪽 그래버 블록의 높이(패널 위 패딩 20 + 막대 4 + 아래 여백 14). */
export const SHEET_GRABBER_BLOCK_PX = 38

/**
 * 모바일 바텀시트에서 헤더(제목 + 닫기 버튼)를 위에 고정하는 스타일.
 *
 * 시트는 패널 자신이 스크롤 컨테이너라(basePanelStyle의 overflowY:'auto'), 헤더에 sticky를 걸면
 * 목록을 아무리 내려도 제목과 X 버튼이 위에 남는다. 그래버 블록이 이미 top:0을 차지하고 있으므로
 * 헤더는 그 아래(SHEET_GRABBER_BLOCK_PX)에 붙인다.
 *
 * 데스크톱에서는 빈 객체를 돌려준다 — 마우스에는 스크롤바가 있고, 패널 패딩(30)이 달라 같은
 * 음수 마진을 쓸 수 없다. 데스크톱까지 고정이 필요하면 호출부가 따로 정한다(AddAccountModal 참고).
 *
 * 호출부는 자기 헤더 style **뒤에** 펼쳐야 한다 — margin 단축 속성이 헤더의 marginBottom을 덮어야
 * 하기 때문이다. 원래 marginBottom 값은 gapBelow로 넘긴다(그래야 화면 간격이 그대로 유지된다).
 * 그 여백의 일부를 padding으로 옮기는 이유는, 헤더 바로 아래 여백까지 sticky 블록에 포함시켜야
 * 스크롤되는 내용이 제목에 딱 붙어 지나가지 않기 때문이다.
 */
export function sheetStickyHeaderStyle(isMobile: boolean, gapBelow = 22): CSSProperties {
  if (!isMobile) return {}
  const pad = Math.min(gapBelow, 12)
  return {
    position: 'sticky',
    top: SHEET_GRABBER_BLOCK_PX,
    zIndex: 3,
    background: 'var(--surface)',
    margin: `0 -18px ${gapBelow - pad}px`,
    padding: `0 18px ${pad}px`,
  }
}
