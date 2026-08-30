// 사이드바 항목 스타일. 메모이즈하지 않은 평범한 함수다 — 렌더마다 객체 리터럴을 다시 만드는
// 비용이 캐싱을 들일 만큼 크지 않다.

import type { CSSProperties } from 'react'

export function sidebarNavItemStyle(active: boolean): CSSProperties {
  return {
    width: '60px',
    height: '58px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease',
    background: active ? 'var(--track)' : 'transparent',
    color: active ? 'var(--text-strong)' : 'var(--text-weak)',
    boxShadow: 'none',
  }
}

export function sidebarNavHoverStyle(active: boolean): CSSProperties {
  return active
    ? { transform: 'translateY(-1px)' }
    : { background: 'var(--fill-subtle)', color: 'var(--text-strong)' }
}
