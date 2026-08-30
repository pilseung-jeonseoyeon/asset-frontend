// 상태 변경은 이름 붙은 액션 카탈로그 없이 두 가지로만 한다.
// PATCH — 부분 객체를 병합
// PATCH_FN — 이전 상태를 받아 부분 객체를 돌려주는 갱신 함수
// 화면이 쓰는 setState(부분객체) / setState(prev => 부분객체)와 1:1로 대응한다.

import type { AppState } from './types'

export type Action =
  | { type: 'PATCH'; payload: Partial<AppState> }
  | { type: 'PATCH_FN'; payload: (state: AppState) => Partial<AppState> }
