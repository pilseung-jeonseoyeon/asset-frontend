import type { AppState } from './types'
import type { Action } from './actions'

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload }
    case 'PATCH_FN':
      return { ...state, ...action.payload(state) }
    default:
      return state
  }
}
