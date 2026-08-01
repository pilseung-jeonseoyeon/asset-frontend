// Source: secret/Asset Manager v14.dc.html L3524-3546 (componentDidMount/componentDidUpdate/applyTheme) —
// logic transcribed verbatim, ported from class lifecycle methods to a useEffect-based hook.

import { useEffect } from 'react'

export type ThemeSetting = 'light' | 'dark' | 'system'

export function isDarkTheme(theme: ThemeSetting): boolean {
  return theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

export function applyTheme(theme: ThemeSetting): void {
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
