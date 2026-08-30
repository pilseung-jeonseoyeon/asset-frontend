// 가계부 거래 입력 폼의 "저장하지 않고 닫은 내용"을 담았다 되살리는 순수 헬퍼(2026-08-29).
// 모달이 배경 클릭으로도 닫히게 되면서(primitives/Modal의 handleScrimPointerDown) 실수로 닫아도
// 적던 내용이 사라지지 않아야 한다는 요구에서 나왔다.
//
// 이 파일에 모아 둔 이유: 모달을 여는 지점이 세 곳(가계부 화면의 유형별 버튼·달력 칸의 +, 헤더의
// 퀵 추가 메뉴)이라 "열면서 폼을 초기화한다"는 로직이 이미 복붙돼 있었다. 복원 규칙까지 각자
// 복붙하면 한 곳만 고쳐지는 사고가 난다.

import type { AppState, EntryDraft, EntryType } from '../types'

/**
 * 지금 폼에 사용자가 실제로 적은 게 있으면 초안으로 만든다. 없으면 null.
 *
 * 계좌·카테고리 선택은 "적은 것"으로 치지 않는다 — 이 둘은 사용자가 고르지 않아도 첫 계좌·첫
 * 소분류로 자동 폴백되므로, 열었다 바로 닫기만 해도 초안이 생겨 다음에 열 때 엉뚱하게 복원된다.
 */
export function captureEntryDraft(st: AppState): EntryDraft | null {
  // 날짜도 "적은 것"으로 친다 — 캘린더 +로 날짜를 지정했거나 달력에서 직접 골랐다면 명백한 사용자
  // 조작이고, 그것만 하고 닫았다가 다시 열었을 때 오늘 날짜로 돌아가 있으면 고친 의미가 없다.
  const hasInput =
    st.entryDescription.trim() !== '' ||
    st.entryAmount > 0 ||
    st.entryMemo.trim() !== '' ||
    st.entryDateOverride !== null ||
    st.dpPicked['entry'] !== undefined
  if (!hasInput) return null
  return {
    entryType: st.entryType,
    entryAmount: st.entryAmount,
    entryDescription: st.entryDescription,
    entryMemo: st.entryMemo,
    entrySubcategoryId: st.entrySubcategoryId,
    entryAccountId: st.entryAccountId,
    entryWithdrawAccountId: st.entryWithdrawAccountId,
    entryDateOverride: st.entryDateOverride,
    dpPickedEntry: st.dpPicked['entry'],
    dpNavEntry: st.dpNav['entry'],
  }
}

/**
 * 새 거래 입력 모달을 열 때의 AppState 업데이터. 초안이 있고 **거래유형이 같으면** 그 내용을
 * 되살리고, 아니면 빈 폼으로 연다. 모달을 여는 세 지점(가계부 화면의 유형별 버튼·달력 칸의 +,
 * 헤더의 퀵 추가 메뉴)이 모두 이 하나를 쓴다.
 *
 * 유형이 다르면 버리는 이유: 거래유형을 바꾸면 초안을 버린다는 규칙(2026-08-29 사용자 결정)과 같은
 * 취지다. 수입 초안을 두고 "지출" 버튼으로 들어왔는데 수입 내용이 채워져 있으면 더 헷갈린다.
 *
 * @param dateOverride 달력 칸의 + 로 들어온 경우의 날짜('YYYY.MM.DD' 표시 문자열). 이 값이 있으면
 *                     초안의 날짜보다 우선한다 — 사용자가 방금 그 날짜를 지목했기 때문이다.
 */
export function openNewEntryUpdater(
  entryType: EntryType,
  tabsVisible: boolean,
  dateOverride: string | null,
): (st: AppState) => Partial<AppState> {
  return (st) => {
    const draft = st.entryDraft
    const restored = draft && draft.entryType === entryType ? draft : null
    // 날짜를 지목해 들어왔으면 초안의 달력 선택은 버린다(위 dateOverride 우선 규칙과 짝을 맞춘다).
    const restoredDate = dateOverride ? null : restored
    return {
      modalOpen: 'ledgerEntry',
      entryDraftRestored: restored !== null,
      entryType,
      entryTabsVisible: tabsVisible,
      editingTxId: null,
      entryPreserved: null,
      openDropdown: null,
      entrySubcategoryId: restored?.entrySubcategoryId ?? null,
      entryAccountId: restored?.entryAccountId ?? null,
      entryWithdrawAccountId: restored?.entryWithdrawAccountId ?? null,
      entryAmount: restored?.entryAmount ?? 0,
      entryDescription: restored?.entryDescription ?? '',
      entryMemo: restored?.entryMemo ?? '',
      entryDateOverride: dateOverride ?? restored?.entryDateOverride ?? null,
      // dpPicked/dpNav는 다른 화면의 달력과 한 객체를 공유하므로 'entry' 키만 갈아끼운다.
      dpPicked: { ...st.dpPicked, entry: restoredDate?.dpPickedEntry },
      dpNav: { ...st.dpNav, entry: restoredDate?.dpNavEntry },
    }
  }
}
