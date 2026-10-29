// 가족 · 커플 공유 흐름 창들의 공통 스타일(v17 시안 값). 그리기 조각은 shareParts.tsx.

import type { CSSProperties } from 'react'

export const SECTION_TITLE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)',
}
export const COUNT_STYLE: CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', borderRadius: 8, padding: '2px 8px',
}
export const MUTED_TEXT_STYLE: CSSProperties = { fontSize: 12, color: 'var(--text-weak)', lineHeight: 1.6 }
export const SMALL_BTN_STYLE: CSSProperties = {
  fontSize: 12, fontWeight: 700, color: 'var(--text-strong)', background: 'var(--surface)', border: '0.5px solid var(--border)',
  borderRadius: 8, padding: '7px 13px', minHeight: 34, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flex: 'none',
}
export const PRIMARY_BTN_STYLE: CSSProperties = {
  width: '100%', height: 48, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff',
  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.01em',
}
export const PRIMARY_BTN_DISABLED_STYLE: CSSProperties = {
  ...PRIMARY_BTN_STYLE, background: 'var(--track)', color: 'var(--text-weak)', cursor: 'default',
}
export const SECONDARY_BTN_STYLE: CSSProperties = {
  width: '100%', height: 48, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-mid)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
}
export const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 12, color: 'var(--down)', marginTop: 8, lineHeight: 1.5 }
export const ICON_TILE_STYLE: CSSProperties = {
  width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
}
