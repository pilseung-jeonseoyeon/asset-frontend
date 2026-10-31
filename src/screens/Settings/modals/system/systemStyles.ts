// 설정 → 시스템 관리 창(SystemSettingsModal)의 묶음들이 같이 쓰는 행 규격. 옛 GeneralModal·CustomModal의 값 그대로다.

import type { CSSProperties } from 'react'

export const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '15px 0', borderBottom: '0.5px solid var(--track)',
}
/** 묶음의 마지막 행 — 다음 묶음 제목이 구분 역할을 하니 아래 선을 뺀다 */
export const LAST_ROW_STYLE: CSSProperties = { ...ROW_STYLE, borderBottom: 'none' }
/**
 * 묶음 제목(화면 · 알림 · 자산 · 가계부) — 줄 이름(13.5px)보다 확실히 크게, 앞에 액센트 아이콘. 두 번째 묶음부터는 위에 구분선을 둔다.
 * 처음엔 12px 흐린 글씨였는데 "카테고리가 너무 작아서 안 보인다"는 사용자 의견으로 키웠다(2026-10-31).
 */
// margin·padding은 축약형 하나로만 쓴다 — 축약형과 paddingTop 같은 개별 속성을 섞으면 React가 다시 그릴 때 경고하고 스타일이 어긋날 수 있다.
export const SECTION_TITLE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: 'var(--text-strong)',
  margin: '10px 0 0', padding: '22px 0 6px', borderTop: '0.5px solid var(--border)',
}
export const FIRST_SECTION_TITLE_STYLE: CSSProperties = { ...SECTION_TITLE_STYLE, margin: 0, padding: '2px 0 6px', borderTop: 'none' }
export const SECTION_ICON_STYLE: CSSProperties = {
  width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
}
export const NAME_STYLE: CSSProperties = { fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
export const DESCRIPTION_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, lineHeight: 1.5, wordBreak: 'keep-all' }
export const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 4 }
// 서버 응답이 없으면 '—'로 두는 값 알약 — "서버 응답에 없는 값은 화면에 그리지 않는다"는 이 저장소 원칙.
export const VALUE_PILL_STYLE: CSSProperties = {
  fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--track)', padding: '7px 12px', borderRadius: 8,
}
/**
 * '이 기기에만' 표시 — 서버가 아니라 이 브라우저(localStorage)에만 저장되는 설정 줄에 붙인다.
 * 다른 컴퓨터·폰에서는 따로 정해야 한다는 걸 알려준다(2026-10-31 사용자 결정: 컴퓨터에 딸린 설정 구분).
 */
export const DEVICE_ONLY_BADGE_STYLE: CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '2px 8px', borderRadius: 8,
}
export const DEVICE_ONLY_LABEL = '이 기기에만'
