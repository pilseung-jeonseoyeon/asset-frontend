# 상태 관리

상태는 종류별로 담당 레이어가 나뉩니다. 새 상태를 추가할 때는 아래 기준으로 어디에 둘지 먼저
정하세요. 데이터 접근 자체의 규칙(supabase-js 래퍼, 에러 처리, 서비스 폴더 구조)은
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
- **새 알림 배너**(`AppState.notificationBanners`·`notificationPendingIds`)에는 알림 **id만** 둡니다. 알림 내용은
  서버 데이터라 React Query 알림 목록 캐시가 정본이고, 배너는 렌더할 때 거기서 찾습니다(Realtime으로 받은 알림은
  `useNotificationStream`이 목록 캐시 맨 앞에 끼워 넣음).

### localStorage는 캐시·힌트 전용입니다

서버 정본의 캐시나 이 기기 전용 편의 힌트에만 씁니다. 키는 모두 `monit.` 접두어, 접근 실패는
전부 try/catch로 삼키고 기본값으로 동작해야 합니다. **토큰·금액·이름 같은 값은 절대 넣지 않습니다.**

| 키 | 담당 파일 | 용도 |
|---|---|---|
| `monit.theme` | `src/utils/theme.ts` | 테마 캐시(부팅 FOUC 방지) |
| `monit.seenSession` | `src/stores/auth.ts` | 이 브라우저에서 로그인한 적 있는지(부팅 게이팅용 불리언) |
| `monit.rememberMe` | `src/services/supabase.ts` | 로그인 상태 유지 여부(불리언 힌트). Supabase 세션을 `localStorage`에 둘지 `sessionStorage`에 둘지 가른다 |
| `monit.ledger.lastAccounts` | `src/utils/ledgerLastAccounts.ts` | 가계부 입력 폼의 거래유형별 마지막 사용 계좌 id. AppState에 쓰지 않고 드롭다운 폴백으로만 적용 |
| `monit.dashboardLayout` | `src/utils/dashboardLayout.ts` | 대시보드 카드 배치(이 기기 전용) |
| `monit.viewScope` | `src/utils/viewScope.ts` | 상단 '개인 \| 우리집'의 마지막 선택(가족·커플 공유 v17, 이 기기 전용). `AppState.viewScope`가 렌더용 미러이고, 실제 범위는 연결 여부와 합쳐 `useViewScope()`가 정한다(연결이 없으면 늘 '개인') |
| `monit.notification.prefs` | `src/utils/notificationPrefs.ts` | 알림 받는 방식(화면 안 팝업·맥·PC 알림·내용 보이기, 이 기기 전용 — 브라우저 알림 허락이 기기마다 따로라서). `AppState.notificationPrefs`가 렌더용 미러 |
| `monit.notification.askDismissedAt` | `src/utils/notificationPrefs.ts` | 알림 패널의 맥·PC 알림 안내 카드에서 '다음에'를 누른 시각(30일 동안 다시 안 물음) |

### Zustand는 좁은 예외입니다

Zustand는 화면 트리와 무관하게 여러 곳에서 동시에 읽고 써야 하는 전역 상태에만 씁니다. 현재는
`src/stores/auth.ts`의 `useAuthStore` 하나뿐입니다. 새 store를 만들기 전에 `AppState`나 React
Query 캐시로 표현할 수 없는지부터 확인하세요.

- store는 `src/stores/{domain}.ts`에 하나씩 두고, 액션을 이름 붙여 노출합니다. 컴포넌트에서는
  store 전체를 구조분해하지 말고 필요한 필드/액션만 selector로 가져옵니다
  (`useAuthStore((s) => s.signIn)`).

### 인증 상태 (`useAuthStore`)

`AppShell`의 게이팅과 가계부의 '내 거래인지' 판정(가족·커플 공유)·알림 Realtime 필터가 동시에 참조하므로 Zustand에 둡니다. 이 store는
"지금 인증되어 있는가"와 "누구인가(`userId`, uuid 문자열)"만 다룹니다.

- **토큰은 store에 두지 않습니다.** 세션(액세스·리프레시 토큰)은 Supabase 클라이언트(`src/services/supabase.ts`)가
  보관하고 갱신합니다. 저장 위치는 로그인 순간의 "로그인 상태 유지"에 따라 `localStorage`(유지) 또는
  `sessionStorage`(앱·탭을 닫으면 풀림)이고, 그 선택은 `monit.rememberMe` 힌트로 남습니다. 가입은 유지로 시작합니다.
  스프링의 httpOnly 쿠키보다 XSS에 약한 구조라, 데스크톱 앱은 외부 스크립트 없이 CSP로 잠급니다.
- **부팅 복원**: `useRestoreSession()`(`src/services/auth/auth.hook.ts`)이 저장된 세션을 한 번 읽습니다(`getSession`,
  만료됐으면 Supabase가 갱신). 제한 시간 안에 답이 없으면 `anonymous`로 떨어지고, `monit.seenSession`은 저장된 세션이
  없다고 확인됐을 때만 지웁니다. 그 뒤로는 `onAuthStateChange`(`SIGNED_OUT`·`TOKEN_REFRESHED` 등)를 store에 반영합니다.
- **세션 중 만료**: Supabase가 리프레시에 실패하면 `SIGNED_OUT`을 보내고 store가 `signOut()`합니다.
- **`status: 'unknown' | 'authenticated' | 'anonymous'`** 로 `AppShell`이 렌더를 가릅니다.
  - `unknown` + 로그인한 적 없음(`hasSeenSession()` false) → 곧바로 로그인 화면. 복원은
    백그라운드에서 계속 진행되고 성공하면 반영됩니다.
  - `unknown` + 로그인한 적 있음 → 복원이 끝날 때까지 `BootScreen`.
  - `anonymous` → `screens/Auth`만. 헤더·모달을 마운트하면 쿼리가 401을 쏟아내기 때문입니다.
  - `authenticated` → `AuthenticatedApp`(lazy 청크) 전체.
- **신원 경쟁 방지**: 로그인 화면을 복원보다 먼저 띄우므로, 수동 로그인 도중 저장돼 있던 다른 세션이
  복원될 수 있습니다. 그래서 `beginManualAuth`/`endManualAuth`(`manualAuthPending`)와
  `authGeneration`(수동 로그인·로그아웃마다 증가)으로 복원 결과 반영을 막습니다 —
  `applyRestoredSession`은 요청 시작 시점의 세대가 그대로이고 수동 인증 중이 아닐 때만 반영합니다.
  `markAnonymous`는 이미 `authenticated`면 상태를 내리지 않습니다(강제 로그아웃은 `signOut` 몫).
  같은 장치가 **가입 3단계(코드 확인)와 비밀번호 재설정**의 임시 세션이 앱을 열어 버리지 않게 막습니다.
- **로그인·가입·로그아웃 시 `queryClient.clear()`** 로 이전 사용자의 캐시를 비웁니다.
- **회원가입**: 2단계에서 `usePostSignup`이 계정을 만들고 6자리 코드 메일을 보내며(`auth.signUp`), 3단계
  `useVerifySignupCode`가 코드를 확인해 세션을 받지만 곧바로 `signIn`하지 않습니다. 온보딩 화면은
  `anonymous` 상태에서 보여 주고, "모닛 시작하기"에서 `useCompleteSignupOnboarding()`이 그 세션으로 `signIn`합니다.
  이 단계에서 새로고침하면 저장된 세션으로 자동 로그인되어 온보딩은 건너뜁니다(의도된 동작).
- **오류 코드**: Supabase Auth 코드는 `src/services/supabaseError.ts`가 스프링 코드(`INVALID_CREDENTIALS`,
  `DUPLICATE_EMAIL`, `WITHDRAWN_ACCOUNT`, `INVALID_VERIFICATION_CODE` …)로 바꿔 화면 분기가 그대로 동작합니다.

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
