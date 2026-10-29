import { useState } from 'react'

/** 공유 화면 이름 칸의 입력값과 저장을 묶는다 — 저장된 값과 다를 때만 저장 요청을 보낸다. */
export function useSpaceNameDraft(saved: string, save: (name: string) => void) {
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? saved
  return {
    value,
    setValue: (v: string) => setDraft(v),
    commit: (v: string) => {
      const next = v.trim() || '우리집'
      if (next !== saved) save(v)
      setDraft(null)
    },
    reset: () => setDraft(null),
  }
}
