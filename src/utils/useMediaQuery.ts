// Source: docs/mobile.md §1 — single mobile breakpoint (<=767px), used to gate structural changes
// (nav swap, modal→sheet) that plain CSS media queries can't express in this inline-style-heavy
// codebase. useSyncExternalStore keeps the very first render correct (no post-mount flicker) and a
// server snapshot of `false` so this stays safe if the app is ever pre-rendered.

import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
