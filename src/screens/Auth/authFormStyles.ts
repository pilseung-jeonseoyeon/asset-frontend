// Source: secret/Asset Manager v14.dc.html L3571-3589 ("인증 화면 공통 스타일" block) + L3622
// (filterEmailInput) + L3636 (filterPasswordInput) — transcribed verbatim, camelCased into CSSProperties
// objects. This is the canonical home for these constants: screens/Auth owns the real auth screens,
// and src/components/layout/modals/AccountModal.tsx (its password-change subview reuses the same
// input/button look) imports from here instead of keeping its own copy.

import type { CSSProperties, FormEvent } from 'react'

export const authInputStyle: CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 10,
  border: '0.5px solid var(--border)',
  background: 'var(--fill-subtle)',
  padding: '0 14px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  color: 'var(--text-strong)',
  outline: 'none',
  boxSizing: 'border-box',
}

/** 입력창 안에 눈 아이콘 버튼(비밀번호 표시/숨김)을 겹쳐 놓을 자리를 남긴 변형. */
export const authPasswordInputStyle: CSSProperties = { ...authInputStyle, paddingRight: 46 }

export const authPrimaryButtonStyle: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 10,
  border: 'none',
  background: 'var(--accent)',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
}

/** 제출 조건 미충족/전송 중일 때의 비활성 표시. `disabled` 속성과 함께 스타일만 이걸로 교체한다. */
export const authPrimaryButtonDisabledStyle: CSSProperties = {
  ...authPrimaryButtonStyle,
  background: 'var(--track)',
  color: 'var(--text-weak)',
  cursor: 'default',
}

export const authSecondaryButtonStyle: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 10,
  border: '0.5px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-mid)',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  marginTop: 8,
}

/** 체크박스(로그인 유지·마케팅 수신 동의) — source L3609 checkboxStyle(on, size) 이식, size 기본 18. */
export function checkboxStyle(on: boolean, size = 18): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: 8,
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: on ? 'var(--accent)' : 'var(--track)',
    border: on ? 'none' : '0.5px solid var(--border)',
    color: on ? '#FFFFFF' : 'transparent',
  }
}

/** 이메일 입력 — 비-ASCII 문자 차단(한글 등 오입력 방지). 원본(L3622)은 범위를 `\x00-\x7F`로 잡아
 * 제어문자(0x00-0x1F)까지 "허용"에 포함시키지만, 이메일 입력창에 제어문자가 들어올 일이 없고
 * oxlint의 no-control-regex가 그 범위를 지적한다 — 인쇄 가능 ASCII만 허용하도록 `\x20-\x7E`로 좁혀
 * 의도(한글 등 비-ASCII 차단)는 그대로 두고 경고만 제거했다. */
export function filterEmailInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/[^\x20-\x7E]/g, '')
}

/** 비밀번호 입력 — 출력 가능 ASCII 이외 차단(한글 조합 중 글자 등). */
export function filterPasswordInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/[^\x21-\x7E]/g, '')
}

/** 서버 정규식과 별개로, 제출 전에 형식만 빠르게 걸러주는 프론트 전용 이메일 검증. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 회원가입 1/3 "모두 동의합니다" 토글 버튼 — source L557. */
export const agreeAllButtonStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  background: 'var(--fill-subtle)',
  border: '0.5px solid var(--border)',
  borderRadius: 10,
  padding: '15px 14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginBottom: 8,
  textAlign: 'left',
}

/** 약관 항목 한 줄 — source L565. `gap`을 둔 이유: "보기 ›"의 모바일 터치 영역(44px, docs/mobile.md
 * §5)이 라벨 텍스트와 `justify-content:space-between`만으로 붙으면, 라벨이 길어 줄바꿈되는 폭에서
 * 둘 사이 간격이 0px까지 좁아질 수 있다(개인정보 항목 라벨이 실제로 이 경우에 해당). gap이 항상
 * 최소 여백을 보장해 인접한 두 터치 영역이 맞닿지 않게 한다. */
export const agreementRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '12px 4px',
  borderTop: '0.5px solid var(--track)',
}

/** 약관 항목 체크 토글(아이콘 + 라벨) — source L566. `minWidth:0`은 위 agreementRow의 gap과 짝으로,
 * 라벨이 좁은 화면에서 "보기 ›"를 밀어내지 않고 자기 폭 안에서 줄바꿈하도록 한다. */
export const agreementToggleButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
