// 모달·오버레이가 떠 있는 동안 뒤 페이지(문서 스크롤)를 잠근다(2026-10-31 사용자 요청 — "레이어 띄우면 밖에는 스크롤
// 안 되게"). 예전엔 데스크톱에서 창 안 내용을 끝까지 내리면 그 힘이 뒤 화면으로 넘어가 페이지가 같이 밀렸다.
//
// 여러 겹이 동시에 떠도(계좌 상세 위에 수정 창 등) 마지막 하나가 닫힐 때만 풀리도록 모듈 스코프에서 참조 수를 센다.
// 스크롤바가 자리를 차지하는 환경(윈도우·크롬의 8px 스크롤바)에서는 잠그는 순간 그만큼 화면이 옆으로 튀므로,
// 같은 폭을 body 오른쪽 여백으로 채워 둔다. 원래 인라인 값은 저장했다가 그대로 되돌린다.

import { useEffect } from 'react'

let lockCount = 0
let saved: { overflow: string; paddingRight: string } | null = null

export function usePageScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) {
      const root = document.documentElement
      const scrollbarWidth = window.innerWidth - root.clientWidth
      saved = { overflow: root.style.overflow, paddingRight: document.body.style.paddingRight }
      root.style.overflow = 'hidden'
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0 && saved) {
        document.documentElement.style.overflow = saved.overflow
        document.body.style.paddingRight = saved.paddingRight
        saved = null
      }
    }
  }, [active])
}
