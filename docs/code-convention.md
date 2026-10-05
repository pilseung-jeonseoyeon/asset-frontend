# 코드 컨벤션

이 문서는 `asset-frontend`(Vite + React 19 SPA)의 코드 스타일 규칙입니다. API 통신 관련 세부
규칙(서비스 폴더 구조, `ApiResponse<T>` 등)은 [`api-conventions.md`](./api-conventions.md)에
있습니다.

## 명명 규칙

- 컴포넌트: `PascalCase` (`Card`, `DonutChart`, `LedgerEntryModal`)
- 훅: `useXxx` (`useAppState`, `useDropdown`, `useCloseModal`)
- 상태 필드 / 이벤트 핸들러: `camelCase`
- 상수: `UPPER_SNAKE_CASE` (예: `NAV_ITEMS`, `ASSET_CLASS_META`, `WEEKDAY_HEADERS`, `MAX_KRW_AMOUNT`)
- 파일명:
  - 컴포넌트 파일은 컴포넌트 이름 그대로(`LedgerEntryModal.tsx`). 공용 원자 컴포넌트는
    `components/primitives/{Name}/{Name}.tsx`처럼 같은 이름의 폴더에 둡니다.
  - 훅 파일은 `useXxx.ts`(`useSyncUserTheme.ts`, `useResendCooldown.ts`), 그 외 `.ts`는
    `camelCase`(`format.ts`, `authFormStyles.ts`). 뷰모델은 `{screen}View.ts`.
  - 예외: `design/`의 `bank-institutions.ts`·`bank-archetypes.ts`, `styles/`의 CSS 파일은 kebab-case.
- 도메인 전용 서비스 파일(`src/services/{domain}/`)은 `{domain}.service.ts`,
  `{domain}.hook.ts`, `{domain}.type.ts`처럼 단수형으로 씁니다. 여러 도메인이 공유하는 파일
  (`api.ts`, `api.types.ts`, `apiBlob.ts` 등)은 도메인 접두어가 없는 공용 파일이라 이 규칙
  대상이 아닙니다 — `src/state/types.ts`도 같은 이유로 복수형입니다.
- **`getXxx`는 HTTP GET 서비스 함수 전용**입니다(`getAccounts`, `getTransactions`). 서버를 부르지 않는
  순수 조회 헬퍼는 `xxxOf`/`xxxFor`로 씁니다(`assetClassMetaOf`, `accountBalanceOf`, `providersFor`) —
  이름만 보고 네트워크 호출 여부를 구분하기 위해서입니다.
- localStorage 헬퍼는 `readXxx`/`storeXxx` 짝으로 씁니다(`readStoredTheme`/`storeTheme`,
  `readLastUsedAccounts`/`storeLastUsedAccounts`).
- **줄임말을 쓰지 않습니다.** 한 번 더 생각해야 읽히는 이름은 그대로 풀어 씁니다. 특히 아래는 되살리지
  마세요:
  `Tx`→`Transaction`(이 앱엔 `Transfer`도 있어 헷갈림), `Cat`→`Category` 또는 `AssetClass`, `Fx`→`ExchangeRate`/`ForeignCurrency`,
  `Avg`→`Average`, `Amt`→`Amount`, `Pct`→`Percent`, `Qty`→`Quantity`, `Fmt`→`Text`(포맷된 표시 문자열), `Btn`→`Button`,
  `inst`→`institution`, `idx`→`index`, `desc`→`description`, `sub`→`subcategory`/`subscription`, `dd`→`dropdown`.
  예외는 서버 응답 필드명(`avgCostPrice`, `weightedAvgRate`, `fxAutoRefresh`)과 한 줄짜리 콜백의 `e`/`(a, b)`/`prev`뿐입니다.
- **상태 필드는 값의 정체가 보이게** 짓습니다. 열린 모달 이름을 담으면 `openModal`(boolean처럼 읽히는 `modalOpen` 금지),
  수정 대상 서버 id를 담으면 `editingXxxId`, 상세 모달 대상 id는 `xxxDetailId`. 허용 값이 정해진 문자열은 `string`이 아니라
  리터럴 유니언 타입(`StockMarketTab`, `ConnectView`)으로 선언합니다.

## import 순서

포맷터가 없으므로(`oxlint`만 있음) 아래 순서를 손으로 맞춥니다:

1. `react` (값 import → `import type` 순)
2. 외부 라이브러리 (`react-router-dom` 등)
3. 상대 경로 컴포넌트 import (가까운 계층부터: 같은 폴더 → `components/primitives` →
   `components/layout`)
4. `state/` (`useAppState`, `state/selectors/*`)
5. `utils/`
6. `data/`
7. `@/services/*` (API 레이어 — 가장 마지막)

경로 표기: `services`와 `stores`는 `@/` 별칭(`@/services/{domain}`, `@/stores/auth`), 나머지는 상대
경로를 씁니다. 서비스는 도메인 폴더의 `index.ts`로만 가져오고(`@/services/account`) 내부 파일
(`account.hook.ts`)을 직접 가리키지 않습니다 — 공용 파일(`@/services/api`, `@/services/common.type`)은 예외.

타입은 `verbatimModuleSyntax`가 켜져 있어 반드시 `import type` 또는 인라인 `type` 수식어
(`import { useGetAccounts, type AccountResponse }`)로 가져옵니다.

CSS는 컴포넌트 파일에서 개별 import하지 않습니다 — `src/index.css` 하나에서만 전역으로
불러옵니다(`fonts.css` → `tokens.css` → `bank-tokens.css` → `base.css`).

## export & 선언 스타일

- **named export만 씁니다.** `export default`는 `App.tsx` 하나뿐입니다(lazy 청크도
  `.then((m) => ({ default: m.AuthenticatedApp }))`로 named export를 받습니다).
- 컴포넌트와 export되는 유틸 함수는 모두 **함수 선언문**(`function`)으로 씁니다. `React.FC`도,
  최상위 `const Foo = () => {}`도 쓰지 않습니다.

```tsx
// 컴포넌트
export function Card({ children, style, className, onClick, ...rest }: CardProps) {
  /* ... */
}

// 유틸 함수
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}
```

  인라인 이벤트 핸들러(`onClick={() => ...}`)처럼 지역적인 콜백은 화살표 함수를 그대로 씁니다 — 이
  규칙은 **export되는 최상위 선언**에만 적용됩니다.
- **`.tsx` 파일은 컴포넌트만 export합니다**(린트 `react/only-export-components`). 여러 파일이 쓰는
  스타일 상수·순수 함수는 옆의 `.ts`로 분리합니다(`Modal/sheetHeader.ts`,
  `Dashboard/cards/cardStyles.ts`, `Auth/authFormStyles.ts`). 상수 export는 린트가 허용하지만 이
  분리를 기본으로 합니다.

## Props 타입 정의

Props는 `interface XxxProps`로 정의합니다(`type` 별칭은 쓰지 않습니다).

```tsx
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  onClick?: () => void
}
```

`readonly`/`as const`는 강제하지 않습니다 — 불변성이 실제로 중요한 지점에서만 씁니다.

## 스타일링

- **스타일은 인라인 `style` 객체 + 디자인 토큰 변수(`var(--text-strong)` 등)**가 기본입니다. 여러
  번 쓰는 스타일은 `CSSProperties` 상수(`FIELD_BORDER_STYLE`, `CARD_TITLE_STYLE`)나 스타일 계산
  함수(`state/selectors/tabStyles.ts`)로 뽑습니다.
- CSS 클래스는 인라인으로 표현할 수 없는 것 — hover, 미디어쿼리, 애니메이션(`qbtn`, `mini-hov`,
  `rgrid-cards`, `sheet-up` 등) — 에만 쓰고, 모두 `base.css`에 둡니다.
- **변형(variant)** 은 리터럴 유니언 prop으로 받고, 값에 따라 스타일 계산 함수를 고릅니다
  (`SegmentedTab`의 `variant: 'default' | 'deep' | 'dashboard'`). padding/색상처럼 인스턴스별로
  달라지는 값은 호출부에서 `style` prop으로 넘깁니다 — 공용 size/padding 스펙을 임의로 만들지 않습니다.

## 컴포넌트 개발

- **반복 UI 분리** — 여러 화면이 공유하는 원자 컴포넌트는 `src/components/primitives/{Name}/`,
  레이아웃/전역 오버레이는 `src/components/layout/`에 둡니다. 특정 화면에서만 쓰는 모달은 그 화면
  폴더 하위(`src/screens/{Screen}/modals/`), 화면 전용 훅은 화면 폴더 안에 둡니다.
- **폼** — 입력값은 `useAppState()`의 `state`/`setState`에 바인딩합니다(`LedgerEntryModal.tsx`,
  `FixedExpenseModal.tsx` 참고). 검증 에러 플래그·삭제 확인창 같은 일시적 UI 상태와 비밀번호는 로컬
  `useState`에 둡니다. 별도 폼 라이브러리는 쓰지 않습니다.

## 접근성

- 버튼/링크에 텍스트 레이블을 제공하고, 아이콘만 있는 버튼에는 `aria-label`을 붙입니다.
- 로딩 상태는 `aria-busy`로 나타냅니다 — 예: 쿼리의 `isPending`을 컨테이너의 `aria-busy`에 연결.
- 컬러는 CSS 변수(`tokens.css`)를 씁니다: `--accent`/`--accent-hover`,
  `--text-strong`/`--text-mid`/`--text-weak`, `--up`/`--down`, `--inc-*`/`--exp-*`/`--sav-*` 등.
- 모션 감소(`prefers-reduced-motion: reduce`) 대응은 `base.css`에 있습니다 — 애니메이션이 들어가는
  요소를 새로 만들면 여기에 예외를 함께 추가하세요(바텀시트 등장, 스켈레톤 등).
- 키보드 포커스 링은 없습니다(`base.css`에는 입력 요소의 `:focus` 테두리 색만 있음). 새로 추가하려면
  디자인 시스템(`secret/ds_rules_v3.md`) 기준을 사용자에게 먼저 확인하세요.
