// Source: secret/Asset Manager v14.dc.html L3563-3569 (tabStyle), L3643-3649 (segTab),
// L4589-4590 (deep-card variant override pattern) — transcribed verbatim.
// Plain functions, not memoized hooks — see nav.ts header comment for rationale.

import type { CSSProperties } from 'react'

/** Dashboard-only A/B/C tab style (s.dash), source name `tabStyle`. Note: no `transition` property —
 *  the source's tabStyle omits it (unlike segTab), this is not an oversight to "fix". */
export function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 15px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontWeight: 700,
    fontFamily: 'inherit',
    background: active ? 'var(--seg-active)' : 'transparent',
    color: active ? 'var(--text-strong)' : 'var(--text-weak)',
    boxShadow: 'none',
  }
}

/** General segmented-tab style used across Stock/Asset/Ledger/entry-type/recurring-type tabs. */
export function segTab(active: boolean): CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontSize: '12.5px',
    fontWeight: 700,
    fontFamily: 'inherit',
    transition: 'background .15s ease, color .15s ease, box-shadow .15s ease',
    background: active ? 'var(--seg-active)' : 'transparent',
    color: active ? 'var(--text-strong)' : 'var(--text-weak)',
    boxShadow: 'none',
  }
}

/** Deep-card segmented-tab variant (e.g. ledgerPeriodTabMonthDark/YearDark, L4589-4590) — uses the
 *  --deep-seg-* tokens (ds_rules_v2_5.md has no entry for these; dc.html's own <style> block, L28/179,
 *  is the value source, see plan's "known gaps" section). */
export function segTabDeep(active: boolean): CSSProperties {
  return {
    ...segTab(active),
    background: active ? 'var(--deep-seg-active)' : 'transparent',
    color: active ? 'var(--deep-seg-active-fg)' : 'var(--deep-seg-inactive-fg)',
    boxShadow: 'none',
  }
}
