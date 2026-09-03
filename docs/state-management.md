# 상태 관리

이 프로젝트에는 세 가지 서로 다른 종류의 상태가 있고, 각각 담당하는 레이어가 분리되어 있습니다.
새 상태를 추가할 때는 아래 기준으로 어디에 둘지 먼저 정하세요. API 통신 자체의 세부 규칙
(axios 인스턴스, 에러 처리, 서비스 폴더 구조)은 [`api-conventions.md`](./api-conventions.md)를
따르고, 이 문서는 상태를 "어디에 둘지"에 집중합니다.

## 상태의 종류와 위치

| 상태 종류 | 위치 | 예시 |
|---|---|---|
| 화면 내 인터랙션 / 폼 입력값 | `AppState` (reducer + Context, `useAppState()`) | `openModal`, `openDropdown`, 각종 탭/입력 필드 |
| 5개 메뉴 화면 간 최상위 네비게이션 | URL (`react-router-dom`, `docs/architecture.md` 참고) | `/dashboard` `/assets` `/stocks` `/ledger` `/settings` |
| 서버에서 받아온 데이터의 캐시·로딩·에러 | React Query (`useQuery`/`useMutation`) | API 연동 시 목록/상세 조회 결과 |
| 화면 트리와 무관하게 여러 곳이 동시에 읽고 써야 하는 전역 상태 | Zustand (`src/stores/`) | 인증 토큰·로그인 상태(`useAuthStore`) |

### AppState가 기본값입니다

화면 전환, 모달/드롭다운 열림 상태, 탭 선택, 입력 폼 값처럼 이 앱의 인터랙션과 관련된 상태는
전부 `AppState`(`src/state/`)에 둡니다. `useAppState()`로 읽고 `setState`(패치 또는
업데이터 함수)로 씁니다. 새 화면이나 모달을 추가할 때 상태가 필요하면 먼저 이 방식을
검토하세요 — Zustand store를 새로 만드는 게 기본 선택지가 아닙니다.

테마는 서버 설정(`theme`)이 소유하고, `AppState.theme`은 렌더용 미러, `localStorage('monit.theme')`는
부팅 FOUC 방지 캐시입니다.

`localStorage`는 이렇게 **서버 정본의 캐시나 순수 편의 힌트**에만 씁니다(키는 모두 `monit.` 접두어,
접근 실패는 전부 try/catch로 삼킴). 현재 키: `monit.theme`(테마 힌트), `monit.seenSession`(재방문
여부), `monit.ledger.lastAccounts`(가계부 입력 폼의 거래유형별 마지막 사용 계좌 id —
`src/utils/ledgerLastAccounts.ts`, 2026-09-03 추가. 서버에 두지 않은 이유와 "AppState에 쓰지 않고
드롭다운 폴백으로만 적용"하는 이유는 그 파일 상단 주석). 토큰·금액·이름 같은 값은 절대 넣지 않습니다.

### Zustand는 좁은 예외입니다

Zustand는 `AppState`로 표현하기 어려운, **화면 트리와 무관하게 여러 곳에서 동시에 읽고 써야
하는 전역 상태**에만 씁니다. 지금 존재하는 건 `src/stores/auth.ts`의 `useAuthStore`(아래)
하나뿐입니다. 새 도메인 store(`user` 등)를 만들기 전에, 정말 `AppState`나 React Query 캐시로
표현할 수 없는지부터 확인하세요.

- **인증 store가 있습니다: `src/stores/auth.ts`의 `useAuthStore`.** 백엔드가 JWT 인증을 요구하게
  되면서 추가했습니다. 화면 트리 전체(`AppShell`의 게이팅 자체, 모든 API 요청의 인터셉터)가 동시에
  참조해야 하는 상태라 `AppState`로 표현할 수 없는 케이스입니다 — 위 "Zustand는 좁은 예외입니다"
  기준에 정확히 부합합니다.
  - **액세스 토큰은 메모리에만 둡니다.** `useAuthStore`의 `accessToken`은 `persist` 미들웨어 없이
    순수 인메모리 상태이고, `localStorage`/`sessionStorage`에 절대 쓰지 않습니다. 저장소에 넣으면
    XSS 한 번으로 토큰이 통째로 새어나가고 만료도 직접 관리해야 하기 때문입니다.
  - **리프레시 토큰은 httpOnly 쿠키로 서버가 관리합니다** (`src/services/api.ts`의
    `withCredentials: true`, `POST /auth/refresh`가 요청 바디를 받지 않는 것도 이 때문). 새로고침
    직후에는 액세스 토큰이 없으므로(메모리이므로 날아감) 부팅 시 `useRestoreSession()`
    (`src/services/auth/auth.hook.ts`)이 refresh를 한 번 호출해 되찾아옵니다 — 실패하면
    `status: 'anonymous'`로 떨어집니다.
  - `status: 'unknown' | 'authenticated' | 'anonymous'`를 `AppShell`이 그대로 읽어 렌더 여부를
    가릅니다: `unknown`이면 최소 로딩 표시만, `anonymous`면 `screens/Auth`만, `authenticated`면
    기존 화면 트리 전체. 이 3단계 게이팅이 없으면 `unknown` 구간에서 로그인 화면이 잠깐 깜빡이거나,
    `anonymous`인데 모달이 마운트되어 401을 쏟아내는 문제가 생긴다(`docs/api-conventions.md`
    참고).
  - 로그인 이메일/비밀번호 같은 **폼 입력값 자체는 이 store에 두지 않습니다** — 화면
    인터랙션이라 `AppState`(비밀번호 제외, `src/screens/Auth/*`) 몫입니다. 이 store는 오직
    "지금 인증되어 있는가"와 토큰 값만 다룹니다.
- store를 새로 추가할 땐 `src/stores/{domain}.ts`에 하나씩 분리하고, `set`으로 액션을 명시적으로
  이름 붙여 노출합니다(`useAuthStore`의 `signIn`/`signOut` 참고). 컴포넌트에서 스토어 전체 객체를
  구조분해하지 말고 필요한 필드/액션만 selector로 가져오세요.

### React Query는 서버 상태 전용입니다

API로 받아온 데이터는 `AppState`나 Zustand에 복사해 넣지 않고 React Query 캐시에 그대로
둡니다. 로딩/에러는 훅이 돌려주는 `isPending`/`isFetching`/`error`를 그대로 쓰고, 표시는 카드·모달
단위로 그 자리에서 합니다 — 화면 전체를 덮는 전역 로딩 오버레이는 두지 않습니다(자세한 내용은
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
