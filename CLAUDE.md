# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트

`asset-frontend`는 **Monit(모닛)** — 개인 자산관리 앱(대시보드, 자산, 주식, 가계부, 설정)의 프론트엔드입니다. 인터랙티브 HTML/JS 디자인 프로토타입을 React로 재구현했습니다. 화면을 수정하기 전에 아래 "절대 규칙"과 "도메인 컨텍스트"를 먼저 읽어주세요.

## 절대 규칙

아래 규칙과 충돌하는 변경을 하려면, 그대로 진행하지 말고 먼저 물어보세요.

1. **`secret/` 폴더 안의 문서는 어떤 경우에도 git에 커밋하거나 푸시하지 않는다.** (`.gitignore`에 등록되어 있음 — `git add -f` 등으로 우회하지 말 것)
2. **민감한 값(API 키, 토큰 등)은 코드나 커밋되는 파일에 넣지 않고 `.env`로 관리한다.** (`.env`는 `.gitignore`에 등록되어 있음)
3. **작업을 시작하기 전에는 항상 `git pull`부터 받는다.**
4. **상태 관리, 코드 스타일, API 통신 방식 등의 규칙은 추측하기 전에 아래 "관련 문서"부터 찾아본다.** 문서에도 없는 세부 규칙은 사용자에게 확인한다.
5. **서브에이전트와 오케스트레이션을 쓰지 않는다.** 모든 작업은 메인 에이전트 혼자 직접 수행한다 — 아래 "작업 방식" 참고.

## 작업 방식

1. **서브에이전트를 호출하지 않는다.** `Agent`/`Task` 도구로 어떤 보조 작업자도 띄우지 않습니다(`.claude/agents/`의 정의는 남겨두되 사용하지 않습니다).
2. **오케스트레이션을 쓰지 않는다.** `Workflow`, 멀티 에이전트 실행, 백그라운드 에이전트 팬아웃 모두 사용하지 않습니다.
3. **구현도 검토도 메인 에이전트가 직접 한다.** 구현이 끝나면 스스로 아래를 점검합니다.
   - UI/UX — 모바일(아이폰·갤럭시) 사용성, 디자인 시스템 준수, 빈 상태·에러·로딩
   - 버그·성능 — 엣지 케이스, 불필요한 리렌더, 초기 청크 크기
   - 보안 — XSS, 토큰·쿠키 취급, 민감정보 노출
   - 테스트 관점 — 빈 값·경계값·정산월 경계·이상 입력
4. **사용자가 명시적으로 요청할 때만 예외로 한다.** ("서브에이전트 써줘", "워크플로우 돌려줘" 등)

## 관련 문서

관련 작업을 시작하기 전에 먼저 확인하세요.

- [`docs/architecture.md`](./docs/architecture.md) — 폴더 구조, 레이어 간 규칙
- [`docs/state-management.md`](./docs/state-management.md) — AppState / Zustand / React Query / localStorage 상태 경계, 인증 흐름
- [`docs/code-convention.md`](./docs/code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`docs/api-conventions.md`](./docs/api-conventions.md) — axios/React Query 기반 API 통신 규칙, 서비스 폴더 구조, 개발 서버 프록시
- [`docs/mobile.md`](./docs/mobile.md) — 모바일 브레이크포인트, 바텀시트/하단탭 규격, 터치 대응
- [`docs/excel-import.md`](./docs/excel-import.md) — 엑셀 가져오기·내보내기 서버 계약(양식 시트·열 순서·엔드포인트·응답·에러 코드)
- [`docs/superpowers/specs/2026-08-29-byok-connection-design.md`](./docs/superpowers/specs/2026-08-29-byok-connection-design.md) — 증권사·거래소 API 키 연동 계약과 남은 확인 사항

**백엔드 API 스펙의 정본은 실행 중인 서버의 OpenAPI 문서입니다.** 별도의 API 스펙 문서는 만들지 마세요.
- Swagger UI: `http://localhost:8080/docs` (또는 `http://localhost:8080/swagger-ui/index.html`)
- JSON: `http://localhost:8080/v3/api-docs`

필드 유무·타입·enum·필수 여부(`required`, nullable은 `type: [..., "null"]`)와 에러 코드 전체 표(`ErrorResponse` 설명)는 여기서 직접 확인하세요. 여기에도 없는 세부는 추측하지 말고 사용자에게 확인하세요.

## 아키텍처

- 기술 스택: Vite + React 19 + TypeScript. `react-router-dom`(`BrowserRouter`)으로 로그인 후 5개 화면(`/dashboard` `/assets` `/stocks` `/ledger` `/settings`)을 URL에 연결하고, 그 외 경로는 `/dashboard`로 리다이렉트합니다. 화면 내 탭(가계부 개요/내역, 주식 전체/국내/해외)과 모달은 주소와 무관하게 `AppState`로만 관리합니다. CSS 프레임워크 없음. 테스트 러너 없음.
- 상태는 세 레이어입니다: 앱 자체 reducer/context(`AppState`) + React Query(서버 상태) + Zustand(`src/stores/auth.ts` — 액세스 토큰과 인증 상태, 이것 하나뿐). 기기별 설정 일부는 localStorage에 둡니다. 경계는 `docs/state-management.md`.
- **데이터는 모두 서버에서 옵니다**(목업 화면 없음). axios + React Query 기반 API 레이어가 `src/services/{domain}/`에 있습니다: `auth` `user` `institution` `account` `asset` `category` `transaction` `subscription` `stock` `trade` `exchange` `marketIndex` `goal` `dashboard` `notification` `export` `import` `connection`.
- **엑셀 가져오기·내보내기**(`import`/`export`)는 거래 내역과 계좌 목록을 다룹니다(내보내기는 매매 내역도). 가져오기는 **한 행이라도 틀리면 전부 등록하지 않는(전체 롤백)** 계약이라 결과 화면도 "N건 등록" 아니면 "틀린 행 목록" 둘 중 하나입니다. 거래·매매 내보내기는 기간(`from`/`to`)을 고르고, 계좌 내보내기는 기간이 없습니다. 계약은 `docs/excel-import.md`.
- **API 키 연동**(`connection`, BYOK)은 사용자가 기관에서 발급받은 키를 등록하면 서버가 그 키로 기관 API를 대신 호출하는 구조입니다.
  - **첫 동기화가 계좌를 자동 생성**하므로 등록 진입점은 계좌 추가 모달 안(자산 유형이 주식·가상자산일 때만 뜨는 점선 배너 → `ConnectAccountView`)이고, 목록·재동기화·해제는 설정 → 데이터 관리 및 백업(`ConnectionsSection`)에 있습니다.
  - 지원 기관은 `UPBIT`·`TOSS_INVEST`·`KB_SECURITIES`·`KIWOOM` 4종이고 표기 규칙은 `src/data/connectionView.ts`가 정본입니다. **KB증권은 백엔드 동기화가 아직 없어 '준비 중'으로 비활성**(`PROVIDER_META.supported`)입니다.
  - **앱 시크릿은 응답에 내려오지 않아 수정 API가 없습니다**(바꾸려면 해제 후 재등록).
  - 에러는 `CONNECTION_*` 코드 5종을 `describeConnectionError`가 문구로 바꿉니다. 기관별 발급 절차는 가이드 페이지(`CONNECTION_GUIDE_URL`)에 있습니다.
- **월간 리포트**(`GET /dashboard/reports`)는 `src/screens/Assets/modals/ReportOverlay.tsx`가 **9:16 스토리 카드 5장**(총자산 변화 → 자산 하이라이트 → 소비 → 전월·전년 비교 → 요약 카드)으로 그리고, 뷰모델은 `src/data/reportView.ts`입니다. **문서형 한 장 레이아웃으로 바꾸지 마세요**(사용자가 원본 시안 느낌을 원해 되돌린 적 있음).
  - 첫 장 제목 옆 화살표로 지난 정산월을 넘겨봅니다.
  - 마지막 장의 '이미지로 저장'·'공유하기'는 지금 보이는 장을 **1080×1920 PNG**로 굽습니다(`src/utils/reportExport.ts`, html-to-image 지연 로드). 폰트는 **브라우저가 이미 내려받은 조각만** 넣습니다 — 전부 넣으면 수십 초 멈춥니다. 공유는 Web Share API이고, 미지원 브라우저는 다운로드로 대신합니다.
  - **저장 규격은 스토리 하나뿐입니다.** 피드 비율(1080×1350)은 별도 레이아웃이 필요해 만들지 않았으니, 필요해지면 먼저 사용자에게 확인하세요.
  - **서버 비율 필드는 모수가 0이면 `null`**이라 화면은 '—'로 두고 0으로 바꾸지 않습니다. 반올림으로 0%지만 금액이 움직였으면 '1% 미만'으로 적습니다. 요약 카드 제목은 서버가 유형 라벨을 주지 않아 실제 숫자로 만든 문장입니다.
- **대시보드는 카드 배치가 3종(A 기본 · B 추이 캔버스 · C 이번 달 흐름)입니다.** 설정 → 일반의 "대시보드 레이아웃"에서 고르고, 값은 이 기기 `localStorage`(`monit.dashboardLayout`, `src/utils/dashboardLayout.ts`)에만 저장됩니다 — 서버 설정에 필드가 생기면 테마처럼 "서버 정본 + 캐시"로 바꿉니다.
  - 구조: `src/screens/Dashboard/`의 `cards/*`(카드 하나가 한 파일, **자기 데이터 훅을 직접 부른다**) · `hooks/*`(카드끼리 공유하는 계산) · `layouts/DashboardLayout{A,B,C}.tsx`(배치만) · `Dashboard.tsx`(스위치). 이 규칙을 지키면 카드를 어느 레이아웃에서든 재사용할 수 있습니다.
  - C안의 가계부 카드(수입·지출·저축, 월별 저축률, 지출 순위, 고정 지출)는 **가계부 화면과 같은 색·규격**을 씁니다(월별 저축률 막대는 공용 `SavingsBarChart`).
  - 뷰모델 변환은 `src/data/dashboardView.ts`. 디자인 시안은 claude.ai 캔버스 "Monit 대시보드 레이아웃".
- **알림**은 SSE(`GET /notifications/stream`, 브라우저 `EventSource`가 헤더를 못 실어 `POST /notifications/stream/tickets`로 1회용 티켓을 받아 쿼리로 붙임)로 받고, 목록은 커서 페이지네이션(최신순 20건 + '더 보기')입니다. 알림 패널은 `NotificationPanel.tsx`.
- 진입점: `src/main.tsx`가 `BrowserRouter` → `QueryClientProvider` → `AppStateProvider`로 감싼 `App`을 `#root`에 마운트합니다. `src/index.css`는 `fonts.css` → `tokens.css` → `bank-tokens.css` → `base.css` 순으로 import합니다. `App.tsx`는 테마를 적용(`useApplyTheme`)하고 `AppShell`을 렌더링합니다. 화면 전환은 `AuthenticatedApp.tsx`의 `<Routes>`가 담당합니다(경로 목록은 `navItems.ts`의 `NAV_ITEMS`를 사이드바/하단탭과 공유).
- `tsconfig.json`은 project references 구조입니다(`src/`는 `tsconfig.app.json`, Vite 설정은 `tsconfig.node.json`). 전체 빌드는 항상 `tsc -b`로 실행하세요.

### 폴더 구조

```
src/
  state/                 앱 전역 상태(AppState)
    types.ts               AppState 형태 + union 타입(EntryType 등)
    initialState.ts        AppState 기본값
    actions.ts             PATCH(부분 병합) / PATCH_FN(이전 상태를 받는 갱신 함수)
    reducer.ts             단순 병합 리듀서
    AppStateContext.tsx    Provider + useAppState()
    selectors/             기능별 순수 헬퍼(auth, datePicker, dropdown, entryDraft, modal, nav,
                           tabStyles, stockTabStyles) — 메모이즈하지 않는 가벼운 함수
  services/              API 통신 레이어. api.ts(axios + ApiError + unwrap), apiBlob.ts(엑셀 등
                         파일 업·다운로드 — downloadBlobFile), api.types.ts, common.type.ts(도메인 공용
                         enum), queryKeys.ts(queryKey 레지스트리), queryClient.ts,
                         {domain}/{domain}.service|hook|type.ts
  stores/                Zustand. auth.ts(액세스 토큰 — 메모리 전용) 하나뿐
  data/                  서버 응답 → 화면용 뷰모델 변환(순수 함수): accountView, assetsView,
                         connectionView, dashboardView, ledgerView, notificationView, reportView,
                         stocksView. 자산군 아이콘·색 같은 뷰 상수도 여기 둔다.
                         termsContent.ts — 회원가입 동의서 3종 문안 + TERMS_VERSION. 문안을 고치면
                         버전도 같이 올린다. 운영 주체는 "운영자"(회사 아님)
  design/                bank-institutions.ts(125개 기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘 경로 25종) — BankIcon에 사용
  components/
    primitives/            원자 단위 UI(Avatar, BankIcon, Card, DatePicker, DeepCard, DonutChart,
                           Dropdown, Icon, Modal, SavingsBarChart, SegmentedTab, Skeleton, StatBadge,
                           Switch, Treemap) + usePopoverAnchor.ts(드롭다운/달력 팝오버를 모달 밖으로
                           띄우는 공용 훅)
    layout/                AppShell, AuthenticatedApp(<Routes>), Header, NotificationPanel, SidebarNav,
                           BottomTabNav(모바일), navItems.ts, BootScreen, ChunkErrorBoundary,
                           ModalErrorBoundary, MonitLogo, useSyncUserTheme.ts,
                           modals/(AccountModal — 전역 계정 오버레이, TermsDetailOverlay — 약관 전문.
                           가입 1단계·로그인 푸터·설정 하단이 공유)
  screens/               화면별 폴더: Auth, Dashboard, Assets, Stocks, Ledger, Settings
                         Dashboard는 cards/ · hooks/ · layouts/로 나뉜다
  styles/                fonts.css(웹폰트), tokens.css(디자인 토큰, 라이트/다크),
                         bank-tokens.css(기관별 색상), base.css(리셋 + 지정된 hover/media 클래스만)
  utils/                 format.ts(formatNumber, formatKrw, formatUsd, formatCurrencyAmount,
                         formatKoreanUnits, 금액 입력 상한 MAX_KRW_AMOUNT/MAX_USD_AMOUNT),
                         deltaBadge.ts, theme.ts(useApplyTheme), dashboardLayout.ts, date.ts,
                         download.ts, reportExport.ts, useCurrentSettlementMonth.ts,
                         useMediaQuery.ts(useIsMobile), useDebouncedValue.ts, notificationTime.ts,
                         ledgerLastAccounts.ts(가계부 입력 폼의 거래유형별 마지막 사용 계좌 — localStorage 힌트)
```

- 화면 컴포넌트는 `useAppState()`와 `@/services/{domain}`의 훅을 직접 호출합니다 — container/presenter 분리나 prop drilling이 없습니다.
- `BankIcon`은 기관의 `tokenKey`로 `bank-institutions.ts`에서 `archetype`을 조회한 뒤, 그 SVG 경로(`bank-archetypes.ts`)를 `--bank-{tokenKey}-bg/-fg` 색상으로 렌더링합니다.

## 빌드 & 테스트

```bash
pnpm install       # 의존성 설치
pnpm dev           # HMR 지원 Vite 개발 서버 실행
pnpm build         # tsc -b (project references) + vite build
pnpm lint          # oxlint (.oxlintrc.json — react/typescript/oxc 플러그인만 사용)
pnpm preview       # 프로덕션 빌드 미리보기
```

**개발 서버는 기본으로 로컬 백엔드(`http://localhost:8080` → 로컬 도커 DB)에 붙습니다.** `VITE_API_BASE_URL`이 비어 있으면 `vite.config.ts`의 프록시가 `/api` 요청을 `VITE_DEV_PROXY_TARGET`(기본 `http://localhost:8080`)으로 보냅니다(같은 출처라 CORS·쿠키 설정 없이 로그인 유지가 됩니다). 운영 API로 봐야 할 때만 `.env.local`(gitignore됨)에 `VITE_DEV_PROXY_TARGET=https://api.monit.io.kr`을 넣으세요 — **그때는 등록·삭제가 운영 DB를 실제로 바꾸니** 테스트 계정으로 쓰세요. 개발 중에는 `VITE_API_BASE_URL`에 절대 URL을 넣지 마세요(프록시를 건너뜀). `.env.development` 같은 커밋되는 env 파일은 만들지 않습니다. 자세한 건 `docs/api-conventions.md`.

테스트 러너가 없으므로, 빌드(`pnpm build`)와 린트(`pnpm lint`)가 깨끗하고 실행 중인 개발 서버(`pnpm dev`)에서 직접 확인했을 때만 변경이 "완료"된 것으로 취급하세요 — 코드를 정적으로 읽은 것만으로 UI가 동작한다고 단정하지 마세요.

## 도메인 컨텍스트

- 앱: Monit(모닛), 개인 자산관리 앱. 5개 화면: 대시보드(`/dashboard`) / 자산(`/assets`) / 주식(`/stocks`) / 가계부(`/ledger`) / 설정(`/settings`).
- **가계부 거래유형**(`EntryType`): `income`(수입, 초록 — `--inc-*`), `expense`(지출, 빨강/살몬 — `--exp-*`), `saving`(저축, 보라 — `--sav-*`), `transfer`(이체, 전용 색상 없음, `--text-strong`). 거래 내역 목록에서는 수입에 `+`, 지출에 `−`, 저축/이체는 부호 없음(`buildLedgerTransactions`). 히어로/딥카드의 증감 배지는 항상 부호를 표시합니다.
  서버 `TransactionType`은 이 4종(`INCOME`/`EXPENSE`/`SAVING`/`TRANSFER`)에 더해 **서버가 만드는 `ADJUSTMENT`(초기 잔액 등 조정)·`EXCHANGE`(환전)**가 있습니다. 사용자가 만들거나 검색 조건으로 쓰는 건 앞의 4종뿐(`EditableTransactionType`)이고, `ADJUSTMENT`는 가계부 목록·수지 집계에 나오지 않고 잔액·총자산에만 반영됩니다.
- **가계부 카테고리는 서버 리소스**입니다(`GET /categories`). 수입/저축/지출 3개 구분(`CategoryKind`) 아래 대분류, 그 아래 소분류가 붙습니다. **대분류는 서버 시드 고정이라 소분류만 추가·삭제할 수 있습니다.** 입력 폼은 배열 인덱스가 아니라 **`subcategoryId`(서버 id)** 로 선택을 추적합니다.
  거래 등록 시 타입별 필드 규칙을 어기면 400입니다: **수입/지출**은 `subcategoryId` 필수 + `transferAccountId` 금지, **이체**는 그 반대, **저축은 둘 다 필수**입니다(상대 계좌가 없으면 출금만 잡혀 총자산이 줄어듦 — 저축은 총자산은 그대로 두고 구성만 바꿉니다).
  고정 지출·구독 합계는 이번 정산월 항목만 세고, 다음 달 시작분은 '예정'으로 따로 표기합니다.
- **자산 분류**: 서버 자산군은 현금 / 예적금 / 주식 / 가상자산 / 연금·기타 **5종**입니다. 주식은 `STOCK` 하나이고(증권계좌 하나가 원화·달러 예수금과 국내·해외 종목을 함께 담음) **국내/해외 주식을 계좌 유형으로 다시 가르지 마세요.**
  **계좌 유형(`AccountType`)과 자산군(`AssetClass`)은 5종끼리 1:1 대응**하며 이름만 `ETC` ↔ `PENSION_ETC`로 다릅니다. 매핑은 `src/data/assetsView.ts`의 `ASSET_CLASS_ACCOUNT_TYPE_PRESET`/`assetClassOfAccountType`이 정본입니다.
  자산 구성의 비중·지난달 대비 증감은 서버 값(`sharePercent`·`changeFromLastMonthKrw`)을 그대로 씁니다 — 프론트에서 다시 계산하지 마세요.
  **자산군별 추이 그래프는 화면에 없습니다.** `GET /dashboard/trend?type={AccountType}`은 남아 있고 `useGetDashboardTrend`의 `type` 옵션도 계약대로 두지만, 지금은 대시보드만 씁니다. **계좌 하나를 지정하는 파라미터는 없으므로** 계좌 상세에 "이 계좌의 추이"를 그리면 안 됩니다. 추이 그래프를 다시 넣자는 이야기가 나오면 먼저 사용자에게 확인하세요.
  **계좌 상세의 '최근 거래내역'은 `GET /transactions`(가계부)와 `GET /trades`(매매)를 날짜순으로 합친 목록입니다**(`buildAccountActivity`). 매매는 가계부 거래를 만들지 않아 중복되지 않고, `GET /trades`는 주식·가상자산 계좌에서만 호출합니다.
  자산 화면의 **'부동산' 칸은 서버 자산군이 아니라** `Assets.tsx`가 직접 그리는 "준비 중" 카드입니다(누르면 `RealEstateSoonModal`). **서버에 부동산 자산군이 생기기 전까지 `AssetClass` 유니언에 넣지 마세요.** 트리맵과 대시보드 도넛에는 나오지 않습니다.
  트리맵("맵") 뷰는 비중으로 3단계 렌더 티어를 나눕니다: `full`(15% 이상), `medium`(6% 이상), `icon`(그 미만). 5% 미만 항목은 `기타` 블록으로 합칩니다. 정렬은 자산군 기준 하나뿐입니다.
- **계좌 통화와 잔액**: **계좌에는 표시 통화(`currency`)가 없고, 한 계좌가 원화·달러 예수금을 동시에 가질 수 있습니다.** (예전 필드 `currency`·`initialBalanceKrw`·`initialBalanceUsd`·`cashKrw`·`cashUsd`·`cashUsdKrw`·`usdKrwRate`·`totalPrincipalKrw`는 사라졌으니 되살리지 마세요.)
  - 등록 시 잔액은 `initialBalances: [{ currency, amount }]`로 보냅니다 — KRW는 정수, USD는 소수 2자리, 금액 0인 줄은 싣지 않습니다. 같은 통화 중복은 400 `INITIAL_BALANCE_CURRENCY_DUPLICATE`, **주식·가상자산이 아닌 계좌의 두 통화는 400 `INITIAL_BALANCE_SINGLE_CURRENCY_ONLY`**입니다. 원화 줄은 `initialBalanceDate`(생략 시 등록일)의 조정 거래(ADJUSTMENT)로 남습니다.
  - **잔액은 통화별 목록 `balances`로 내려옵니다**: 줄마다 `{ currency, amount, amountKrw, exchangeRate }`, `balanceKrw`는 `amountKrw`의 합계입니다. **원화 환산은 서버의 `amountKrw`를 그대로 쓰세요** — 프론트가 환율을 곱하면 이중 환산·반올림 불일치가 납니다(`exchangeRate`는 표기용, 원화 줄은 `null`). 줄은 순서에 기대지 말고 `accountBalanceOf(account, currency)`로 꺼내세요.
  - **잔액 정정(`PATCH /accounts/{id}/balance`)은 통화별**입니다 — 본문 `{ balance, currency? }`(생략 시 KRW). USD 정정은 주식·가상자산 계좌만 됩니다. 계좌 수정 화면은 원화 칸(원화 줄 기준)과, 달러 줄이 있는 주식·가상자산 계좌의 달러 칸을 따로 두고 바뀐 통화만 원화 → 달러 순서로 정정합니다.
  - **`GET /accounts/{accountId}`만 응답이 한 겹 감싸져 있습니다**(`{ account, holdingValueKrw, totalValueKrw }`, `totalValueKrw = account.balanceKrw + holdingValueKrw`). 목록·생성·수정·잔액정정은 계좌를 그대로 돌려줍니다. 계좌 상세의 대표 금액은 **`totalValueKrw`**입니다 — `balanceKrw`만 쓰면 보유 종목 평가액이 빠집니다.
- **계좌 등록 시 보유 종목 동시 등록**: `POST /accounts`의 `holdings`(최대 100건, 항목마다 `stockId` + `quantity`(0 초과) + `price`(0 이상))로 계좌와 보유 종목을 한 요청에 만듭니다. 서버가 등록일(KST) 체결 **BUY 매매**로 기록합니다. **주식·가상자산 계좌에만 보낼 수 있고, 그 외는 400 `INVALID_ACCOUNT_TYPE`이며 계좌도 만들어지지 않습니다.** `price`는 **종목 표시 통화 기준**(해외 종목 달러, 국내·가상자산 원화)이라 단위가 계좌가 아니라 줄마다 갈립니다(`AccountHoldingsField`가 줄에 `market`을 붙임). 종목을 적고 '추가'를 누르지 않으면 저장을 막습니다.
- **매매**: 매매 등록의 `settleCash: true`는 매매 금액만큼 그 계좌 예수금도 함께 옮깁니다(매수 차감, 매도 입금, 종목 표시 통화 기준). **등록 전용**이라 수정(PUT)에는 없습니다. 매도 증권거래세는 `tax`입니다. PUT은 전체 교체라 수정 시 세금·환율·메모를 다시 실어야 합니다. 빠른 매매(`QuickStockModal`)에는 가상자산 탭이 있고, 매도 상한은 고른 계좌의 보유량입니다. 종목명·섹터는 `StockEditModal`(`PUT /stocks/{id}`, 섹터 목록 `GET /stocks/sectors`)로 고칩니다. 환전은 주식 계좌만 고를 수 있습니다.
- **자산 목표**: 목표 모달은 입력 중인 값으로 `GET /goals/preview`를 불러 저장 전에 미리 계산하고(디바운스), `DELETE /goals`로 삭제할 수 있습니다. 월평균 수입은 서버 `suggestedMonthlyIncome`(정산월 기준)입니다.
- **금융기관**: `src/design/bank-institutions.ts`는 9개 카테고리(`bank`/`securities`/`card`/`lifeInsurance`/`fireInsurance`/`savingsBank`/`crypto`/`fintech`/`pension`)의 국내 금융기관 125개 마스터 목록입니다. 각 기관은 `tokenKey`(`--bank-{tokenKey}-bg/-fg` 색상)와 `archetype`(공용 SVG 25종 중 하나)을 가집니다. KB·카카오 계열은 노란 브랜드 컬러 대비를 위해 stroke가 더 두껍습니다(1.8 대비 2.0 — `BANK_YELLOW_STROKE_EXCEPTIONS`).
- **포맷팅**: `formatNumber(n)`은 `n.toLocaleString('ko-KR')`이며 통화 기호가 없습니다 — `원`은 JSX에 리터럴로 붙입니다. 원화 정수는 `formatKrw(n)`(소수부 버림), 달러는 `formatUsd(n)`, 통화별 고정 자릿수는 `formatCurrencyAmount(n, currency)`입니다. "약 12억 8,450만 원" 같은 조/억/만 축약은 **`formatKoreanUnits(n)` 하나로 유지하세요**(화면마다 새로 만들면 표기가 갈라집니다). 금액 입력 상한은 `MAX_KRW_AMOUNT`(1조 원 미만)/`MAX_USD_AMOUNT`(10억 달러 미만)입니다.
- **데이터 흐름**: 화면은 `@/services/{domain}` 훅으로 서버 데이터를 읽고(React Query 캐시에 두며 AppState로 복사하지 않음), `src/data/*View.ts`가 화면용 형태로 바꿉니다. 인터랙션 상태(탭·모달·폼 입력)만 `useAppState()`로 읽고 씁니다.
- **"월"의 기준**: 이 앱의 이번 달은 달력 1일이 아니라 사용자 설정 `monthStartDay`(1~28) 기준 **정산월**입니다. 가계부·목표·대시보드 전역에 적용되며, API는 대부분 `year`/`month`를 받고 경계는 서버가 계산합니다. 정산월에 의존하는 쿼리는 queryKey에 `{ year, month }`를 반드시 포함하세요.
  **"이번 달"은 달력 연·월(`todayYearMonth`)이 아니라 `useCurrentSettlementMonth()`(서버 `GET /users/me/settlements/current` 정본)로 잡으세요** — 월 시작일이 오늘 이후면 정산월은 한 달 앞이라, 달력 월을 보내면 아직 오지 않은 기간을 조회해 화면이 빕니다. 임의 날짜의 정산월·경계는 `settlementMonthOf`/`settlementPeriodOf`(`src/utils/date.ts`, 시작일이 속한 달로 라벨링). 가계부 내역 달력은 정산월 첫날~마지막 날로 그립니다. 총자산 추이와 결제 예정일은 날짜 기준이라 달력 그대로입니다.
- **서버 응답에 없는 값은 화면에 그리지 않습니다.** 주식 현재가, 원금처럼 API가 주지 않는 값은 하드코딩·추정으로 채우지 말고 비워 두고, 사용자에게 알려 백엔드 요청 항목으로 남기세요.
- **인증**: 백엔드가 JWT 인증을 요구합니다. `AppShell`은 `useAuthStore().status`가 `'authenticated'`면 `AuthenticatedApp`(모든 화면·모달 — 모달은 라우트와 무관하게 항상 마운트)을, `'anonymous'`이거나 `'unknown'`인데 이 브라우저에서 로그인한 적이 없으면(`hasSeenSession()`) `src/screens/Auth/Auth.tsx`(로그인/회원가입/비밀번호 찾기)를, 재방문자의 `'unknown'`이면 `BootScreen`을 그립니다.
  **회원가입은 4단계입니다**: 약관 동의 → 정보 입력 → 이메일 인증 → 온보딩(프로필 확인). `usePostSignup`은 토큰만 보유하고 `signIn`하지 않으며, 온보딩의 "모닛 시작하기"에서 `useCompleteSignupOnboarding()`이 `authenticated`로 전환합니다. 이 단계에서 새로고침하면 refresh 쿠키로 자동 로그인되어 온보딩은 건너뜁니다(의도된 동작). 경계는 `docs/state-management.md`, 인터셉터는 `docs/api-conventions.md`.
- **프로필**: 단일 사용자 UI입니다(가족 연동 등은 "준비 중"). 이름·이메일은 `GET /users/me`(`src/services/user`)에서 오고, `useProfileName()`은 로딩·실패 시 빈 문자열을 돌려줍니다 — **하드코딩 폴백 이름을 두지 않습니다**(다른 사람 이름이 잠깐이라도 보이지 않도록). 이름이 비면 `Avatar`가 person 아이콘을 그립니다.

## 디자인 시스템

색상, 타이포그래피, radius, shadow, 다크모드, 카피 컨벤션은 모두 `secret/ds_rules_v3.md`가 기준입니다(원본 프로토타입은 `secret/Asset Manager v14.dc.html`). **이 파일들의 내용을 CLAUDE.md나 다른 저장소 내 파일에 옮겨 적지 마세요** — 경로와 절 번호로만 참조하고, 결정은 공개된 `src/styles/tokens.css`, `bank-tokens.css`와 위 규칙을 근거로 삼되, 그것만으로 확신이 안 서면 사용자에게 확인하세요.
