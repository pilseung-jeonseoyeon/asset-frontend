# 모바일 대응 규칙

`secret/ds_rules_v2_5.md`에는 모바일·반응형 절이 없고, 프로토타입(`Asset Manager v14.dc.html`)에도
데스크톱 축소용 미디어쿼리 4개(`1380/1300/1000/900px`)뿐이다. 그래서 모바일 규격은 **디자인 시스템이
이미 확정한 값(곡률 §5, 그림자 §6, 타이포 §4, 보더 §6-1) 안에서만** 파생시킨다.
아래에 없는 세부값이 필요하면 임의로 만들지 말고 사용자에게 확인한다.

## 1. 브레이크포인트

단일 브레이크포인트만 쓴다.

| 이름 | 조건 |
|---|---|
| 모바일 | `max-width: 767px` |
| 데스크톱 | 그 외 (기존 1380/1300/1000/900px 축소 규칙은 그대로 유지) |

- CSS: `@media (max-width:767px)`
- JS: `useIsMobile()` (`src/utils/useMediaQuery.ts`) — `matchMedia('(max-width:767px)')`.
  이 저장소는 인라인 스타일 중심이라 미디어쿼리만으로는 레이아웃을 못 바꾸는 곳이 많다.
  **구조 자체가 달라지는 곳(내비 교체, 모달→시트)만 JS 훅으로 분기하고**, 단순 수치 조정은 CSS로 한다.

## 2. 레이아웃 셸

| 항목 | 데스크톱 | 모바일 |
|---|---|---|
| 좌측 `SidebarNav` | 렌더 | **렌더하지 않음** |
| 하단 `BottomTabNav` | 렌더하지 않음 | 렌더 |
| `main` padding | `30px 40px 56px` | `18px 16px calc(64px + env(safe-area-inset-bottom) + 20px)` |

하단 여백은 고정된 탭바에 콘텐츠가 가리지 않도록 탭바 높이만큼 확보한 값이다.

## 3. 하단 탭바 (`BottomTabNav`)

- `position: fixed; left/right/bottom: 0; z-index: 50`
  → 헤더 드롭다운 스크림(55)·메뉴(60)·전역 스크림(70)·모달(80+)보다 항상 아래.
- 높이 `64px` + `padding-bottom: env(safe-area-inset-bottom)` (아이폰 홈 인디케이터 영역)
- `background: var(--surface)`, `border-top: 0.5px solid var(--border)` (§6-1)
- 모서리 곡률 없음 — 화면 좌우 끝까지 붙는 바라 곡률 대상이 아니다.
  (§5의 "메뉴(내비)바 10px"는 카드 형태인 데스크톱 사이드바에 적용된다.)
- 항목 5개는 `SidebarNav`의 `NAV_ITEMS`를 그대로 재사용한다. 아이콘 `22px`, 라벨 `10.5px/600`.
- 활성 `var(--accent)` / 비활성 `var(--text-weak)`. 활성 표시는 색으로만 한다(1-8 데이터 색 금지와 무관).
- 각 항목의 터치 영역은 최소 `44x44px`.
- 데스크톱 사이드바 하단에 있던 **프로필 아바타는 모바일에서 헤더 우측으로 옮긴다**
  (36px, 기존 스타일 그대로, `modalAccount`를 연다).

## 4. 모달 → 바텀시트

`src/components/primitives/Modal/Modal.tsx` 한 곳만 바꾸면 이를 쓰는 16개 모달에 모두 적용된다.
`ReportOverlay`와 `AccountModal`은 공용 `Modal`을 쓰지 않으므로 각각 따로 대응한다.

모바일일 때:

| 항목 | 값 |
|---|---|
| 스크림 정렬 | `align-items: flex-end`, padding 0 |
| 패널 너비 | `100%` |
| 패널 곡률 | `10px 10px 0 0` (§5 — 모달은 10px, 새 값 만들지 않음) |
| 패널 최대 높이 | `88vh`, 넘치면 세로 스크롤 |
| 패널 padding | `20px 18px calc(20px + env(safe-area-inset-bottom))` |
| 그림자 | `var(--shadow-modal)` 유지 (§6-2) |
| 상단 그래버 | `36x4px`, `radius 999px`, `var(--border)`, 중앙 정렬 |
| 등장 | 아래에서 위로 `220ms cubic-bezier(.2,.7,.3,1)`. `prefers-reduced-motion` 시 비활성 |

- 호출부가 넘기는 `zIndex`는 그대로 유지한다(§7-1 중첩 모달 규칙이 이미 값을 정해둠).
- 호출부의 `width`는 모바일에서 무시된다.
- **주의:** 데스크톱 모달 다수가 `overflow: visible`이다 — 내부 `Dropdown`/`DatePicker` 메뉴가
  패널 밖으로 나가야 하기 때문이다. 시트는 세로 스크롤이 필요해 `overflow-y: auto`가 되는데,
  이때 내부 팝오버가 잘릴 수 있다. 드롭다운이 있는 모달은 반드시 실제 화면에서 확인한다.

## 5. 터치 환경

- `.row-actions`처럼 **hover에서만 나타나는 UI는 터치 기기에서 영영 보이지 않는다.**
  `@media (hover: none)`에서 항상 보이도록 한다.
- hover로만 뜨는 트리맵 툴팁 등도 같은 문제를 가진다 — 터치에서는 탭으로 열리게 하거나 항상 표시한다.
- 모든 인터랙티브 요소의 터치 영역 최소 `44x44px`.

## 6. 화면별 그리드

기존 `.rgrid-outer`(≤1300px)·`.rgrid-cards`(≤900px)·`.asset-2col`(≤1380px)은 이미 1열로 접히므로
모바일에서도 자동으로 1열이 된다. 추가로 필요한 것만 다룬다.

- 4열 그리드(대시보드 하단 카드)는 1열이면 지나치게 길어진다 → 모바일 **2열**.
- 가로로 넓은 표·리스트는 잘라내지 말고 `overflow-x: auto` 래퍼로 감싼다.
- 금액은 `--text-strong` 크기를 줄이기보다 줄바꿈·축약(§4-2)을 우선한다.
