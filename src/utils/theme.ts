// 테마를 <html>에 적용하는 훅과, 서버 enum(ThemeType) ↔ 화면 상태(ThemeSetting) 변환.
// localStorage 캐시는 부팅 첫 페인트용 힌트이고 정본은 서버 설정이다(THEME_STORAGE_KEY 주석 참고).

import { useEffect } from 'react'
import type { ThemeType } from '../services/common.type'

export type ThemeSetting = 'light' | 'dark' | 'system'

// 이 기기에서 즉시 테마를 적용하기 위한 캐시 키. 서버 `theme` 필드가 정본이고, 이 값은 부팅 시
// 첫 페인트 전(로그인 화면 포함, 인증 전이라 서버 설정을 못 부르는 구간)에만 쓰는 힌트다.
// 로그인 후에는 useSyncUserTheme이 서버 값으로 덮어쓴다.
// `src/stores/auth.ts:18`의 SEEN_SESSION_KEY와 같은 명명 규칙(`monit.` 접두어).
const THEME_STORAGE_KEY = 'monit.theme'

const VALID_THEME_SETTINGS: readonly ThemeSetting[] = ['light', 'dark', 'system']

/**
 * localStorage에 저장된 테마를 읽는다. 접근 실패(사파리 프라이빗 브라우징 등)나 저장된 값이
 * 3개 유니언에 없으면(과거 버전의 다른 값, 수동 조작 등) `'light'`로 폴백한다 — 최초 방문자의
 * 로그인 화면 첫인상을 바꾸지 않기 위해 앱의 기존 기본값과 동일하게 맞춘다.
 */
export function readStoredTheme(): ThemeSetting {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && (VALID_THEME_SETTINGS as string[]).includes(stored)) {
      return stored as ThemeSetting
    }
    return 'light'
  } catch {
    return 'light'
  }
}

/** `auth.ts:20-42`와 동일하게 접근 실패를 전부 삼킨다 — 저장 실패는 치명적이지 않다(정본은 서버). */
export function storeTheme(theme: ThemeSetting): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 접근 불가면 그냥 이번 세션 동안만 AppState로 반영되고 다음 부팅 때 서버 값으로 다시 맞춰진다.
  }
}

/**
 * 서버 enum(`ThemeType`, 대문자) → 화면 상태(`ThemeSetting`, 소문자).
 *
 * 서버가 `ThemeType`에 없는 값을 보내면(스펙 밖 값, 응답 손상 등) switch가 아무 case에도
 * 안 걸려 `undefined`를 반환했었다 — 그 값이 그대로 `storeTheme(undefined)`(localStorage에
 * 문자열 `"undefined"` 저장) → `setState({ theme: undefined })`(AppState 타입 계약 위반)로
 * 이어져 렌더가 깨졌다. `readStoredTheme`이 화이트리스트 검증으로 항상 유효한
 * `ThemeSetting`을 반환하는 것과 대칭이 되도록 기본값 `'light'`로 방어한다.
 */
export function toThemeSetting(theme: ThemeType): ThemeSetting {
  switch (theme) {
    case 'LIGHT':
      return 'light'
    case 'DARK':
      return 'dark'
    case 'SYSTEM':
      return 'system'
    default:
      return 'light'
  }
}

/** 화면 상태(`ThemeSetting`) → 서버 enum(`ThemeType`). 방어 이유는 `toThemeSetting` 참고. */
export function toThemeType(theme: ThemeSetting): ThemeType {
  switch (theme) {
    case 'light':
      return 'LIGHT'
    case 'dark':
      return 'DARK'
    case 'system':
      return 'SYSTEM'
    default:
      return 'LIGHT'
  }
}

function isDarkTheme(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function applyTheme(theme: ThemeSetting): void {
  document.documentElement.classList.toggle('theme-dark', isDarkTheme(theme))
}

/** Applies `theme` to <html> on every change, and re-applies on OS theme change while `theme === 'system'`. */
export function useApplyTheme(theme: ThemeSetting): void {
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') applyTheme(theme)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])
}
