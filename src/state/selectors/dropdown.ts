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

/**
 * useDropdown의 형제 훅. useDropdown은 옵션 문자열 자체를 선택값으로 다루지만(금융기관 이름처럼
 * "표시값 = 저장값"인 경우), 계좌 폼의 금융기관처럼 **id로 저장하고 이름은 화면에만 보여줘야 하는**
 * 경우엔 쓸 수 없다(같은 이름의 기관은 없다는 보장이 없고, 서버는 이름이 아니라 institutionId를
 * 받는다). 선택 상태(selectedId)와 선택 반영(onPick)은 호출부가 들고 있는 폼 객체(예: accountForm)에
 * 위임하고, 이 훅은 열림/닫힘(openDropdown)과 옵션 렌더링만 담당한다 — useDropdown처럼 `dd`에 직접
 * 쓰지 않는 이유는 폼 값의 단일 소스(single source of truth)를 폼 객체 하나로 유지하기 위함이다.
 */
export function useEntityDropdown<T>(
  key: string,
  items: T[],
  getId: (item: T) => number,
  getLabel: (item: T) => string,
  selectedId: number | null,
  onPick: (id: number) => void,
): DropdownState {
  const { state, setState } = useAppState()
  const selected = selectedId !== null ? items.find((item) => getId(item) === selectedId) : undefined

  return {
    value: selected ? getLabel(selected) : '',
    open: state.openDropdown === key,
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === key ? null : key })),
    options: items.map((item) => ({
      name: getLabel(item),
      pick: () => {
        onPick(getId(item))
        setState({ openDropdown: null })
      },
    })),
  }
}
