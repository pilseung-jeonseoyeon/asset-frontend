// 탭 스타일 팩토리. 메모이즈하지 않은 평범한 함수다(nav.ts 헤더 참고).
// dashboardTabStyle — 대시보드 전용 A/B/C 탭(transition 없음)
// segmentedTabStyle — 주식·자산·가계부 등에서 두루 쓰는 세그먼트 탭
// deepCardTabStyle — 딥 카드 위에 올라가는 변형(--deep-seg-* 토큰)

import type { CSSProperties } from 'react'

/** 대시보드 전용 탭 스타일. `transition` 속성이 없는 것은 의도된 것이다(segmentedTabStyle과 다른 점) —
 * 빠뜨린 게 아니니 '고치지' 말 것. */
export function dashboardTabStyle(active: boolean): CSSProperties {
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

/** 주식·자산·가계부·거래유형·반복유형 탭이 두루 쓰는 기본 세그먼트 탭 스타일. */
export function segmentedTabStyle(active: boolean): CSSProperties {
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
 * --deep-seg-* 토큰을 쓴다(ds_rules_v2_5.md에는 이 토큰 항목이 없고, 값의 정본은
 * src/styles/tokens.css다). */
export function deepCardTabStyle(active: boolean): CSSProperties {
  return {
    ...segmentedTabStyle(active),
    background: active ? 'var(--deep-seg-active)' : 'transparent',
    color: active ? 'var(--deep-seg-active-fg)' : 'var(--deep-seg-inactive-fg)',
    boxShadow: 'none',
  }
}
