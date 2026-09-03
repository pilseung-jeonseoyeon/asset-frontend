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

`src/components/primitives/Modal/Modal.tsx` 한 곳만 바꾸면 이를 쓰는 18개 모달에 모두 적용된다.
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
| 닫기 제스처 | 아래로 스와이프(2026-08-28 추가). 임계값 `min(96px, 패널 높이 × 0.28)` |

- 호출부가 넘기는 `zIndex`는 그대로 유지한다(§7-1 중첩 모달 규칙이 이미 값을 정해둠).
- 호출부의 `width`는 모바일에서 무시된다.
- **모달은 스크림(배경)을 누르면 닫힌다**(2026-08-29 사용자 요청 — 2026-08-19에 "입력이 날아간다"는
  이유로 막아뒀던 것을 되돌렸다). 닫는 방법은 배경 누르기, 아래로 스와이프, Esc 키(`Modal`이 직접
  처리, 중첩 시 맨 위 하나만 반응), 호출부가 그리는 X/취소 버튼이다. 그래도 **모든 모달은 눈에 보이는
  닫기 버튼을 반드시 가져야 한다**(배경 누르기·스와이프는 보조 수단이다).
  - `click`이 아니라 `pointerdown`으로 받고 **누른 지점이 스크림 자신일 때만** 닫는다. 패널 안에서
    글자를 드래그 선택하다 바깥에서 손을 떼면 `click`의 대상이 스크림이 되어 의도치 않게 닫히기
    때문이다. 드롭다운·달력이 열려 있으면 그 투명 캐처(z-index 94)가 대상이 되므로 팝오버만 닫히고
    모달은 남는다 — Esc와 같은 층위다.
  - **입력이 날아가는 문제는 "초안 보관"으로 막는다.** 가계부 거래 입력 모달은 저장하지 않고 닫으면
    적던 내용을 `AppState.entryDraft`에 담았다가 같은 거래유형으로 다시 열 때 되살린다
    (`src/state/selectors/entryDraft.ts`). **2026-08-29 기준 초안 보관이 있는 모달은 이 하나뿐**이고,
    계좌 등록·종목 추가 등 다른 폼 모달은 배경을 누르면 입력이 사라진다(사용자가 이 상태를 확인함).
    다른 모달에도 넣자는 이야기가 나오면 같은 방식을 따른다.
- **아래로 스와이프해서 닫기**(`Modal.tsx`의 `useSheetSwipeDown`, 2026-08-28 사용자 요청). 패널
  전체에서 받고(그래버 바 4px만 잡으라고 하면 너무 작다), 아래 조건에서는 가로채지 않는다:
  시트나 그 안의 스크롤 영역이 이미 스크롤돼 있을 때(`isScrolledDown` — 맨 위까지 올라와야 시작),
  드롭다운·달력 팝오버가 열려 있을 때(`state.openDropdown !== null` — 팝오버는 `position: fixed`
  여도 DOM상 패널의 자손이라 터치가 버블링된다), 가로 이동이 세로보다 클 때, 위로 끌 때.
  **끄는 동안에만 인라인 `transform`을 건다** — 상시로 걸면 그 패널이 `position: fixed` 자손의
  기준 상자가 되어 `usePopoverAnchor` 팝오버가 엉뚱한 자리에 붙는다.
  React의 `onTouchMove`는 루트에 passive로 붙어 `preventDefault`가 통하지 않으므로(배경 스크롤·
  당겨서 새로고침을 막아야 한다) 패널에 `{ passive: false }` 네이티브 리스너를 직접 붙인다.
  `ReportOverlay`·`AccountModal`은 공용 `Modal`을 쓰지 않아 이 제스처가 없다.
- **내부 팝오버(드롭다운·달력)는 `usePopoverAnchor`로 띄운다.** 시트는 세로 스크롤 때문에
  `overflow-y: auto`이고 데스크톱 모달도 대부분 `panelStyle`로 `overflow: auto`를 덮어써서,
  `position: absolute` 팝오버는 양쪽 모두에서 잘린다. `src/components/primitives/usePopoverAnchor.ts`가
  트리거의 화면 좌표를 재서 `position: fixed`로 띄우고 화면 가장자리를 벗어나지 않게 보정한다 —
  `Dropdown`/`DatePicker`가 이미 이 훅을 쓰므로 새 팝오버를 만들 때도 그대로 재사용한다.

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

## 7. 홈 화면에 추가(PWA)

사파리·크롬의 "홈 화면에 추가"로 설치하면 모닛 로고 아이콘이 생기고, 눌렀을 때 **주소창 없는
전체화면(standalone)** 으로 열린다(2026-09-03 사용자 결정).

- 파일: `index.html`의 `apple-touch-icon`·`manifest`·`*-web-app-capable`·`theme-color` 태그,
  `public/manifest.webmanifest`, 아이콘 PNG `public/pwa/`(180·192·512). PNG 원본과 다시 뽑는
  명령은 `scripts/app-icon/index.html` 상단 주석. 로고를 바꾸면 파비콘·`MonitLogo.tsx`·
  og-image·app-icon 네 곳을 같이 고친다.
- 새 정적 파일을 `public/`에 추가하면 `vercel.json` rewrite 예외에도 넣어야 한다 — 빠지면
  `index.html`로 덮여 HTML이 응답된다.
- 전체화면 모드는 사파리와 **쿠키·저장소가 분리**된다. 홈 화면에서 처음 열 때 로그인을 한 번
  다시 해야 하는 것은 버그가 아니다(refresh 쿠키가 없어서 `anonymous`로 시작).
- 상태바는 `apple-mobile-web-app-status-bar-style=default` — iOS가 그리고 웹뷰는 그 아래서
  시작하므로 상단 safe-area 패딩은 넣지 않는다. 하단은 `viewport-fit=cover` 덕에
  `env(safe-area-inset-bottom)`이 실제 값을 갖고, §2·§4의 하단탭·시트가 이미 그 값을 쓴다.
- `theme-color`(안드로이드 상태바 색)는 `src/utils/theme.ts`의 `applyTheme`이 테마에 맞춰
  `--canvas` 색으로 갈아끼운다.
- iOS는 홈 화면 아이콘을 캐시한다. 아이콘을 바꿔 배포하면 기존 아이콘을 지우고 다시 추가해야 한다.
- **시작 화면(스플래시)**: 전체화면 앱이 뜨기 전까지 iOS가 보여주는 이미지. `BootScreen`과 같은
  모양(`--canvas` 바탕 + 가운데 40px 로고)으로 기종별·라이트/다크별 PNG 24장을 미리 만들어
  `public/pwa/splash/`에 두고 `index.html`의 `apple-touch-startup-image` 태그 24개로 연결했다.
  원본은 `scripts/splash/index.html`, 전체 생성은 `scripts/splash/generate.sh`(dev 서버를 띄운
  채 실행) — 로고가 바뀌거나 새 기종을 추가할 땐 스크립트를 다시 돌려 태그 블록을 통째로
  갈아끼운다(손으로 한 장씩 고치지 말 것). 라이트/다크는 `prefers-color-scheme`(iOS 시스템
  설정)을 따르며, 이 시점엔 로그인 전이라 앱 내 테마 설정과 다를 수 있다.
