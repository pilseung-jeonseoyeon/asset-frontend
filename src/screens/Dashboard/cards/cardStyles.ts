// 대시보드 카드들이 공유하는 스타일 상수. 컴포넌트 조각(EmptyState 등)은 shared.tsx에 있다 —
// 한 파일에 상수와 컴포넌트를 같이 export하면 Fast Refresh 경고(react/only-export-components)가 나서
// 둘로 나눴다.

import type { CSSProperties } from 'react'

export const EMPTY_TEXT_STYLE: CSSProperties = { fontSize: 12.5, color: 'var(--text-weak)' }
export const EMPTY_TEXT_STYLE_DEEP: CSSProperties = { fontSize: 12.5, color: 'var(--deep-label)' }
export const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)' }
export const ERROR_TEXT_STYLE_DEEP: CSSProperties = { fontSize: 11.5, color: 'var(--deep-down)' }
export const DASHED_CTA_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 10, border: '0.5px dashed var(--text-weak)',
  background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s',
}
export const DASHED_CTA_STYLE_DEEP: CSSProperties = {
  ...DASHED_CTA_STYLE,
  border: '0.5px dashed var(--deep-label)',
  color: 'var(--deep-label)',
}
/** 카드 제목 15px/700 — 딥 카드가 아닌 모든 카드의 제목 규격. */
export const CARD_TITLE_STYLE: CSSProperties = { fontSize: 15, fontWeight: 700 }
/** 카드 제목 옆·오른쪽의 "전체 보기 ›" 같은 약한 텍스트 링크 규격. */
export const CARD_LINK_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12, color: 'var(--text-weak)', cursor: 'pointer', padding: 0,
}

// 총자산 추이 x축은 데이터 개수와 무관하게 항상 올해 12달 전부다(Ledger.tsx의 MONTH_LABELS와
// 같은 규칙 — 두 화면의 월 축 표기가 갈라지지 않도록 문자열을 맞춰 둔다).
export const TREND_MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

