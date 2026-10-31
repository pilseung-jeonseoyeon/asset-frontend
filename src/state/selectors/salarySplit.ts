// 월급 나누기 창을 열고 닫을 때의 AppState 갱신. 화면 정본은 docs/plan/view/월급 나누기 디자인 A·B·C.html의 A안,
// 계산은 data/salarySplitView.ts.
//
// 닫으면 적던 값을 모두 버린다 — 기억(서버 salary_split_plans)은 보낼 때만 바뀌고, 다시 열면 기억에서 새로 채운다.
// 여기에 모아 둔 이유: 여는 곳(가계부 빠른 입력 줄)과 닫는 곳(창의 X · 배경 · Esc · 완료 화면 버튼)이 갈라져 있어
// 초기값을 각자 적으면 한 곳만 고쳐지는 사고가 난다.

import type { AppState } from '../types'

/** 날짜 선택(useDatePicker)의 키. 고른 날짜는 AppState.datePickerPicked[SALARY_SPLIT_DATE_KEY]에 있다. */
export const SALARY_SPLIT_DATE_KEY = 'salarySplit'

/** 월급 나누기 폼의 빈 값 — initialState와 열기·닫기가 같이 쓴다. */
export const SALARY_SPLIT_BLANK = {
  salarySplitView: 'form',
  salarySplitFilled: false,
  salarySplitSourceId: null,
  salarySplitIncomeOn: true,
  salarySplitIncomeSubcategoryId: null,
  salarySplitSalary: 0,
  salarySplitRows: [],
  salarySplitMenu: null,
  salarySplitRemoved: null,
  salarySplitErrorAccounts: [],
  salarySplitResult: null,
} satisfies Partial<AppState>

/** 빈 폼으로 창을 연다. 기억은 창이 받아 와서 한 번 채운다(salarySplitFilled). */
export function openSalarySplitUpdater(prev: AppState): Partial<AppState> {
  return {
    ...SALARY_SPLIT_BLANK,
    openModal: 'salarySplit',
    openDropdown: null,
    datePickerPicked: { ...prev.datePickerPicked, [SALARY_SPLIT_DATE_KEY]: undefined },
    datePickerViewingMonth: { ...prev.datePickerViewingMonth, [SALARY_SPLIT_DATE_KEY]: undefined },
  }
}

/** 창을 닫고 적던 값을 버린다. */
export function closeSalarySplitUpdater(prev: AppState): Partial<AppState> {
  return {
    ...SALARY_SPLIT_BLANK,
    openModal: null,
    openDropdown: null,
    datePickerPicked: { ...prev.datePickerPicked, [SALARY_SPLIT_DATE_KEY]: undefined },
    datePickerViewingMonth: { ...prev.datePickerViewingMonth, [SALARY_SPLIT_DATE_KEY]: undefined },
  }
}
