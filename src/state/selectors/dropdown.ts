// 드롭다운의 열림 상태와 선택값을 AppState(dropdownValues / openDropdown)에 얹는 훅.
//
// 옵션의 id/meta/leading: 계좌처럼 이름이 겹칠 수 있는 목록에서 React key로 o.name을 쓰면
// 충돌한다 — id를 안정적인 키로 함께 실어보낸다(useDropdown은 표시값=저장값이라 옵션 문자열
// 자체를, useEntityDropdown은 getId(item)을 쓴다). meta/leading은 옵션 한 줄 아래 보조 정보
// (예: 계좌의 소속 기관명)·앞에 붙는 아이콘(예: BankIcon)을 옵션별로 넘기기 위한 선택 필드다 —
// 넘기지 않으면 undefined로 비고 Dropdown.tsx는 이름만 렌더한다.

import type { ReactNode } from 'react'
import { useAppState } from '../AppStateContext'

export interface DropdownOption {
  name: string
  pick: () => void
  /** React key로 쓸 안정적인 식별자. 없으면 Dropdown.tsx가 name으로 폴백한다. */
  id?: number | string
  /** name 아래 작게 렌더할 보조 정보 한 줄(예: 계좌 드롭다운의 소속 기관명). */
  meta?: string
  /** name/meta 앞에 붙는 아이콘 등. */
  leading?: ReactNode
}

export interface DropdownState {
  value: string
  open: boolean
  toggle: () => void
  options: DropdownOption[]
}

export function useDropdown(key: string, options: string[], fallback: string): DropdownState {
  const { state, setState } = useAppState()
  const values = state.dropdownValues as Record<string, string>
  const value = values[key] !== undefined ? values[key] : fallback

  return {
    value,
    open: state.openDropdown === key,
    toggle: () => setState((prev) => ({ openDropdown: prev.openDropdown === key ? null : key })),
    options: options.map((o) => ({
      name: o,
      id: o,
      pick: () => setState((prev) => ({ dropdownValues: { ...prev.dropdownValues, [key]: o }, openDropdown: null })),
    })),
  }
}

/**
 * useDropdown의 형제 훅. useDropdown은 옵션 문자열 자체를 선택값으로 다루지만(금융기관 이름처럼
 * "표시값 = 저장값"인 경우), 계좌 폼의 금융기관처럼 **id로 저장하고 이름은 화면에만 보여줘야 하는**
 * 경우엔 쓸 수 없다(같은 이름의 기관은 없다는 보장이 없고, 서버는 이름이 아니라 institutionId를
 * 받는다). 선택 상태(selectedId)와 선택 반영(onPick)은 호출부가 들고 있는 폼 객체(예: accountForm)에
 * 위임하고, 이 훅은 열림/닫힘(openDropdown)과 옵션 렌더링만 담당한다 — useDropdown처럼 `dropdownValues`에 직접
 * 쓰지 않는 이유는 폼 값의 단일 소스(single source of truth)를 폼 객체 하나로 유지하기 위함이다.
 */
export function useEntityDropdown<T>(
  key: string,
  items: T[],
  getId: (item: T) => number,
  getLabel: (item: T) => string,
  selectedId: number | null,
  onPick: (id: number) => void,
  /** 옵션 한 줄 아래 보조 정보(예: 계좌의 소속 기관명). 항목에 해당 정보가 없으면 undefined를
   * 돌려주면 그 줄은 생략된다. 생략 가능 — 넘기지 않으면 기존 호출부와 동일하게 이름만 렌더한다. */
  getMeta?: (item: T) => string | undefined,
  /** 옵션 앞에 붙는 아이콘 등(예: BankIcon). 생략 가능. */
  getLeading?: (item: T) => ReactNode,
): DropdownState {
  const { state, setState } = useAppState()
  const selected = selectedId !== null ? items.find((item) => getId(item) === selectedId) : undefined

  return {
    value: selected ? getLabel(selected) : '',
    open: state.openDropdown === key,
    toggle: () => setState((prev) => ({ openDropdown: prev.openDropdown === key ? null : key })),
    options: items.map((item) => ({
      name: getLabel(item),
      id: getId(item),
      meta: getMeta?.(item),
      leading: getLeading?.(item),
      pick: () => {
        onPick(getId(item))
        setState({ openDropdown: null })
      },
    })),
  }
}
