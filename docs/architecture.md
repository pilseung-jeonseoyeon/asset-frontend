# 아키텍처 & 폴더 구조

`asset-frontend`(Monit)는 Vite + React 19 SPA입니다. 로그인한 뒤의 5개 메뉴 화면은
`react-router-dom`(`BrowserRouter`, `src/main.tsx`)으로 URL과 연결되어 있습니다 — `/dashboard`
`/assets` `/stocks` `/ledger` `/settings` 5개 경로만 존재하고, 그 외(`/`, 알 수 없는 경로)는 전부
`/dashboard`로 `replace` 리다이렉트됩니다. 라우트 정의는 `src/components/layout/AuthenticatedApp.tsx`,
경로 목록은 `navItems.ts`의 `NAV_ITEMS`(사이드바/하단탭과 공유)입니다. 화면 내 탭(가계부 개요/내역,
주식 전체/국내/해외)과 모달은 라우팅 범위 밖이라 `AppState`로만 관리합니다. 동적 라우트나 인증
라우트 그룹은 없습니다 — 로그인 전(`anonymous`)에는 주소와 무관하게 `screens/Auth`만 렌더됩니다.

세부 컨벤션은 각 문서를 참고하세요:
- [`code-convention.md`](./code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`api-conventions.md`](./api-conventions.md) — axios/React Query 기반 API 통신 규칙
- [`state-management.md`](./state-management.md) — AppState / Zustand / React Query 상태 경계
- [`mobile.md`](./mobile.md) — 모바일 브레이크포인트, 하단탭·바텀시트 규격, 터치 대응

## 진입점 & 렌더 흐름

```
main.tsx
  └─ BrowserRouter (react-router-dom)
       └─ QueryClientProvider (services/queryClient.ts)
            └─ AppStateProvider (state/AppStateContext.tsx)
                 └─ App.tsx  — 테마 적용(useApplyTheme) 후 AppShell 렌더
                      └─ AppShell — 인증 상태에 따라 분기
                           ├─ status 'unknown'      → 세션을 본 적 있으면 BootScreen(조용한 세션
                           │                          복구 중), 처음 온 방문자면 곧장 screens/Auth
                           ├─ status 'anonymous'    → screens/Auth
                           └─ status 'authenticated'→ AuthenticatedApp (lazy 청크,
                                ChunkErrorBoundary로 감쌈 — 재배포로 옛 청크가 사라져
                                import()가 실패하면 새로고침 안내를 띄운다)
                                  ├─ <Routes>가 경로에 따라 5개 화면 중 하나를 렌더
                                  └─ 모든 모달(각각 ModalErrorBoundary로 감쌈)
```

`BrowserRouter`는 `AppStateProvider`보다 바깥, 트리 최상단에 둡니다 — 라우터 컨텍스트가 인터랙션
상태나 lazy 청크 분리와 무관하게 항상 유효해야 하기 때문입니다.

## 폴더 구조

```
src/
  main.tsx, App.tsx, index.css, vite-env.d.ts

  state/                 인터랙션/화면 상태 — "모델" 레이어 (자세한 경계는 state-management.md)
    types.ts               AppState 형태 + Screen/EntryType 등 union 타입
    initialState.ts        기본값
    actions.ts             PATCH/PATCH_FN 액션 타입
    reducer.ts             병합 리듀서
    AppStateContext.tsx    Provider + useAppState()
    selectors/             기능별 헬퍼 — AppState를 다루는 작은 훅(useDropdown, useEntityDropdown,
                           useDatePicker, useCloseModal, useGoAuthScreen 등)과 탭·내비 스타일 계산
                           함수(auth, datePicker, dropdown, entryDraft, modal, nav, tabStyles,
                           stockTabStyles). 메모이즈하지 않는다

  services/              axios + React Query 기반 API 레이어
    api.ts                 axios 인스턴스 + ApiError + unwrap + Bearer 부착 + 401 재발급 큐
    apiBlob.ts             엑셀 등 바이너리 전용 axios 인스턴스(export·import가 공유). 실패 응답도
                           Blob이라 공용 인터셉터가 에러를 못 읽기 때문에 분리한다
    api.types.ts           공용 봉투 타입(ApiResponse<T> / ApiErrorPayload)
    common.type.ts         도메인 공용 enum · 목록 파라미터 · Spring Page<T>
    queryKeys.ts           queryKey 중앙 레지스트리(queryKeys)
    queryClient.ts         React Query QueryClient
    {domain}/              {domain}.service.ts / .hook.ts / .type.ts / index.ts
                           auth, user, institution, account, asset, category, transaction,
                           subscription, stock, trade, exchange, marketIndex, goal,
                           dashboard, notification, export, import, connection

  stores/                화면 트리와 무관한 전역 상태만 두는 Zustand store
    auth.ts                액세스 토큰 + 로그인 상태(useAuthStore) — 메모리 전용

  data/                  서버 응답 → 화면용 뷰모델 변환(순수 함수). 색상·아이콘·포맷 문자열 같은
                         디자인 시스템 규칙이 여기 산다
    {screen}View.ts        assetsView, dashboardView, ledgerView, stocksView, reportView(월간 리포트)
    accountView.ts         계좌 표기 규칙 — 계좌를 고르는 여러 화면이 공유
    connectionView.ts      증권사·거래소 연동(BYOK) 표기 규칙의 정본
    notificationView.ts    헤더 알림 패널 뷰모델
    termsContent.ts        회원가입 동의서 문안 + TERMS_VERSION

  design/                bank-institutions.ts(금융기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘) — BankIcon에 사용

  components/
    primitives/            {Name}/{Name}.tsx — Avatar, BankIcon, Card, DatePicker, DeepCard,
                           DonutChart, Dropdown, Icon, Modal(+sheetHeader.ts), SavingsBarChart,
                           SegmentedTab, Skeleton, StatBadge, Switch, Treemap
                           + usePopoverAnchor.ts(팝오버를 모달 밖으로 띄우는 공용 훅)
    layout/                AppShell(인증 게이팅), AuthenticatedApp(<Routes> + 모달 마운트), Header,
                           NotificationPanel(헤더 알림), SidebarNav(데스크톱), BottomTabNav(모바일),
                           navItems.ts(NAV_ITEMS), BootScreen, ChunkErrorBoundary(lazy 청크 로드
                           실패), ModalErrorBoundary(모달 하나의 렌더 실패를 그 모달 자리로 국한),
                           MonitLogo, useSyncUserTheme.ts
      modals/              AccountModal(전역 계정 오버레이), TermsDetailOverlay(약관 전문 —
                           가입 1단계·로그인 푸터·설정 하단이 공유)

  screens/               화면별 폴더. 화면 전용 모달은 하위 modals/에 둔다
    Auth/                  로그인·회원가입·비밀번호 찾기(LoginForm, SignupForm, ResetPasswordForm,
                           CodeInput, useResendCooldown). status가 'anonymous'일 때만 렌더된다
    Dashboard/             Dashboard.tsx(레이아웃 스위치) + cards/(카드 하나가 한 파일, 자기 데이터
                           훅을 직접 부른다) + hooks/(카드끼리 공유하는 계산) + layouts/(A·B·C 배치만)
    Assets/, Stocks/, Ledger/, Settings/   각각 {Screen}.tsx + modals/

  styles/                fonts.css(웹폰트), tokens.css(디자인 토큰), bank-tokens.css(기관별 색상),
                         base.css(리셋 + 지정된 hover/media 클래스만)
                         — index.css에서 이 순서 그대로 import한다

  utils/                 format.ts(formatNumber, formatKrw, formatCurrencyAmount, formatUsd,
                         formatKoreanUnits, parseAmount), deltaBadge.ts(makeDeltaBadge/hexToRgba),
                         theme.ts(useApplyTheme), date.ts(정산월 계산 포함), download.ts,
                         useMediaQuery.ts(useIsMobile), useDebouncedValue.ts,
                         useCurrentSettlementMonth.ts(오늘이 속한 정산월 — 서버 정본),
                         notificationTime.ts, reportExport.ts(리포트 카드 PNG 저장·공유),
                         dashboardLayout.ts · ledgerLastAccounts.ts(localStorage 헬퍼)
```

## 레이어 간 규칙

- 화면 컴포넌트(`screens/*`)는 `useAppState()`와 `@/services/{domain}`의 훅을 직접 호출하고,
  응답을 `data/*View.ts`로 넘겨 화면용 형태로 바꿉니다 — container/presenter 분리나 `App`으로부터의
  prop drilling이 없습니다.
- **`services/`에는 UI 관심사를 넣지 않습니다.** 색상·아이콘·포맷 문자열·티어 계산 같은 디자인
  시스템 규칙은 `data/`에 둡니다. 반대로 `data/`는 페칭하지 않습니다.
- **모달은 `AuthenticatedApp`에 항상 마운트**되어 있고(현재 라우트와 무관) 닫아도 언마운트되지
  않습니다. 그래서 모달을 닫을 때 로컬 `useState`, mutation의 `.reset()`, `openDropdown`, 해당
  `datePickerPicked`/`datePickerViewingMonth` 키를 직접 초기화해야 합니다 — 안 하면 이전 세션의
  확인창·에러가 다음에 열 때 그대로 남습니다. 같은 이유로 열려 있지 않은 모달이 요청을 쏘지 않도록
  fetch 훅에 `enabled` 가드를 겁니다.
- 새 모달을 추가하면 `AuthenticatedApp`에서 `ModalErrorBoundary`로 감싸 마운트합니다. `zIndex`는
  모달이 자기 `<Modal>`에 넘기는 값과 맞춥니다.
- 새 화면/모달은 기존 패턴(화면 폴더 하나, 전용 모달은 `modals/` 하위)을 따릅니다. 새로운 최상위
  폴더(`_components`, `shared/` 등)를 만들지 않습니다 — 여러 화면이 공유하는 컴포넌트는
  `components/primitives`(원자 단위) 또는 `components/layout`(구조/전역 오버레이)에 둡니다.
- 대시보드에 카드를 추가할 때는 `cards/`에 한 파일로 만들고 자기 데이터 훅을 직접 부르게 합니다 —
  그래야 A·B·C 어느 레이아웃에서든 그대로 재사용됩니다. 레이아웃 파일은 배치만 합니다.
- 도메인 데이터를 어디 둘지는 `state-management.md`의 표를 따릅니다: 인터랙션 상태는 `AppState`,
  서버 데이터는 React Query 캐시, 화면 트리와 무관한 전역 상태만 `stores/`.
- API 도메인을 추가할 때는 `services/{domain}/`에 `api-conventions.md`의 서비스 폴더 구조
  (`{domain}.service.ts`/`.hook.ts`/`.type.ts`/`index.ts`)를 그대로 따릅니다.
