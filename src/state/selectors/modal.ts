// 모든 모달이 공유하는 닫기 동작. 특정 화면에 매이지 않도록 여기 둔다.

import type { MouseEvent } from 'react'
import { useAppState } from '../AppStateContext'

export function useCloseModal() {
  const { setState } = useAppState()
  return () =>
    setState({ modalOpen: null, editingTxId: null, editingRecurringId: null })
}

export function stopPropagation(e: MouseEvent) {
  e.stopPropagation()
}
