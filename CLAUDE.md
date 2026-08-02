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

## 관련 문서

아래 문서들이 이 저장소의 세부 규칙을 담고 있습니다. 관련 작업을 시작하기 전에 먼저 확인하세요.

- [`docs/architecture.md`](./docs/architecture.md) — 전체 폴더 구조, 레이어 간 규칙
- [`docs/state-management.md`](./docs/state-management.md) — AppState / Zustand / React Query 상태 경계
- [`docs/code-convention.md`](./docs/code-convention.md) — 명명 규칙, import 순서, 컴포넌트 작성 스타일
- [`docs/api-conventions.md`](./docs/api-conventions.md) — axios/React Query 기반 API 통신 규칙, 서비스 폴더 구조
- `secret/API-SPEC.md` — 실제 백엔드 API 스펙 (git에 커밋되지 않는 폴더 — 절대 규칙 1 참고)

## 아키텍처

- 기술 스택: Vite + React 19 + TypeScript. 라우터는 없고, `state.screen` 값에 따라 `AppShell`이 화면을 전환합니다. CSS 프레임워크 없음. 앱 자체 reducer/context 외의 상태관리 라이브러리 없음. 테스트 러너 아직 미구성. API/데이터 페칭 레이어 없음 — 모든 데이터는 로컬 목업입니다.
- 진입점: `src/main.tsx`가 `AppStateProvider`로 감싼 `App`을 `index.html`의 `#root`에 마운트합니다. `src/index.css`는 `tokens.css` → `bank-tokens.css` → `base.css` 순으로 import합니다. `App.tsx`는 현재 테마를 적용(`useApplyTheme`)한 뒤 `AppShell`을 렌더링합니다.
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
    selectors/                기능별 순수 헬퍼 함수(datePicker, dropdown, modal, nav,
                              segTab, stocks) — 메모이즈하지 않은 일반 함수. 소스가
                              렌더마다 재계산하는 방식을 그대로 따른 것
  data/                  화면별 mock*.ts — 그대로 옮긴 리터럴 데이터 + 소규모 순수
                         계산 함수(fmt, 페이지네이션, 증감 계산 등). 페칭/API 없음
  design/                bank-institutions.ts(125개 기관 마스터 테이블),
                         bank-archetypes.ts(공용 SVG 아이콘 경로 25종) — BankIcon에 사용
  components/
    primitives/            원자 단위 UI 컴포넌트(Card, Button, Icon, DonutChart, Treemap,
                           BankIcon, DatePicker, Modal, Dropdown, SegmentedTab, StatBadge,
                           DeepCard, Avatar)
    layout/                AppShell, Header, SidebarNav, layout/modals/(전역 오버레이 모달)
  screens/               최상위 화면별 폴더: Dashboard, Assets, Stocks, Ledger, Settings
  styles/                tokens.css(디자인 토큰, 라이트/다크), bank-tokens.css(기관별 색상),
                         base.css(리셋 + 지정된 hover/media 클래스만)
  utils/                 format.ts(fmt), deltaBadge.ts(mkDelta/hexToRgba),
                         theme.ts(useApplyTheme), date.ts
```

- 화면 컴포넌트는 `useAppState()`를 호출하고 자신에게 필요한 `mock*` 데이터를 직접 import하는 단순한 구조입니다 — container/presenter 분리나 `App`으로부터의 prop drilling이 없습니다.
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

- 앱: Monit(모닛), 개인 자산관리 앱. `state.screen`으로 전환되는 5개 화면: 대시보드(`dashboard`) / 자산(`asset`) / 주식(`stock`) / 가계부(`ledger`) / 설정(`settings`).
- **가계부 거래유형**(`EntryType`): `income`(수입, 초록 — `--inc-*`), `expense`(지출, 빨강/살몬 — `--exp-*`), `saving`(저축, 보라 — `--sav-*`), `transfer`(이체, 전용 색상 없음, `--text-strong`으로 렌더링). 거래 내역 목록에서는 수입에 `+`, 지출에 `−`, 저축/이체는 부호 없음(`src/data/mockLedger.ts`의 `computeLedgerTx` 참고). 단, 히어로/딥카드의 증감 배지는 항상 명시적으로 부호를 표시합니다.
- **가계부 카테고리는 사용자 커스터마이즈 가능**(`state.customCats`): 수입/저축/지출 3개 최상위 그룹이 각각 대/소분류 쌍(`CustomCatGroup`)을 가집니다. 입력 폼에서 현재 선택은 id가 아니라 **배열 인덱스**(`entryCatMajorIdx`/`entryCatSubIdx`)로 추적합니다.
- **자산 분류**: 현금 / 예적금 / 국내주식 / 해외주식 / 가상자산 / 연금·기타, 6개 고정 카테고리이며 각각 아이콘·금액·전체 대비 비중을 가집니다. 트리맵("맵") 뷰는 비중에 따라 3단계 렌더 티어로 분류합니다: `full`(15% 이상), `medium`(6% 이상), `icon`(그 미만). 5% 미만 항목은 합쳐서 `기타` 블록으로 만듭니다. `mapSort`(자연/기관별 정렬 토글)는 상태에는 존재하지만 소스에서도 어떤 UI에도 연결되지 않은 죽은 토글입니다 — 명시적 요청 없이 "완성"시키지 마세요.
- **금융기관**: `src/design/bank-institutions.ts`는 9개 카테고리(`bank`/`securities`/`card`/`lifeInsurance`/`fireInsurance`/`savingsBank`/`crypto`/`fintech`/`pension`)에 걸친 국내 금융기관 125개의 마스터 목록입니다. 각 기관은 `tokenKey`(해당 `--bank-{tokenKey}-bg/-fg` 색상을 결정)와 `archetype`(공용 SVG 아이콘 모양 25종 중 하나)을 가집니다. KB 계열과 카카오 계열은 노란색 브랜드 컬러의 대비 확보를 위해 아이콘 stroke가 더 두껍습니다(기본 1.8 대비 2.0) — `BANK_YELLOW_STROKE_EXCEPTIONS` 참고.
- **포맷팅**: `fmt(n)`은 `n.toLocaleString('ko-KR')`이며 통화 기호를 포함하지 않습니다 — `원`은 소스가 그렇게 하는 위치마다 JSX에 리터럴 문자열로 붙입니다(`fmt` 내부가 아님). "약 12억 8,450만 원" 같은 억/만 축약 표기는 목업 데이터마다 하드코딩된 리터럴 문자열이며 공용 계산 함수가 없습니다 — 일반화된 축약 헬퍼를 임의로 추가하지 마세요.
- **데이터 흐름**: 화면은 `src/data/mock*.ts`에서 리터럴/파생 값을 직접 import하고, 인터랙션 상태는 `useAppState()`로 읽고 씁니다. 어디에도 API 레이어, 비동기 페칭, 영속성이 없습니다 — 새로고침하면 항상 `initialState`로 돌아갑니다.
- **프로필**: 하드코딩된 단일 사용자, `profileName: '정다은'`. 인증도 다중 사용자 개념도 없습니다 — 원본 프로토타입의 인증 플로우는 이번 포팅 범위에서 명시적으로 제외되었습니다(`src/state/types.ts` 상단 주석 참고). 앱은 항상 "인증된" 상태로 시작합니다.

## 디자인 시스템

색상, 타이포그래피, radius, shadow, 다크모드, 카피 컨벤션은 모두 `secret/ds_rules_v2_5.md`가 기준입니다. 하지만 위 "절대 규칙"에서 언급했듯, **이 파일의 실제 내용을 CLAUDE.md나 다른 저장소 내 파일에 옮겨 적지 마세요** — 필요하면 파일 경로로만 참조하고, 세부 규칙이 필요한 결정을 내릴 때는 이미 공개된 `src/styles/tokens.css`, `bank-tokens.css`와 위에 명시된 규칙들을 근거로 삼되, 그것만으로 확신이 안 서는 부분은 추측하지 말고 사용자에게 확인하세요.
