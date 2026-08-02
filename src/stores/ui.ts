import { create } from 'zustand'

interface UiStore {
  pendingRequests: number
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  pendingRequests: 0,
  isLoading: false,
  startLoading: () =>
    set((s) => ({ pendingRequests: s.pendingRequests + 1, isLoading: true })),
  stopLoading: () =>
    set((s) => {
      const pendingRequests = Math.max(0, s.pendingRequests - 1)
      return { pendingRequests, isLoading: pendingRequests > 0 }
    }),
}))
