// Source: secret/Asset Manager v14.dc.html L4126-4136 (stockDeepTabStyle/stockLightTabStyle) — transcribed verbatim.
// Stock-screen-only tab styles: stockDeepTabStyle for the 전체/국내/해외 tabs on the deep-card portfolio summary,
// stockLightTabStyle for the same tabs repeated on the light 보유 종목 card.

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
