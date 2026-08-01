import { createContext, useCallback, useContext, useReducer, type ReactNode } from 'react'
import type { AppState } from './types'
import { initialState } from './initialState'
import { appReducer } from './reducer'

// setState mirrors dc.html's `this.setState(partial | updaterFn)` (see actions.ts header comment).
type SetAppState = (patch: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void

interface AppStateContextValue {
  state: AppState
  setState: SetAppState
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setState = useCallback<SetAppState>((patch) => {
    if (typeof patch === 'function') {
      dispatch({ type: 'PATCH_FN', payload: patch })
    } else {
      dispatch({ type: 'PATCH', payload: patch })
    }
  }, [])

  return (
    <AppStateContext.Provider value={{ state, setState }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
