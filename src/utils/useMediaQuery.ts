// 모바일 브레이크포인트 하나(<=767px, docs/mobile.md §1). CSS 미디어 쿼리로는 표현할 수 없는
// 구조 변경(내비 교체, 모달→바텀시트)을 가르는 데 쓴다 — 이 코드베이스는 인라인 스타일이 많다.
// useSyncExternalStore로 첫 렌더부터 값이 맞고(마운트 후 깜빡임 없음), 서버 스냅샷은 false라
// 나중에 프리렌더를 도입해도 안전하다.

import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
