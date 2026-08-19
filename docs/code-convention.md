# 코드 컨벤션

이 문서는 `asset-frontend`(Vite + React 19 SPA)의 코드 스타일 규칙입니다. API 통신 관련 세부
규칙(서비스 폴더 구조, `ApiResponse<T>` 등)은 [`api-conventions.md`](./api-conventions.md)에
있습니다.

## 명명 규칙

- 컴포넌트: `PascalCase` (`Button`, `DonutChart`, `LedgerEntryModal`)
- 훅: `useXxx` (`useAppState`, `useDropdown`, `useCloseModal`)
- 상태 필드 / 이벤트 핸들러: `camelCase`
- 상수: `UPPER_SNAKE_CASE` (예: `HOLDING_STOCKS`, `RECUR_FREQ_LABELS`, `WEEKDAY_HEADERS`)
- 도메인 전용 서비스 파일(`src/services/{domain}/`)은 `{domain}.service.ts`,
  `{domain}.hook.ts`, `{domain}.type.ts`처럼 단수형으로 씁니다. 여러 도메인이 공유하는 파일
  (`src/services/api.ts`, `src/services/api.types.ts` 등)은 도메인 접두어가 없는 공용 파일이라
  이 규칙 대상이 아닙니다 — `src/state/types.ts`도 같은 이유로 복수형입니다.

## import 순서

포맷터가 자동 정렬해주지 않으므로(현재 `oxlint`만 있고 Prettier 등 포맷터 없음) 아래 순서를
손으로 맞춥니다:

1. `react`에서 오는 타입 전용 import (`import type { FormEvent } from 'react'`)
2. 상대 경로 컴포넌트 import (가까운 계층부터: 같은 폴더 → `components/primitives` →
   `components/layout`)
3. `state/` (`useAppState`, `state/selectors/*`)
4. `utils/`
5. `data/` (`{screen}View.ts` — mock*.ts는 전부 삭제됐다)
6. `@/services/*` (API 레이어 — 상대 경로 계층 다음, 가장 마지막)

CSS는 컴포넌트 파일에서 개별 import하지 않습니다 — `src/index.css` 하나에서만 전역으로
불러옵니다(`fonts.css` → `tokens.css` → `bank-tokens.css` → `base.css`).

## 함수/컴포넌트 선언 스타일

컴포넌트와 export되는 유틸 함수는 모두 **함수 선언문**(`function`)으로 씁니다. `React.FC`도,
최상위 `const Foo = () => {}`도 쓰지 않습니다.

```tsx
// 컴포넌트
export function Button({ variant, className, style, children, ...rest }: ButtonProps) {
  /* ... */
}

// 유틸 함수
export function fmt(n: number): string {
  return n.toLocaleString('ko-KR')
}
```

컴포넌트 내부의 인라인 이벤트 핸들러(`onClick={() => ...}`)처럼 지역적인 콜백은 화살표 함수를
그대로 씁니다 — 이 규칙은 **export되는 최상위 선언**에만 적용됩니다.

## Props 타입 정의

Props는 `interface XxxProps`로 정의합니다.

```tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
}
```

`readonly`/`as const`는 강제하지 않습니다 — 불변성이 실제로 중요한 지점에서만 개별 판단으로
씁니다.

## 컴포넌트 개발

- **변형(variant) 처리** — variant를 리터럴 유니언 타입으로 선언하고, 클래스명을 문자열로 직접
  조합합니다(`Button.tsx` 참고):

  ```tsx
  type ButtonVariant = 'qbtn' | 'pill-btn'
  className={className ? `${variant} ${className}` : variant}
  ```

  padding/색상처럼 인스턴스별로 달라지는 값은 클래스가 아니라 호출부에서 `style` prop으로
  직접 전달합니다 — 공용 size/padding 스펙을 임의로 만들지 않습니다(`Button.tsx` 헤더 주석 참고).
- **반복 UI 분리** — 여러 화면이 공유하는 원자 컴포넌트는 `src/components/primitives/{Name}/`,
  레이아웃/전역 오버레이는 `src/components/layout/`에 둡니다. 특정 화면에서만 쓰는 모달 등은
  그 화면 폴더 하위(`src/screens/{Screen}/modals/`)에 둡니다.
- **폼** — 입력값은 `useAppState()`의 `state`/`setState`에 직접 바인딩합니다
  (`LedgerEntryModal.tsx`, `FixedExpenseModal.tsx` 참고). 별도 폼 라이브러리는 쓰지 않습니다.
- **레이아웃** — `src/styles/*.css`의 CSS 클래스와 디자인 토큰(`tokens.css`) 커스텀 프로퍼티를
  쓰고, 인스턴스별 값은 인라인 `style`로 전달합니다.

## 접근성

- 버튼/링크에 텍스트 레이블을 제공하고, 보조 설명이 필요하면 `aria-label`/`aria-describedby`를
  씁니다.
- 로딩 상태를 나타낼 때는 `aria-busy` 속성을 씁니다 — 예: `useUiStore().isLoading`을 컨테이너의
  `aria-busy`에 연결.
- 컬러는 CSS 변수(`tokens.css`)를 씁니다: `--accent`/`--accent-hover`,
  `--text-strong`/`--text-mid`/`--text-weak`, `--up`/`--down`, `--inc-*`/`--exp-*`/`--sav-*` 등.
- 모션 감소(`prefers-reduced-motion: reduce`) 대응은 `base.css`에 이미 있습니다 — 애니메이션이
  들어가는 요소를 새로 만들면 여기에 예외를 함께 추가하세요(바텀시트 등장, 스켈레톤 등).
- 키보드 포커스 링은 아직 없습니다(`base.css`에는 입력 요소의 `:focus` 테두리 색만 있음).
  새로 추가하려면 디자인 시스템(`secret/ds_rules_v2_5.md`) 기준 확인이 먼저 필요합니다 —
  필요하시면 알려주세요.
