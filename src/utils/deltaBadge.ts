// 가계부 딥 카드의 수입/지출/저축 증감 칩.
// 호출부는 현재 테마와 무관하게 고정 다크 hex(#7FE0B6/#F5A29B/#B9B2F4 — 다크 모드의
// --deep-up/--deep-down/--deep-saving 값)를 넘긴다. 딥 카드의 나머지와 달리 이 칩만 라이트/다크로
// 바뀌지 않는 것은 의도된 동작이니 '고치지' 말 것.

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

export function makeDeltaBadge(text: string, up: boolean, color: string): DeltaBadge {
  return {
    text,
    icon: up ? 'arrow_drop_up' : 'arrow_drop_down',
    color,
    bg: hexToRgba(color, 0.16),
  }
}
