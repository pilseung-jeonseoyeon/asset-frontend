# 상태 관리

상태는 종류별로 담당 레이어가 나뉩니다. 새 상태를 추가할 때는 아래 기준으로 어디에 둘지 먼저
정하세요. API 통신 자체의 규칙(axios 인스턴스, 에러 처리, 서비스 폴더 구조)은
[`api-conventions.md`](./api-conventions.md)를 따릅니다.

## 상태의 종류와 위치

| 상태 종류 | 위치 | 예시 |
|---|---|---|
| 화면 내 인터랙션 / 폼 입력값 | `AppState` (reducer + Context, `useAppState()`) | `openModal`, `openDropdown`, 각종 탭/입력 필드 |
| 5개 메뉴 화면 간 네비게이션 | URL (`react-router-dom`, [`architecture.md`](./architecture.md) 참고) | `/dashboard` `/assets` `/stocks` `/ledger` `/settings` |
| 서버 데이터의 캐시·로딩·에러 | React Query (`useQuery`/`useMutation`) | 목록/상세 조회 결과 |
| 화면 트리와 무관하게 여러 곳이 동시에 읽고 쓰는 전역 상태 | Zustand (`src/stores/`) | 인증 토큰·로그인 상태(`useAuthStore`) |
| 서버 정본의 캐시 / 이 기기 전용 편의 힌트 | `localStorage` (`monit.*`) | 아래 목록 |

### AppState가 기본값입니다

모달/드롭다운 열림, 탭 선택, 입력 폼 값처럼 인터랙션 상태는 `AppState`(`src/state/`)에 둡니다.
`useAppState()`로 읽고 `setState`로 씁니다. `setState`는 부분 객체(`PATCH`) 또는 이전 상태를 받는
갱신 함수(`PATCH_FN`)를 받고, 리듀서는 단순 병합만 합니다 — 이름 붙은 액션 카탈로그는 두지
않습니다. 새 화면·모달에 상태가 필요하면 먼저 이 방식을 검토하세요. Zustand store를 새로 만드는
게 기본 선택지가 아닙니다.

- **비밀번호는 AppState에 넣지 않습니다.** 로그인/가입 폼의 비밀번호는 각 폼의 로컬 `useState`에
  둡니다(`src/screens/Auth/LoginForm.tsx` 헤더 주석). 인증 폼의 나머지 입력값(`authEmail`,
  `authName`, `authCode`, `authAgreements` 등)은 AppState의 auth 블록에 있습니다.
- **테마**는 서버 설정(`theme`)이 정본입니다. `AppState.theme`은 렌더용 미러이고,
  `useSyncUserTheme`이 서버 값을 AppState와 `localStorage`에 반영합니다.
- **대시보드 레이아웃**(`AppState.dashboardLayout`, A·B·C)은 서버에 필드가 없어 `localStorage`가
  정본이고 AppState가 렌더용 미러입니다. 서버 필드가 생기면 테마와 같은 구조로 바꿉니다.

### localStorage는 캐시·힌트 전용입니다

서버 정본의 캐시나 이 기기 전용 편의 힌트에만 씁니다. 키는 모두 `monit.` 접두어, 접근 실패는
전부 try/catch로 삼키고 기본값으로 동작해야 합니다. **토큰·금액·이름 같은 값은 절대 넣지 않습니다.**

| 키 | 담당 파일 | 용도 |
|---|---|---|
| `monit.theme` | `src/utils/theme.ts` | 테마 캐시(부팅 FOUC 방지) |
| `monit.seenSession` | `src/stores/auth.ts` | 이 브라우저에서 로그인한 적 있는지(부팅 게이팅용 불리언) |
| `monit.ledger.lastAccounts` | `src/utils/ledgerLastAccounts.ts` | 가계부 입력 폼의 거래유형별 마지막 사용 계좌 id. AppState에 쓰지 않고 드롭다운 폴백으로만 적용 |
| `monit.dashboardLayout` | `src/utils/dashboardLayout.ts` | 대시보드 카드 배치(이 기기 전용) |

### Zustand는 좁은 예외입니다

Zustand는 화면 트리와 무관하게 여러 곳에서 동시에 읽고 써야 하는 전역 상태에만 씁니다. 현재는
`src/stores/auth.ts`의 `useAuthStore` 하나뿐입니다. 새 store를 만들기 전에 `AppState`나 React
Query 캐시로 표현할 수 없는지부터 확인하세요.

- store는 `src/stores/{domain}.ts`에 하나씩 두고, 액션을 이름 붙여 노출합니다. 컴포넌트에서는
  store 전체를 구조분해하지 말고 필요한 필드/액션만 selector로 가져옵니다
  (`useAuthStore((s) => s.signIn)`).

### 인증 상태 (`useAuthStore`)

`AppShell`의 게이팅과 모든 API 요청의 인터셉터가 동시에 참조하므로 Zustand에 둡니다. 이 store는
"지금 인증되어 있는가"와 토큰 값만 다룹니다.

- **액세스 토큰은 메모리에만 둡니다.** `persist` 없이 인메모리이고 `localStorage`/`sessionStorage`에
  쓰지 않습니다 — 저장소에 넣으면 XSS 한 번으로 토큰이 새어나갑니다.
- **리프레시 토큰은 서버가 httpOnly 쿠키로 관리합니다**(`api.ts`의 `withCredentials: true`,
  `POST /auth/refresh`는 바디 없음). 새로고침하면 토큰이 사라지므로 부팅 시 `useRestoreSession()`
  (`src/services/auth/auth.hook.ts`)이 refresh를 한 번 호출합니다. 실패하거나 제한 시간 안에 답이
  없으면 `anonymous`로 떨어지고, `monit.seenSession`은 서버가 401/403으로 세션 무효를 확인했을
  때만 지웁니다.
- **세션 중 401**은 `api.ts` 응답 인터셉터가 refresh를 한 번(single-flight) 시도한 뒤 원 요청을
  재시도하고, 재발급까지 실패하면 `signOut()`합니다.
- **`status: 'unknown' | 'authenticated' | 'anonymous'`** 로 `AppShell`이 렌더를 가릅니다.
  - `unknown` + 로그인한 적 없음(`hasSeenSession()` false) → 곧바로 로그인 화면. refresh는
    백그라운드에서 계속 진행되고 성공하면 반영됩니다.
  - `unknown` + 로그인한 적 있음 → refresh가 끝날 때까지 `BootScreen`.
  - `anonymous` → `screens/Auth`만. 헤더·모달을 마운트하면 쿼리가 401을 쏟아내기 때문입니다.
  - `authenticated` → `AuthenticatedApp`(lazy 청크) 전체.
- **신원 경쟁 방지**: 로그인 화면을 refresh보다 먼저 띄우므로, 수동 로그인 도중 예전 쿠키의
  refresh가 성공할 수 있습니다. 그래서 `beginManualAuth`/`endManualAuth`(`manualAuthPending`)와
  `authGeneration`(수동 로그인·로그아웃마다 증가)으로 refresh 결과 반영을 막습니다 —
  `applyRefreshedToken`은 요청 시작 시점의 세대가 그대로이고 수동 인증 중이 아닐 때만 반영합니다.
  `markAnonymous`는 이미 `authenticated`면 상태를 내리지 않습니다(강제 로그아웃은 `signOut` 몫).
- **로그인·가입·로그아웃 시 `queryClient.clear()`** 로 이전 사용자의 캐시를 비웁니다.
- **회원가입**: `usePostSignup`은 받은 토큰으로 곧바로 `signIn`하지 않습니다. 온보딩 화면은
  `anonymous` 상태에서 보여 주고, "모닛 시작하기"에서 `useCompleteSignupOnboarding()`이 그 토큰으로
  `signIn`합니다.

### React Query는 서버 상태 전용입니다

API로 받은 데이터는 `AppState`나 Zustand에 복사하지 않고 React Query 캐시에 그대로 둡니다.
로딩/에러는 훅이 돌려주는 `isPending`/`isFetching`/`error`로 카드·모달 단위에서 표시하고, 화면
전체를 덮는 전역 로딩 오버레이는 두지 않습니다(`api-conventions.md`의 "로딩 상태 관리").

- **queryKey는 `src/services/queryKeys.ts` 레지스트리로만 만듭니다.** 첫 요소는 도메인 이름,
  파라미터는 마지막 객체 하나, 정산월 의존 쿼리는 `{ year, month }` 포함, 화면 컴포넌트는 이
  파일을 직접 import하지 않고 훅 안에 캡슐화합니다(규칙 원문은 파일 상단 주석).
- 기본 옵션(`src/services/queryClient.ts`): `staleTime` 30초, 재시도는 5xx·네트워크 오류만 1회
  (4xx는 재시도하지 않음). 도메인별로 다르게 필요하면 해당 훅에서 오버라이드합니다.
- 다음 페이지·기간을 불러오는 동안 이전 데이터를 유지하려면 `placeholderData: keepPreviousData`를
  씁니다(예: `useGetTransactions`).

## 렌더링 성능

- `React.memo`/`useMemo`/`useCallback`은 불필요한 리렌더/재계산이 측정되거나 명백히 예상되는
  지점에서만 씁니다.
- `src/state/selectors/*`는 의도적으로 메모이즈하지 않은 일반 함수입니다(렌더마다 재계산해도
  가볍다). 이 계층에 최적화를 임의로 추가하지 마세요.
