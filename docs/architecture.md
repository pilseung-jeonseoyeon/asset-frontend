# 아키텍처 & 폴더 구조

`asset-frontend`(Monit)는 Vite + React 19 SPA입니다. 로그인한 뒤의 5개 메뉴 화면(대시보드/자산/
주식/가계부/설정)은 `react-router-dom`(`BrowserRouter`, `src/main.tsx`)으로 URL과 연결되어
있습니다 — `/dashboard` `/assets` `/stocks` `/ledger` `/settings` 5개 경로만 존재하고, 그 외
(`/`, 알 수 없는 경로)는 전부 `/dashboard`로 `replace` 리다이렉트됩니다. 라우트 정의는
`src/components/layout/AuthenticatedApp.tsx`에 있고, 경로 목록 자체는 `navItems.ts`의
`NAV_ITEMS`(사이드바/하단탭과 공유)에서 가져옵니다. 화면 탭(가계부 개요/내역, 주식 전체/국내/
해외)이나 모달은 라우팅 범위 밖이라 여전히 `AppState`의 인터랙션 상태로만 관리됩니다. 역할별
레이아웃(강사/학습자 같은)이나 `[id]` 동적 라우트, 인증 라우트 그룹 같은 구조는 없습니다 — 로그인
전(`anonymous`)에는 주소와 무관하게 `screens/Auth`만 렌더됩니다(아래 "레이어 간 규칙" 참고).

세부 컨벤션은 각 문서를 참고하세요:
- [`code-convention.md`](./code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`api-conventions.md`](./api-conventions.md) — axios/React Query 기반 API 통신 규칙
- [`state-management.md`](./state-management.md) — AppState / Zustand / React Query 상태 경계

## 진입점 & 렌더 흐름

```
main.tsx
  └─ BrowserRouter (react-router-dom)
       └─ QueryClientProvider (services/queryClient.ts)
            └─ AppStateProvider (state/AppStateContext.tsx)
                 └─ App.tsx  — 테마 적용(useApplyTheme) 후 AppShell 렌더
                      └─ AppShell — 인증 상태에 따라 Auth 또는 AuthenticatedApp
                           └─ AuthenticatedApp — <Routes>가 경로에 따라 5개 화면 중 하나를 렌더
                                /dashboard, /assets, /stocks, /ledger, /settings
```

`BrowserRouter`가 `AppStateProvider`보다 바깥에 있는 이유: 라우팅은 인터랙션 상태(`AppState`)와
무관하게 항상 최상위에서 유효해야 하는 컨텍스트라서다. `AppShell`/`AuthenticatedApp`은 lazy 청크로
분리되어 있지만(아래 "레이어 간 규칙" 참고) `BrowserRouter`가 트리 최상단에 있으므로 라우터
컨텍스트는 청크 분리와 무관하게 항상 사용 가능하다.

## 폴더 구조

```
src/
  main.tsx, App.tsx, index.css, vite-env.d.ts

  state/                 인터랙션/화면 상태 — "모델" 레이어 (자세한 경계는 state-management.md)
    types.ts               AppState 형태 + Screen/EntryType 등 union 타입
    initialState.ts        기본값
    actions.ts              PATCH/PATCH_FN 액션 타입
    reducer.ts               병합 리듀서
    AppStateContext.tsx       Provider + useAppState()
    selectors/                기능별 순수 헬퍼(auth, datePicker, dropdown, modal, nav, segTab, stocks)

  services/              axios + React Query 기반 API 레이어
    api.ts                  axios 인스턴스 + ApiError + unwrap + Bearer 부착 + 401 재발급 큐
    api.types.ts             공용 봉투 타입(ApiResponse<T> / ApiErrorPayload)
    common.type.ts            도메인 공용 enum · 목록 파라미터 · Spring Page<T>
    queryKeys.ts              queryKey 중앙 레지스트리(qk)
    queryClient.ts            React Query QueryClient
    {domain}/                 {domain}.service.ts / .hook.ts / .type.ts / index.ts
                              auth, user, institution, account, asset, category, transaction,
                              subscription, stock, trade, exchange, marketIndex

  stores/                화면 트리와 무관한 전역 상태만 두는 Zustand store
    ui.ts                   전역 로딩 카운터(useUiStore)
    auth.ts                 액세스 토큰 + 로그인 상태(useAuthStore) — 메모리 전용, 저장소 미사용

  data/                  서버 응답 → 화면용 뷰모델 변환 계층(순수 함수). 색상·아이콘·포맷 문자열
                         같은 디자인 시스템 규칙이 여기 산다
    assetsView.ts, ledgerView.ts, stocksView.ts
    mock*.ts                 아직 서버에 연결하지 않은 화면만 남아 있음
                             (mockDashboard: 대시보드·자산 목표, mockNotifications: 헤더 알림)

  design/                bank-institutions.ts(금융기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘) — BankIcon에 사용

  components/
    primitives/            Avatar, BankIcon, Button, Card, DatePicker, DeepCard, DonutChart,
                           Dropdown, Icon, Modal, SegmentedTab, StatBadge, Treemap
    layout/                AppShell, Header, SidebarNav, layout/modals/(전역 오버레이 모달)

  screens/               화면별 폴더, 각각 자기 전용 모달을 하위 modals/에 둠
    Auth/                   로그인·회원가입·비밀번호 찾기. useAuthStore().status가
                            'anonymous'일 때 AppShell이 이것만 렌더한다
    Dashboard/, Assets/(+modals/), Stocks/, Ledger/(+modals/), Settings/(+modals/)

  styles/                tokens.css(디자인 토큰), bank-tokens.css(기관별 색상),
                         base.css(리셋 + 지정된 hover/media 클래스만)

  utils/                 format.ts(fmt), deltaBadge.ts(mkDelta/hexToRgba), theme.ts(useApplyTheme),
                         date.ts
```

## 레이어 간 규칙

- 화면 컴포넌트(`screens/*`)는 `useAppState()`와 `@/services/{domain}`의 훅을 직접 호출하고,
  응답을 `data/{screen}View.ts`로 넘겨 화면용 형태로 바꿉니다 — container/presenter 분리나
  `App`으로부터의 prop drilling이 없습니다.
- **`services/`에는 UI 관심사를 넣지 않습니다.** 색상·아이콘·포맷 문자열·티어 계산 같은
  디자인 시스템 규칙은 `data/{screen}View.ts`에 둡니다. 반대로 `data/`는 페칭하지 않습니다.
- **모달은 `AppShell`에 항상 마운트**되어 있고 닫아도 언마운트되지 않습니다. 그래서 모달을 닫을
  때 로컬 `useState`, mutation의 `.reset()`, `openDropdown`, 해당 `dpPicked`/`dpNav` 키를 직접
  초기화해야 합니다 — 안 하면 이전 세션의 확인창·에러가 다음에 열 때 그대로 남습니다.
  같은 이유로 열려 있지 않은 모달이 요청을 쏘지 않도록 fetch 훅에 `enabled` 가드를 겁니다.
- 새 화면/모달을 추가할 땐 기존 화면과 같은 패턴(폴더 하나, 전용 모달은 `modals/` 하위)을
  따릅니다. 새로운 최상위 폴더(예: `_components`, `shared/`)를 만들지 않습니다 — 여러 화면이
  공유하는 컴포넌트는 `components/primitives`(원자 단위) 또는 `components/layout`(구조/전역
  오버레이)에 둡니다.
- 도메인 데이터를 어디 둘지는 `state-management.md`의 표를 따릅니다: 인터랙션 상태는
  `AppState`, 서버 데이터는 React Query 캐시, 화면 트리와 무관한 전역 UI 상태만 `stores/`.
- API 도메인을 추가할 때는 `services/{domain}/`에 `api-conventions.md`의 서비스 폴더 구조
  (`{domain}.service.ts`/`.hook.ts`/`.type.ts`/`index.ts`)를 그대로 따릅니다.
