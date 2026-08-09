// Source: secret/Asset Manager v14.dc.html L3571-3589 ("인증 화면 공통 스타일" block) + L3622
// (filterEmailInput) + L3636 (filterPwInput) — transcribed verbatim, camelCased into CSSProperties
// objects. This is the canonical home for these constants: screens/Auth owns the real auth screens,
// and src/components/layout/modals/AccountModal.tsx (its password-change subview reuses the same
// input/button look) imports from here instead of keeping its own copy.

import type { CSSProperties, FormEvent } from 'react'

export const authInput: CSSProperties = {
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
export const authInputPw: CSSProperties = { ...authInput, paddingRight: 46 }

export const authPrimary: CSSProperties = {
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
export const authPrimaryOff: CSSProperties = {
  ...authPrimary,
  background: 'var(--track)',
  color: 'var(--text-weak)',
  cursor: 'default',
}

export const authSecondary: CSSProperties = {
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

/** 체크박스(로그인 유지·마케팅 수신 동의) — source L3609 checkBox(on, size) 이식, size 기본 18. */
export function checkBox(on: boolean, size = 18): CSSProperties {
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
export function filterPwInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/[^\x21-\x7E]/g, '')
}

/** 서버 정규식과 별개로, 제출 전에 형식만 빠르게 걸러주는 프론트 전용 이메일 검증. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
