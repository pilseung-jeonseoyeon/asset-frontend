# 모바일 대응 규칙

디자인 시스템(`secret/ds_rules_v3.md`)에는 모바일·반응형 절이 없다. 그래서 모바일 규격은
**디자인 시스템이 이미 확정한 값(곡률 §5, 그림자 §6, 타이포 §4, 보더 §6-1) 안에서만** 파생시킨다.
아래에 없는 세부값이 필요하면 임의로 만들지 말고 사용자에게 확인한다.

## 1. 브레이크포인트

모바일 브레이크포인트는 하나다.

| 이름 | 조건 |
|---|---|
| 모바일 | `max-width: 767px` |
| 데스크톱 | 그 외 (`base.css`의 1380/1300/1000/900px 축소 규칙은 별도로 유지) |

- CSS: `@media (max-width:767px)`
- JS: `useIsMobile()` (`src/utils/useMediaQuery.ts`, `useSyncExternalStore` + `matchMedia('(max-width: 767px)')`).
  인라인 스타일 중심이라 미디어쿼리로는 못 바꾸는 곳이 많다.
  **구조가 달라지는 곳(내비 교체, 모달→시트, 위젯 교체)은 JS 훅으로 분기하고**, 단순 수치 조정은 CSS로 한다.

## 2. 레이아웃 셸 (`AuthenticatedApp.tsx`)

| 항목 | 데스크톱 | 모바일 |
|---|---|---|
| 좌측 `SidebarNav` | 렌더 | **렌더하지 않음** |
| 하단 `BottomTabNav` | 렌더하지 않음 | 렌더 |
| `main` padding | `30px 40px 56px` | `calc(18px + env(safe-area-inset-top)) 16px calc(92px + env(safe-area-inset-bottom))` |

- 하단 `92px = 탭바 60 + 아래로 띄운 12 + 숨통 20` — 떠 있는 탭바에 콘텐츠가 가리지 않게 한다.
- 상단 safe-area는 홈 화면 앱(§7)에서 헤더가 상태바와 겹치지 않게 한다. 일반 브라우저에서는 0이다.

## 3. 하단 탭바 (`BottomTabNav`)

화면 좌우·아래에서 띄운 알약 모양으로 콘텐츠 위에 떠 있다.

- `position: fixed; left/right: 12px; bottom: calc(env(safe-area-inset-bottom) + 12px); z-index: 50`
  → 헤더 드롭다운 스크림(55)·메뉴(60)·전역 스크림(70)·모달(80+)보다 항상 아래.
- 높이 `60px`, `background: var(--surface)`, `border: 0.5px solid var(--border)` (§6-1),
  `box-shadow: var(--shadow-pop)` (새 그림자 값을 만들지 않는다).
- 곡률 `999px`. **§5에 없는 값이라 하단 탭바에만 두는 예외다**(사용자 결정). 각지게 되돌리자는
  이야기가 나오면 먼저 확인한다. §5의 "메뉴(내비)바 10px"는 데스크톱 사이드바에 적용된다.
- `overflow: hidden` — 높이 100%를 채우는 항목이 알약 곡률 밖으로 삐져나오지 않게 한다.
- 항목 5개는 `navItems.ts`의 `NAV_ITEMS`를 `SidebarNav`와 공유하고, 각 항목은 `Link`(진짜 `<a>`)다.
  아이콘 `22px`, 라벨 `10.5px/600` `nowrap`(좁은 기기에서 두 줄로 꺾이지 않게).
- 활성 `var(--accent)` / 비활성 `var(--text-weak)`. 활성 표시는 색으로만 한다.
- 각 항목의 터치 영역은 최소 `44x44px`.
- 프로필 아바타(36px, `Avatar size="s"`, 계정 모달을 연다)는 모바일에서 헤더 우측에 둔다.

## 4. 모달 → 바텀시트

`src/components/primitives/Modal/Modal.tsx`가 모바일에서 바텀시트로 바뀌므로 공용 `Modal`을 쓰는
모달은 모두 자동 적용된다. `ReportOverlay`와 `AccountModal`은 공용 `Modal`을 쓰지 않아 각자 대응한다.

모바일일 때:

| 항목 | 값 |
|---|---|
| 스크림 정렬 | `align-items: flex-end`, padding 0 |
| 패널 너비 | `100%` |
| 패널 곡률 | `10px 10px 0 0` (§5 — 모달은 10px) |
| 패널 최대 높이 | `88vh`, 넘치면 세로 스크롤, `overscroll-behavior: contain` |
| 패널 padding | `0 18px calc(20px + env(safe-area-inset-bottom))` — 위 20px은 그래버 블록이 가진다 |
| 그림자 | `var(--shadow-modal)` (§6-2) |
| 상단 그래버 | `36x4px`, `radius 999px`, `var(--border)`, 중앙. `position: sticky` 블록(`20px 18px 14px`, 총 38px) 안에 있다 |
| 등장 | `.sheet-up`(base.css) — 아래에서 위로 `220ms cubic-bezier(.2,.7,.3,1)`. `prefers-reduced-motion` 시 비활성 |
| 닫기 제스처 | 아래로 스와이프. 임계값 `min(96px, 패널 높이 × 0.28)` |

- 호출부의 `zIndex`는 그대로 쓴다(§7-1 중첩 모달 규칙). 호출부의 `width`·`borderRadius`·`maxHeight`·
  `padding`은 모바일에서 덮어쓴다(데스크톱 padding이 safe-area 하단 여백을 지우지 않게).
- **헤더 고정**: 시트 헤더에는 `sheetStickyHeaderStyle(isMobile, gapBelow)`(`Modal/sheetHeader.ts`)를
  헤더 style **뒤에** 펼친다. 그래버 블록 아래(`top: 38px`)에 붙어, 목록을 내려도 제목과 X 버튼이 남는다.
  `ModalHeader`는 이미 적용돼 있다.
- **닫는 방법**: 배경 누르기, 아래로 스와이프, Esc(`Modal`이 처리, 중첩 시 맨 위 하나만), 호출부의
  X/취소 버튼. 배경·스와이프는 보조 수단이라 **모든 모달은 눈에 보이는 닫기 버튼을 가져야 한다.**
  - 배경 닫기는 `pointerdown`에서 "스크림 자신을 눌렀는지" 기억하고 `click`에서 닫는다. `pointerdown`에서
    바로 닫으면 손을 뗄 때 뒤에 드러난 헤더 버튼이 눌리고(고스트 클릭), `click`만 보면 패널 안에서 글자를
    드래그하다 바깥에서 떼도 닫힌다. 드롭다운·달력이 열려 있으면 투명 캐처(z-index 94)가 대상이 되어
    팝오버만 닫힌다(Esc도 같다).
  - 배경을 누르면 입력이 사라진다. **초안 보관은 가계부 거래 입력 모달만** 한다(`AppState.entryDraft`,
    `src/state/selectors/entryDraft.ts` — 같은 거래유형으로 다시 열면 복원). 다른 모달에 넣을 때도 같은 방식을 따른다.
- **아래로 스와이프**(`useSheetSwipeDown`): 패널 전체에서 받는다(4px 그래버만 잡게 하면 너무 작다).
  다음 경우엔 가로채지 않는다 — 터치 지점~패널 사이 영역이 이미 스크롤돼 있을 때(`isScrolledDown`),
  드롭다운·달력이 열려 있을 때(`state.openDropdown !== null`, 팝오버도 DOM상 패널 자손이라 터치가 버블링된다),
  가로 이동이 더 클 때, 위로 끌 때.
  - **끄는 동안에만 인라인 `transform`을 건다** — 상시로 걸면 패널이 `position: fixed` 자손의 기준 상자가
    되어 팝오버가 엉뚱한 자리에 붙는다.
  - React `onTouchMove`는 passive라 `preventDefault`가 안 되므로 패널에 `{ passive: false }` 네이티브
    리스너를 직접 붙인다.
- **내부 팝오버(드롭다운·달력)는 `usePopoverAnchor`로 띄운다.** 시트와 대부분의 데스크톱 모달이
  `overflow`로 잘라서 `position: absolute` 팝오버는 잘린다. `src/components/primitives/usePopoverAnchor.ts`가
  트리거 좌표로 `position: fixed` 위치를 잡고 화면 밖으로 나가지 않게 보정한다 — `Dropdown`/`DatePicker`가
  쓰고 있으니 새 팝오버도 재사용한다.
- `ReportOverlay`는 스와이프로 닫기가 없고, 대신 좌우 스와이프로 장을 넘긴다.

## 4-1. 예외: 계정 모달은 오른쪽 서랍

`AccountModal`(헤더 우측 아바타)만 바텀시트가 아니라 **오른쪽에서 밀려 나오는 서랍**이다 — 여는 버튼이
화면 우측 위에 있어서다.

| 항목 | 값 |
|---|---|
| 스크림 정렬 | `align-items: stretch`, `justify-content: flex-end`, padding 0 |
| 패널 폭 | `88%`, 최대 `420px` (왼쪽에 뒤 화면이 보여 눌러서 닫기 쉽다) |
| 패널 높이 | `100%` |
| 패널 곡률 | `10px 0 0 10px` (§5) |
| 패널 padding | `calc(20px + env(safe-area-inset-top)) 18px calc(20px + env(safe-area-inset-bottom))` |
| 등장 | `.sheet-right`(base.css) — `.sheet-up`과 같은 시간·이징, `prefers-reduced-motion` 시 비활성 |
| 그래버·스와이프 | 없음. 닫기는 X 버튼, 왼쪽 빈 곳 누르기(`Modal`과 같은 pointerdown+click 방식), Esc |

- **로그아웃·탈퇴는 서랍 맨 아래에 붙인다**(`marginTop: 'auto'`) — 되돌리기 어려운 동작을 일상 항목과
  떼어 둔다. 데스크톱 모달은 높이가 내용에 맞춰지므로 영향이 없다.
- **행 안에서 줄어드는 쪽은 왼쪽 텍스트다.** 오른쪽 배지·버튼에 `whiteSpace: 'nowrap'`·`flexShrink: 0`,
  왼쪽 텍스트에 `minWidth: 0`(`ROW_TEXT_STYLE`) — 안 그러면 "준비 중"이 두 줄로 쪼개진다.

## 4-2. 예외: 알림은 화면 전체 알림센터

헤더 벨의 알림은 모바일에서 **화면 전체 알림센터**, 데스크톱에서 벨 아래 팝오버다. 본문은
`NotificationPanel.tsx`가 `isMobile`로 분기한다.

| 항목 | 값 |
|---|---|
| 배치 | `position: fixed; inset: 0; z-index: 60` (하단탭 50 위, 모달 80+ 아래), `role="dialog"` |
| 배경 | `var(--canvas)` (카드가 아니라 화면) |
| padding | `calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom))` |
| 구조 | 세로 flex — 제목 줄 고정, 목록만 스크롤. 날짜 묶음 라벨은 sticky |
| 제목 줄 | 34px 뒤로가기 칩(`arrow_back`, `--track`) + "알림" 17px/700 + 오른쪽 "모두 읽음" |
| 닫기 | 뒤로가기 칩 — 화면 전체를 덮어 바깥 누르기가 없으므로 필수 |
| 빈 상태 | 세로 가운데 정렬 |

목록 규칙(데스크톱 팝오버도 같다):

- 안 읽은 알림: 행 배경 `var(--fill-subtle)` + 제목 700 + 아이콘 칩 오른쪽 위 `--accent` 점.
  읽은 알림: 배경 없음, 제목 500 `--text-mid`, 칩 `opacity 0.55`.
- 제목·본문은 각각 **2줄에서 자른다**(`clampLines`). 서버 문구에 길이 제한이 없어서다. 행을 누르면
  읽음 처리 + 그 자리에서 펼치고 접는다(다른 화면으로 이동하지 않는다).
- 행 hover 배경은 `@media (hover: hover)`에서만 준다(`.notif-row`).

## 5. 터치 환경

- **hover에서만 나타나는 UI는 터치 기기에서 영영 보이지 않는다.** `@media (hover: none)`에서 항상
  보이게 한다(`.row-actions`). 반대로 hover 효과는 필요하면 `@media (hover: hover)`로 가둔다.
- 모든 인터랙티브 요소의 터치 영역 최소 `44x44px`. 모양은 작게 두고 터치 영역만 키울 때는 모바일에서
  `min-width/height: 44px`를 주는 `.tap-44`(base.css)를 쓴다.

## 6. 화면별 그리드

`.rgrid-outer`(≤1300px)·`.rgrid-cards`(≤900px)·`.asset-2col`(≤1380px)은 이미 1열로 접혀 모바일에서도 1열이다.

- 1열이면 지나치게 길어지는 4열 그리드는 2열로 접는다 — 대시보드 "주요 자산 보관처"는 `.rgrid-institutions`
  (≤767px 2열), 주식 시장 지표 타일은 `.rgrid-indices`(≤900px 2열). **이 클래스들은 `.rgrid-cards`와
  같이 쓰지 않는다** — `.rgrid-cards`의 `!important` 1열 규칙과 충돌한다.
- 자산 구성 카드(`.aclass-card`)는 1열이 되는 ≤900px에서 가로 배치로 바뀐다(열 수 규칙과 같은 폭).
- 다단 그리드의 자식에는 `min-width: 0`을 준다(base.css) — 없으면 칸이 내용물 최소 폭만큼 늘어나 화면이
  가로로 밀린다.
- 가로로 넓은 표·리스트·트리맵은 잘라내지 말고 `overflow-x: auto` 래퍼로 감싼다(자산 화면 트리맵 참고).
- 구조를 바꾸는 모바일 분기 예: 주식 시장 지표는 타일 대신 한 줄 전광판(`MarketIndexTicker`), 대시보드
  B안은 카드 순서 변경.
- 금액은 글자 크기를 줄이기보다 줄바꿈·축약(`formatKoreanUnits`)을 우선한다.

## 7. 홈 화면에 추가(PWA)

"홈 화면에 추가"로 설치하면 주소창 없는 **전체화면(standalone)** 으로 열린다.

- 파일: `index.html`의 `apple-touch-icon`·`manifest`·`*-web-app-capable`·`theme-color` 태그,
  `public/manifest.webmanifest`, 아이콘 PNG `public/pwa/`(180·192·512). 아이콘 원본은 `scripts/app-icon/index.html`.
  로고를 바꾸면 파비콘·`MonitLogo.tsx`·og-image·app-icon·스플래시를 같이 고친다.
- `public/`에 새 정적 파일(경로)을 추가하면 `vercel.json` rewrite 예외에도 넣는다 — 빠지면 `index.html`이 응답된다.
- 전체화면 모드는 사파리와 **쿠키·저장소가 분리**된다. 처음 열 때 다시 로그인하는 것은 버그가 아니다.
- viewport는 `viewport-fit=cover`, 상태바는 `apple-mobile-web-app-status-bar-style=black-translucent`라
  콘텐츠가 상태바 뒤까지 깔린다. 그래서 화면 맨 위 요소는 `env(safe-area-inset-top)`을 더한다
  (`AuthenticatedApp` main, `Auth.tsx` main, 알림센터, 계정 서랍, `ReportOverlay` 상단 버튼).
  하단은 §2·§3·§4가 `env(safe-area-inset-bottom)`을 쓴다.
- iOS가 웹뷰를 상태바 아래부터 시작시키는 경우가 있어, `BootScreen`은 `navigator.standalone`일 때
  `(screen.height − innerHeight) / 2`만큼 로고를 올려 스플래시와 같은 화면 정중앙에 맞춘다.
- `theme-color`(안드로이드 상태바 색)는 `src/utils/theme.ts`가 테마에 맞춰 `--canvas` 색으로 바꾼다.
- iOS는 홈 화면 아이콘을 캐시한다. 아이콘을 바꾸면 지우고 다시 추가해야 보인다.
- **스플래시**: `BootScreen`과 같은 모양(`--canvas` 바탕 + 가운데 40px 로고)의 기종별·라이트/다크별 PNG 24장이
  `public/pwa/splash/`에 있고 `index.html`의 `apple-touch-startup-image` 태그 24개로 연결된다. 원본은
  `scripts/splash/index.html`, 생성은 `scripts/splash/generate.sh`(dev 서버를 띄운 채 실행, 태그 블록을
  출력한다) — 손으로 한 장씩 고치지 말고 스크립트로 통째로 갈아끼운다. 라이트/다크는 iOS 시스템
  설정을 따르므로 앱 내 테마와 다를 수 있다.
