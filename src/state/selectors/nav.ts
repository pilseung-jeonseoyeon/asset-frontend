// Source: secret/Asset Manager v14.dc.html L3551-3562 (navStyle/navHover) — transcribed verbatim.
// Plain functions (not memoized hooks): the source itself recomputes these as plain object literals
// on every render() call, with no memoization — matching that exactly rather than inventing caching.

import type { CSSProperties } from 'react'

export function navStyle(active: boolean): CSSProperties {
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

export function navHover(active: boolean): CSSProperties {
  return active
    ? { transform: 'translateY(-1px)' }
    : { background: 'var(--fill-subtle)', color: 'var(--text-strong)' }
}
