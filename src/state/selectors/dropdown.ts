// Source: secret/Asset Manager v14.dc.html L4203-4211 (makeDD factory) — transcribed verbatim, ported
// from a per-render closure over `this.state`/`this.setState` to a hook over our AppStateContext.
// Reuses the existing `dd`/`openDropdown` AppState fields (state/types.ts) that already mirror `s.dd`/
// `s.openDropdown` 1:1.

import { useAppState } from '../AppStateContext'

export interface DropdownOption {
  name: string
  pick: () => void
}

export interface DropdownState {
  value: string
  open: boolean
  toggle: () => void
  options: DropdownOption[]
}

export function useDropdown(key: string, options: string[], fallback: string): DropdownState {
  const { state, setState } = useAppState()
  const ddState = state.dd as Record<string, string>
  const value = ddState[key] !== undefined ? ddState[key] : fallback

  return {
    value,
    open: state.openDropdown === key,
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === key ? null : key })),
    options: options.map((o) => ({
      name: o,
      pick: () => setState((st) => ({ dd: { ...st.dd, [key]: o }, openDropdown: null })),
    })),
  }
}
