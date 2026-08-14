# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트

`asset-frontend`는 **Monit(모닛)** — 개인 자산관리 앱(대시보드, 자산, 주식, 가계부, 설정)의 프론트엔드입니다. 기존에 존재하는 인터랙티브 HTML/JS 디자인 프로토타입을 React로 처음부터 재구현한 앱입니다. 화면을 수정하기 전에 아래 "절대 규칙"과 "도메인 컨텍스트"를 반드시 먼저 읽어주세요.

## 절대 규칙

아래 규칙과 충돌하는 변경을 하려면, 그대로 진행하지 말고 먼저 물어보세요. (계속 추가 예정)

1. **`secret/` 폴더 안의 문서는 어떤 경우에도 git에 커밋하거나 푸시하지 않는다.** (`.gitignore`에 이미 등록되어 있음 — 실수로라도 `git add -f` 등으로 우회하지 말 것)
2. **중요한 정보(API 키, 토큰 등 민감한 값)는 코드나 커밋되는 파일에 직접 노출하지 않고, `.env`에 넣어서 관리한다.** (`.env`는 `.gitignore`에 등록되어 있음)
3. **작업을 시작하기 전에는 항상 `git pull`부터 받는다.**
4. **상태 관리, 코드 스타일, API 통신 방식 등에 대한 규칙을 추측하기 전에, 먼저 아래 "관련 문서"에 이미 정리되어 있는지부터 찾아본다.** 문서에도 없는 세부 규칙은 추측하지 말고 사용자에게 확인한다.

## 서브에이전트 활용

이 저장소에는 Monit 제품을 잘 아는 전담 개발자처럼 동작하도록 설정해둔 서브에이전트(특정 역할에 맞춰 미리 준비해둔 보조 작업자, `.claude/agents/`에 정의됨) 2명이 있습니다. 실제 개발팀에 화면 개발자와 코드 리뷰어가 따로 있는 것처럼, 아래 상황에서는 직접 코드를 짜지 말고 반드시 해당 서브에이전트를 호출하세요.

1. **화면 UI를 새로 만들거나 수정할 때 → `ui-ux-frontend-developer`를 사용한다.** 컴포넌트 구현, 반응형 레이아웃, 인터랙션/상태 관리, 접근성이 필요한 모든 작업이 대상입니다.
2. **기능 구현이나 수정이 끝난 뒤 → `strict-code-reviewer`로 반드시 검토를 받는다.** 버그, 성능 저하, 보안 취약점, 엣지 케이스를 점검하는 역할이며, 사용자가 따로 요청하지 않아도 구현이 끝나면 자동으로 리뷰를 돌립니다.
3. **리뷰에서 문제가 발견되면 그대로 끝내지 않고 수정 루프를 돈다.** `strict-code-reviewer`가 지적한 내용을 바탕으로 `ui-ux-frontend-developer`가 다시 수정하고, 심각한 지적이 있었다면 수정 후 다시 `strict-code-reviewer`에게 재검토를 받습니다. "문제 없음"이 나올 때까지, 혹은 더 이상 고칠 게 없다고 판단될 때까지 이 과정을 반복합니다.

## 관련 문서

아래 문서들이 이 저장소의 세부 규칙을 담고 있습니다. 관련 작업을 시작하기 전에 먼저 확인하세요.

- [`docs/architecture.md`](./docs/architecture.md) — 전체 폴더 구조, 레이어 간 규칙
- [`docs/state-management.md`](./docs/state-management.md) — AppState / Zustand / React Query 상태 경계
- [`docs/code-convention.md`](./docs/code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`docs/api-conventions.md`](./docs/api-conventions.md) — axios/React Query 기반 API 통신 규칙, 서비스 폴더 구조
- [`docs/backend-requests.md`](./docs/backend-requests.md) — 연동 중 확인된 백엔드 스펙 누락·불일치와 요청 목록
- `secret/API-SPEC.md` — 백엔드 API 스펙 (git에 커밋되지 않는 폴더 — 절대 규칙 1 참고).
  2026-08-09에 전면 갱신되어 **인증(§16), 대시보드(§4), 목표(§5), 알림 SSE(§9.1)와
  "부록: 응답 타입 총람"까지 포함**합니다. 필드의 null 여부와 enum 값은 각 절의 JSON 예시가
  아니라 **부록을 기준**으로 삼으세요(예시에는 null이 되는 필드가 안 드러납니다).
  스펙에도 없는 세부는 추측하지 말고 `docs/backend-requests.md`에 요청 항목으로 남기세요.

## 아키텍처

- 기술 스택: Vite + React 19 + TypeScript. `react-router-dom`(`BrowserRouter`)으로 로그인 후 5개 메뉴 화면(`/dashboard` `/assets` `/stocks` `/ledger` `/settings`)을 URL에 연결합니다 — 그 외 경로(`/`, 알 수 없는 경로)는 `/dashboard`로 리다이렉트됩니다. 라우팅 범위는 이 5개 화면뿐이고, 화면 내 탭(가계부 개요/내역, 주식 전체/국내/해외)이나 모달은 여전히 주소와 무관하게 `AppState`로만 관리됩니다. CSS 프레임워크 없음. 테스트 러너 아직 미구성.
- 상태는 세 레이어로 나뉩니다: 앱 자체 reducer/context(`AppState`) + React Query(서버 상태) + Zustand(`src/stores/` — 전역 로딩, 인증 토큰). 경계는 `docs/state-management.md` 참고.
- **데이터는 서버에서 옵니다.** axios + React Query 기반 API 레이어가 `src/services/{domain}/`에 도메인별로 있고(`auth` `user` `institution` `account` `asset` `category` `transaction` `subscription` `stock` `trade` `exchange` `marketIndex` `goal` `dashboard` `notification`), 자산·가계부·주식 화면과 헤더 알림·자산 목표는 조회와 생성/수정/삭제가 모두 실제 API에 연결되어 있습니다.
  **아직 목업인 곳은 월간 리포트 오버레이(`ReportOverlay.tsx`) 한 곳뿐입니다.** 대시보드 화면은 서버 통신(`src/services/dashboard`)과 뷰모델 변환(`src/data/dashboardView.ts`)을 거쳐 실제 API에 연결되어 있습니다(`mockDashboard.ts`는 삭제됨).
- 진입점: `src/main.tsx`가 `BrowserRouter` → `QueryClientProvider` → `AppStateProvider`로 감싼 `App`을 `index.html`의 `#root`에 마운트합니다. `src/index.css`는 `tokens.css` → `bank-tokens.css` → `base.css` 순으로 import합니다. `App.tsx`는 현재 테마를 적용(`useApplyTheme`)한 뒤 `AppShell`을 렌더링합니다. 화면 전환은 더 이상 `state.screen`이 아니라 `AuthenticatedApp.tsx`의 `<Routes>`가 담당합니다(경로 목록은 `navItems.ts`의 `NAV_ITEMS`를 사이드바/하단탭과 공유).
- `tsconfig.json`은 project references 구조입니다: `src/`는 `tsconfig.app.json`, Vite 설정은 `tsconfig.node.json`을 사용합니다. 전체 빌드는 항상 `tsc -b`로 실행하세요(단순 `tsc` 아님).

### 폴더 구조

```
src/
  state/                 앱 전역 상태(AppState) — "모델" 레이어
    types.ts               AppState 형태 + 모든 union 타입(Screen, EntryType 등)
    initialState.ts        소스에서 그대로 옮긴 기본값
    actions.ts              PATCH / PATCH_FN 액션 타입(dc.html의 setState를 미러링)
    reducer.ts               단순 병합 리듀서
    AppStateContext.tsx       Provider + useAppState() 훅
    selectors/                기능별 순수 헬퍼 함수(auth, datePicker, dropdown, modal, nav,
                              segTab, stocks) — 메모이즈하지 않은 일반 함수. 소스가
                              렌더마다 재계산하는 방식을 그대로 따른 것
  services/              API 통신 레이어. api.ts(axios + ApiError + unwrap), api.types.ts,
                         common.type.ts(도메인 공용 enum), queryKeys.ts(qk 레지스트리),
                         queryClient.ts, 그리고 {domain}/{domain}.service|hook|type.ts
  stores/                Zustand. ui.ts(전역 로딩 카운터), auth.ts(액세스 토큰 — 메모리 전용)
  data/                  {screen}View.ts — 서버 응답 → 화면용 뷰모델 변환(순수 함수).
                         색상·아이콘·포맷 문자열 등 디자인 시스템 규칙이 여기 산다.
                         mock*.ts는 모두 제거됨 — 화면이 쓰는 데이터는 전부 서버에서 온다
  design/                bank-institutions.ts(125개 기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘 경로 25종) — BankIcon에 사용
  components/
    primitives/            원자 단위 UI 컴포넌트(Card, Button, Icon, DonutChart, Treemap,
                           BankIcon, DatePicker, Modal, Dropdown, SegmentedTab, StatBadge,
                           DeepCard, Avatar)
    layout/                AppShell, Header, SidebarNav, layout/modals/(전역 오버레이 모달)
  screens/               최상위 화면별 폴더: Auth, Dashboard, Assets, Stocks, Ledger, Settings
                         (Auth는 useAuthStore().status === 'anonymous'일 때만 렌더됨)
  styles/                tokens.css(디자인 토큰, 라이트/다크), bank-tokens.css(기관별 색상),
                         base.css(리셋 + 지정된 hover/media 클래스만)
  utils/                 format.ts(fmt), deltaBadge.ts(mkDelta/hexToRgba),
                         theme.ts(useApplyTheme), date.ts
```

- 화면 컴포넌트는 `useAppState()`와 `@/services/{domain}`의 훅을 직접 호출하는 단순한 구조입니다 — container/presenter 분리나 `App`으로부터의 prop drilling이 없습니다.
- `BankIcon`은 기관의 `tokenKey`로 `bank-institutions.ts`에서 `archetype`을 조회한 뒤, 해당 archetype의 SVG 경로(`bank-archetypes.ts`)를 `--bank-{tokenKey}-bg/-fg` 색상으로 렌더링합니다.

## 빌드 & 테스트

```bash
pnpm install       # 의존성 설치
pnpm dev           # HMR 지원 Vite 개발 서버 실행
pnpm build         # tsc -b (project references) + vite build
pnpm lint          # oxlint (.oxlintrc.json — react/typescript/oxc 플러그인만 사용)
pnpm preview       # 프로덕션 빌드 미리보기
```

테스트 러너는 아직 구성되어 있지 않습니다. 러너가 생기기 전까지는, 빌드가 깨끗하게 통과하고(`pnpm build`), 린트가 깨끗하고(`pnpm lint`), 실행 중인 개발 서버(`pnpm dev`)에서 직접 확인했을 때만 변경이 "완료"된 것으로 취급하세요 — 코드를 정적으로 읽은 것만으로 UI 변경이 동작한다고 단정하지 마세요.

## 도메인 컨텍스트

- 앱: Monit(모닛), 개인 자산관리 앱. URL로 전환되는 5개 화면: 대시보드(`/dashboard`) / 자산(`/assets`) / 주식(`/stocks`) / 가계부(`/ledger`) / 설정(`/settings`).
- **가계부 거래유형**(`EntryType`): `income`(수입, 초록 — `--inc-*`), `expense`(지출, 빨강/살몬 — `--exp-*`), `saving`(저축, 보라 — `--sav-*`), `transfer`(이체, 전용 색상 없음, `--text-strong`으로 렌더링). 거래 내역 목록에서는 수입에 `+`, 지출에 `−`, 저축/이체는 부호 없음(`src/data/ledgerView.ts`의 `buildLedgerTx` 참고). 단, 히어로/딥카드의 증감 배지는 항상 명시적으로 부호를 표시합니다.
  서버 `TransactionType`(`INCOME`/`EXPENSE`/`SAVING`/`TRANSFER`)이 이 화면 타입과 1:1로 대응합니다.
- **가계부 카테고리는 서버 리소스**입니다(`GET /categories`). 수입/저축/지출 3개 구분(`CategoryKind`) 아래 대분류가 있고, 그 아래 소분류가 붙습니다. **대분류는 서버 시드 고정이라 API로 만들 수 없고, 소분류만 추가·삭제할 수 있습니다.** 입력 폼은 배열 인덱스가 아니라 **`subcategoryId`(서버 id)** 로 선택을 추적합니다.
  거래 등록 시 타입별 필드 규칙을 어기면 400입니다.
  **수입/지출**은 `subcategoryId` 필수 + `transferAccountId` 금지, **이체**는 그 반대,
  **저축은 둘 다 필수**입니다 — 저축액이 들어간 계좌(`transferAccountId`)를 받지 않으면 출금만
  잡혀 총자산이 줄어들기 때문입니다(출금 계좌 −amount, 상대 계좌 +amount로 총자산은 그대로고
  자산 구성만 바뀝니다).
- **자산 분류**: 현금 / 예적금 / 국내주식 / 해외주식 / 가상자산 / 연금·기타, 6개 고정 카테고리이며 각각 아이콘·금액·전체 대비 비중을 가집니다. 트리맵("맵") 뷰는 비중에 따라 3단계 렌더 티어로 분류합니다: `full`(15% 이상), `medium`(6% 이상), `icon`(그 미만). 5% 미만 항목은 합쳐서 `기타` 블록으로 만듭니다. `mapSort`(자연/기관별 정렬 토글)는 상태에는 존재하지만 소스에서도 어떤 UI에도 연결되지 않은 죽은 토글입니다 — 명시적 요청 없이 "완성"시키지 마세요.
- **금융기관**: `src/design/bank-institutions.ts`는 9개 카테고리(`bank`/`securities`/`card`/`lifeInsurance`/`fireInsurance`/`savingsBank`/`crypto`/`fintech`/`pension`)에 걸친 국내 금융기관 125개의 마스터 목록입니다. 각 기관은 `tokenKey`(해당 `--bank-{tokenKey}-bg/-fg` 색상을 결정)와 `archetype`(공용 SVG 아이콘 모양 25종 중 하나)을 가집니다. KB 계열과 카카오 계열은 노란색 브랜드 컬러의 대비 확보를 위해 아이콘 stroke가 더 두껍습니다(기본 1.8 대비 2.0) — `BANK_YELLOW_STROKE_EXCEPTIONS` 참고.
- **포맷팅**: `fmt(n)`은 `n.toLocaleString('ko-KR')`이며 통화 기호를 포함하지 않습니다 — `원`은 소스가 그렇게 하는 위치마다 JSX에 리터럴 문자열로 붙입니다(`fmt` 내부가 아님). "약 12억 8,450만 원" 같은 조/억/만 축약 표기는 원래 목업마다 하드코딩된 리터럴이었으나, 대시보드가 서버 데이터로 전환되면서 `src/utils/format.ts`의 **`formatKoreanAbbrev(n)`** 로 계산합니다(2026-08-13 신설). 단위 사이 공백 1칸, 각 단위에 천 단위 콤마, 값이 0인 단위는 생략, 통화 기호 없음 — `원`은 `fmt`와 마찬가지로 호출부 JSX에서 붙입니다. **축약 헬퍼는 이것 하나로 유지하세요** — 화면마다 비슷한 함수를 새로 만들면 표기가 갈라집니다.
- **데이터 흐름**: 화면은 `@/services/{domain}`의 훅으로 서버 데이터를 읽고(React Query 캐시에 그대로 두며 AppState로 복사하지 않습니다), `src/data/{screen}View.ts`가 그 응답을 화면이 그릴 형태로 바꿉니다. 인터랙션 상태(탭·모달·폼 입력)만 `useAppState()`로 읽고 씁니다.
- **"월"의 기준**: 이 앱의 이번 달은 달력 1일이 아니라 사용자 설정 `monthStartDay`(1~28) 기준의 **정산월**입니다. 가계부·목표·대시보드 전역에 적용되며, 대부분의 API가 `year`/`month`를 파라미터로 받고 실제 기간 경계는 서버가 계산합니다. 정산월에 의존하는 쿼리는 queryKey에 `{ year, month }`를 반드시 포함하세요.
- **서버 응답에 없는 값은 화면에 그리지 않습니다.** 주식 현재가, USD/KRW 환율, 계좌 이자율처럼 API가 주지 않는 값은 하드코딩이나 추정값으로 채우지 말고 비워 두고, `docs/backend-requests.md`에 기록하세요.
- **인증**: 백엔드가 JWT 인증을 요구합니다. 모든 화면/모달은 `useAuthStore().status`가 `'authenticated'`일 때만 `AppShell`에 마운트되고, `'anonymous'`면 `src/screens/Auth/Auth.tsx`(로그인/회원가입/비밀번호 찾기)만 렌더됩니다. 로그인하지 않은 상태에서 화면을 시작하지 않습니다.
  **회원가입은 4단계입니다**(원본 `dc.html` L546-694): 약관 동의 → 정보 입력 → 이메일 인증 → 온보딩(프로필 확인). `POST /auth/signup`은 성공 즉시 토큰을 주지만, `usePostSignup`은 일부러 `signIn`을 호출하지 않고 토큰만 보유합니다 — 마지막 온보딩 화면의 "모닛 시작하기"에서 `useCompleteSignupOnboarding()`이 호출될 때 비로소 `authenticated`로 전환됩니다. 이 단계에서 새로고침하면 refresh 쿠키로 자동 로그인되어 온보딩 화면은 건너뜁니다(의도된 동작). — 자세한 경계는 `docs/state-management.md`, 인터셉터 동작은 `docs/api-conventions.md` 참고.
- **프로필**: 여전히 단일 사용자를 가정한 UI(가족 연동 등은 "준비 중")지만, 실제 이름·이메일은 로그인한 계정 기준으로 `GET /users/me`(`src/services/user`)에서 옵니다. `profileName: '정다은'`은 이제 하드코딩 기본값이 아니라 해당 사용자가 서버에 아직 없을 때(`USER_NOT_FOUND`)의 폴백 문자열일 뿐입니다(`src/services/user/user.hook.ts`의 `FALLBACK_PROFILE_NAME` 참고).

## 디자인 시스템

색상, 타이포그래피, radius, shadow, 다크모드, 카피 컨벤션은 모두 `secret/ds_rules_v2_5.md`가 기준입니다. 하지만 위 "절대 규칙"에서 언급했듯, **이 파일의 실제 내용을 CLAUDE.md나 다른 저장소 내 파일에 옮겨 적지 마세요** — 필요하면 파일 경로로만 참조하고, 세부 규칙이 필요한 결정을 내릴 때는 이미 공개된 `src/styles/tokens.css`, `bank-tokens.css`와 위에 명시된 규칙들을 근거로 삼되, 그것만으로 확신이 안 서는 부분은 추측하지 말고 사용자에게 확인하세요.
