# 상태 관리

이 프로젝트에는 세 가지 서로 다른 종류의 상태가 있고, 각각 담당하는 레이어가 분리되어 있습니다.
새 상태를 추가할 때는 아래 기준으로 어디에 둘지 먼저 정하세요. API 통신 자체의 세부 규칙
(axios 인스턴스, 에러 처리, 서비스 폴더 구조)은 [`api-conventions.md`](./api-conventions.md)를
따르고, 이 문서는 상태를 "어디에 둘지"에 집중합니다.

## 상태의 종류와 위치

| 상태 종류 | 위치 | 예시 |
|---|---|---|
| 화면 네비게이션 / 인터랙션 / 폼 입력값 | `AppState` (reducer + Context, `useAppState()`) | `screen`, `modalOpen`, `openDropdown`, 각종 탭/입력 필드 |
| 서버에서 받아온 데이터의 캐시·로딩·에러 | React Query (`useQuery`/`useMutation`) | API 연동 시 목록/상세 조회 결과 |
| 여러 화면·여러 쿼리에 걸쳐 공유되는 전역 UI 상태 | Zustand (`src/stores/`) | 전역 로딩 오버레이(`useUiStore`) |

### AppState가 기본값입니다

화면 전환, 모달/드롭다운 열림 상태, 탭 선택, 입력 폼 값처럼 이 앱의 인터랙션과 관련된 상태는
전부 `AppState`(`src/state/`)에 둡니다. `useAppState()`로 읽고 `setState`(패치 또는
업데이터 함수)로 씁니다. 새 화면이나 모달을 추가할 때 상태가 필요하면 먼저 이 방식을
검토하세요 — Zustand store를 새로 만드는 게 기본 선택지가 아닙니다.

### Zustand는 좁은 예외입니다

Zustand는 `AppState`로 표현하기 어려운, **화면 트리와 무관하게 여러 곳에서 동시에 읽고 써야
하는 전역 상태**에만 씁니다. 지금 존재하는 건 `src/stores/ui.ts`의 `useUiStore`
(여러 API 요청이 동시에 떠 있어도 정확히 추적해야 하는 전역 로딩 카운터) 하나뿐입니다. 새
도메인 store(`auth`, `user` 등)를 만들기 전에, 정말 `AppState`나 React Query 캐시로 표현할 수
없는지부터 확인하세요.

- **인증/사용자 store는 없습니다.** `CLAUDE.md`에 명시된 대로 이 앱은 단일 하드코딩 사용자이고
  로그인 개념이 없습니다 — 인증 플로우는 이번 포팅 범위에서 제외되어 있습니다. `useAuthStore`나
  토큰 영속화(`persist` + 쿠키 스토리지)는 실제로 인증이 도입되기 전까지 만들지 않습니다.
- store를 새로 추가할 땐 `src/stores/{domain}.ts`에 하나씩 분리하고, `set`으로 액션을 명시적으로
  이름 붙여 노출합니다(`useUiStore`의 `startLoading`/`stopLoading` 참고). 컴포넌트에서 스토어
  전체 객체를 구조분해하지 말고 필요한 필드/액션만 selector로 가져오세요.

### React Query는 서버 상태 전용입니다

API로 받아온 데이터는 `AppState`나 Zustand에 복사해 넣지 않고 React Query 캐시에 그대로
둡니다. 로딩/에러는 훅이 돌려주는 `isPending`/`isFetching`/`error`를 그대로 쓰고, 전역 로딩
오버레이가 필요할 때만 `onMutate`/`onSettled`로 `useUiStore`에 연결합니다(자세한 예시는
`api-conventions.md`의 "로딩 상태 관리" 참고).

목록 페이지네이션처럼 다음 페이지를 불러오는 동안 이전 데이터를 화면에 유지하고 싶으면
`placeholderData: keepPreviousData`를 씁니다:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'

useQuery({
  queryKey: ['ledger', page],
  queryFn: () => getLedger(page),
  placeholderData: keepPreviousData,
})
```

## 렌더링 성능

- `React.memo`/`useMemo`/`useCallback`은 실제로 불필요한 리렌더/재계산이 측정되거나 명백히
  예상되는 지점에서만 씁니다. 기본값으로 모든 컴포넌트/값에 붙이지 않습니다.
- `src/state/selectors/*`의 함수들은 의도적으로 메모이즈하지 않은 일반 함수입니다(렌더마다
  재계산) — 이 계층에 최적화를 임의로 추가하지 마세요. 실제 성능 문제가 확인되면 그때 논의합니다.
- React Query 쿼리는 `staleTime`으로 불필요한 재요청을 줄입니다. 기본값은
  `src/services/queryClient.ts`에 30초로 설정되어 있고, 도메인별로 더 길게/짧게 필요하면 해당
  쿼리 옵션에서 개별 오버라이드합니다.
