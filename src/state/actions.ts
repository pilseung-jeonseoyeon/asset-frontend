// dc.html's Component class updates state exclusively through `this.setState(partial)` and
// `this.setState(updaterFn)` (e.g. L3601, L3605-3608) — no named action catalog exists in the source.
// Mirroring that directly (a generic PATCH/PATCH_FN reducer) is more faithful than inventing a large
// action taxonomy the original never had.

import type { AppState } from './types'

export type Action =
  | { type: 'PATCH'; payload: Partial<AppState> }
  | { type: 'PATCH_FN'; payload: (state: AppState) => Partial<AppState> }
