// 상단 '개인 | 우리집' 전환(ScopeSegment)을 쓰는 화면인지 — 대시보드 · 자산 · 주식 · 가계부.

import { useLocation } from 'react-router-dom'

const SCOPED_PATHS = ['/dashboard', '/assets', '/stocks', '/ledger']

/** 지금 화면이 '개인 | 우리집' 전환을 쓰는 화면인지 */
export function useShowsScopeSegment(): boolean {
  const { pathname } = useLocation()
  return SCOPED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
