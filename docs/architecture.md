# 아키텍처 & 폴더 구조

`asset-frontend`(Monit)는 라우터가 없는 Vite + React 19 SPA입니다. URL 기반 페이지 전환이
아니라 `state.screen` 값에 따라 `AppShell`이 화면 컴포넌트를 스위칭합니다. 역할별
레이아웃(강사/학습자 같은)이나 `[id]` 동적 라우트, 인증 라우트 그룹 같은 구조는 없습니다 —
이 앱은 단일 하드코딩 사용자이고 인증 개념 자체가 없습니다.

세부 컨벤션은 각 문서를 참고하세요:
- [`code-convention.md`](./code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`api-conventions.md`](./api-conventions.md) — axios/React Query 기반 API 통신 규칙
- [`state-management.md`](./state-management.md) — AppState / Zustand / React Query 상태 경계

## 진입점 & 렌더 흐름

```
main.tsx
  └─ QueryClientProvider (services/queryClient.ts)
       └─ AppStateProvider (state/AppStateContext.tsx)
            └─ App.tsx  — 테마 적용(useApplyTheme) 후 AppShell 렌더
                 └─ AppShell — state.screen 값으로 5개 화면 중 하나를 스위칭
                      dashboard / asset / stock / ledger / settings
```

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
    selectors/                기능별 순수 헬퍼(datePicker, dropdown, modal, nav, segTab, stocks)

  services/              axios + React Query 기반 API 레이어 (도메인 서비스 폴더는 실제 백엔드
                         연동을 시작할 때 하나씩 추가 — 지금은 공용 인프라만 존재)
    api.ts                  axios 인스턴스 + 응답 인터셉터
    api.types.ts             공용 ApiResponse<T>
    queryClient.ts            React Query QueryClient
    {domain}/                 도메인 추가 시: {domain}.service.ts / .hook.ts / .type.ts / index.ts

  stores/                화면 트리와 무관한 전역 UI 상태만 두는 Zustand store
    ui.ts                   전역 로딩 카운터(useUiStore)

  data/                  화면별 mock*.ts — 리터럴 데이터 + 소규모 순수 계산 함수. 실제 API
                         연동 전까지 모든 도메인 데이터의 출처
    mockAccounts.ts, mockAssets.ts, mockDashboard.ts, mockLedger.ts,
    mockNotifications.ts, mockStocks.ts

  design/                bank-institutions.ts(금융기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘) — BankIcon에 사용

  components/
    primitives/            Avatar, BankIcon, Button, Card, DatePicker, DeepCard, DonutChart,
                           Dropdown, Icon, Modal, SegmentedTab, StatBadge, Treemap
    layout/                AppShell, Header, SidebarNav, layout/modals/(전역 오버레이 모달)

  screens/               화면별 폴더, 각각 자기 전용 모달을 하위 modals/에 둠
    Dashboard/, Assets/(+modals/), Stocks/, Ledger/(+modals/), Settings/(+modals/)

  styles/                tokens.css(디자인 토큰), bank-tokens.css(기관별 색상),
                         base.css(리셋 + 지정된 hover/media 클래스만)

  utils/                 format.ts(fmt), deltaBadge.ts(mkDelta/hexToRgba), theme.ts(useApplyTheme),
                         date.ts
```

## 레이어 간 규칙

- 화면 컴포넌트(`screens/*`)는 `useAppState()`를 직접 호출하고 필요한 `data/mock*` 를 직접
  import합니다 — container/presenter 분리나 `App`으로부터의 prop drilling이 없습니다.
- 새 화면/모달을 추가할 땐 기존 화면과 같은 패턴(폴더 하나, 전용 모달은 `modals/` 하위)을
  따릅니다. 새로운 최상위 폴더(예: `_components`, `shared/`)를 만들지 않습니다 — 여러 화면이
  공유하는 컴포넌트는 `components/primitives`(원자 단위) 또는 `components/layout`(구조/전역
  오버레이)에 둡니다.
- 도메인 데이터를 어디 둘지는 `state-management.md`의 표를 따릅니다: 인터랙션 상태는
  `AppState`, 서버 데이터는 React Query 캐시, 화면 트리와 무관한 전역 UI 상태만 `stores/`.
- API 도메인을 추가할 때는 `services/{domain}/`에 `api-conventions.md`의 서비스 폴더 구조
  (`{domain}.service.ts`/`.hook.ts`/`.type.ts`/`index.ts`)를 그대로 따릅니다.
