// Source: secret/Asset Manager v14.dc.html L4116-4125 (hexToRgba/mkDelta) — transcribed verbatim.
// Used by the Ledger deep-card income/expense/saving delta chips. Note: callers pass fixed dark-theme
// hex values (#7FE0B6/#F5A29B/#B9B2F4, the dark-mode --deep-up/--deep-down/--deep-saving values)
// regardless of the current theme — that is the source's own behavior (it does not switch with
// light/dark mode here, unlike the rest of the deep-card), not a bug to "fix" in this port.

export function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
}

export interface DeltaBadge {
  text: string
  icon: string
  color: string
  bg: string
}

export function mkDelta(text: string, up: boolean, color: string): DeltaBadge {
  return {
    text,
    icon: up ? 'arrow_drop_up' : 'arrow_drop_down',
    color,
    bg: hexToRgba(color, 0.16),
  }
}
