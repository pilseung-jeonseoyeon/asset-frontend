// 주식 화면 전용 탭 스타일.
// stockDeepTabStyle — 딥 카드(포트폴리오 요약) 위의 전체/국내/해외 탭
// stockLightTabStyle — 같은 탭이 밝은 '보유 종목' 카드에서 반복될 때

import type { CSSProperties } from 'react'

export function stockDeepTabStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 2px',
    marginRight: '20px',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? '#fff' : 'var(--deep-label)',
    fontSize: '14px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

export function stockLightTabStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'inherit',
    background: active ? 'var(--accent)' : 'var(--track)',
    color: active ? '#fff' : 'var(--text-weak)',
  }
}
