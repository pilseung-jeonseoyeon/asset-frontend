// Source: secret/Asset Manager v14.dc.html L4441 `closeModal` — shared by every modalXxx in the source
// (not account-specific), so this lives here to be reused across all modal-owning screens/phases.

import type { MouseEvent } from 'react'
import { useAppState } from '../AppStateContext'

export function useCloseModal() {
  const { setState } = useAppState()
  return () =>
    setState({ modalOpen: null, editingTx: false, editingTxKey: null, editingRecurId: null })
}

export function stopPropagation(e: MouseEvent) {
  e.stopPropagation()
}
