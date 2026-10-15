// 모든 모달이 공유하는 헬퍼 — 닫기 동작과 '무엇이든 열려 있는지' 판정. 특정 화면에 매이지 않도록 여기 둔다.

import type { MouseEvent } from 'react'
import { useAppState } from '../AppStateContext'
import type { AppState } from '../types'

export function useCloseModal() {
  const { setState } = useAppState()
  return () =>
    setState({ openModal: null, editingTransactionId: null, editingRecurringId: null })
}

export function stopPropagation(e: MouseEvent) {
  e.stopPropagation()
}

/**
 * 입력 창(모달·바텀시트·오버레이)이 하나라도 열려 있는지. 새 알림 배너를 미룰지 정할 때 쓴다
 * (useNotificationDelivery). 대부분은 openModal 하나로 열리고, 나머지는 AuthenticatedApp이 전용 필드로
 * 여는 것들이다 — 전용 필드로 여는 모달을 새로 만들면 여기에도 더한다.
 */
export function isAnyModalOpen(state: AppState): boolean {
  return (
    state.openModal !== null ||
    state.assetClassDetail !== null ||
    state.accountDetailId !== null ||
    state.reportOpen ||
    state.shareMembersAccountId !== null ||
    state.sharedAccountDetailId !== null ||
    state.shareInviteConfirmId !== null
  )
}
