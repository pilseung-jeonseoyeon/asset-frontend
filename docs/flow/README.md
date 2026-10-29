# 화면별 프론트 흐름 — 재산 · 주식 · 가계부 · 설정 · 대시보드

백엔드 흐름 문서(`asset/docs/flow/`)와 짝을 이루는 **프론트엔드 코드 기준** 흐름 문서다. 사용자가 누르는 버튼 하나가 화면 컴포넌트 → AppState → React Query 훅 → `api.ts` → 서버를 어떤 순서로 지나가고, 돌아온 응답이 어느 캐시를 흔들어 어느 화면이 다시 그려지는지를 적는다. 서버 안쪽(집계·잔액 재계산·배치)은 각 문서가 백엔드 문서의 해당 절로 링크한다.

| 화면 | 프론트 문서 | 기능별 시퀀스 | 백엔드 짝 |
|---|---|---|---|
| 재산 (자산 관리) | [flow-assets.html](flow-assets.html) | [FA0~FA10 · 11개](flow-assets.html#seq) (계좌 공유·API 키 연동 포함) | [A10](../../../asset/docs/flow/flow-assets.html) |
| 주식 | [flow-stocks.html](flow-stocks.html) | [FB0~FB9 · 10개](flow-stocks.html#seq) (매매·환전·시세 미확보 포함) | [B9](../../../asset/docs/flow/flow-stocks.html) |
| 가계부 | [flow-ledger.html](flow-ledger.html) | [FC0~FC10 · 11개](flow-ledger.html#seq) (정산월·초안·고정지출 포함) | [C11](../../../asset/docs/flow/flow-ledger.html) |
| 설정 · 인증 · 알림 | [flow-settings.html](flow-settings.html) | [FD0~FD12 · 13개](flow-settings.html#seq) (부팅·401 재발급·SSE 알림·공유 초대 포함) | [D8](../../../asset/docs/flow/flow-settings.html) |
| 대시보드 | [flow-dashboard.html](flow-dashboard.html) | [FE0~FE9 · 10개](flow-dashboard.html#seq) (목표·월간 리포트 포함) | [E8](../../../asset/docs/flow/flow-dashboard.html) |

각 HTML은 같은 아홉 절로 되어 있다.

| 절 | 내용 |
|---|---|
| F1 Layers | 이 화면을 이루는 파일(컴포넌트·뷰모델·훅)과 상태 세 층, 서버 엔드포인트를 한 그림으로 |
| F2 Element → Hook → API | 화면 요소마다 어떤 훅 → 어떤 API·queryKey → 어떤 뷰모델 함수를 거치는지 표 |
| F3 | 화면별 핵심 규칙 — 상태(대시보드·재산), 시세 미확보(주식), 정산월(가계부), 인증 스토어(설정) |
| F4 Journey | 사용자가 실제로 쓰는 순서를 화면 문구 그대로 |
| F5 Invalidation | 이 화면의 쓰기가 흔드는 캐시(무효화 목록) — 설정 문서는 알림 전달 규칙표가 F5, 무효화는 F6 |
| F6 Rules | 표기·분기 규칙(서버 값 그대로, null과 0 구분, 인라인 확인 등) |
| F7 Validation & Errors | 모달별 검증 조건 → 문구, 서버 에러 코드 → 어느 칸 아래에 무슨 말 (대시보드는 카드별 상태 분기·CTA 표) |
| F8 Pitfalls | 이 화면에서 실제로 틀렸거나 틀리기 쉬운 것 — 핸드북의 "함정"을 흐름 관점으로 다시 적음 |
| F9 Sequences | 기능별 mermaid 시퀀스 — 참여자는 사용자(U) → 화면/모달(V) → AppState(S) → React Query(Q) → api.ts(A) → 서버(API), 인증은 useAuthStore(Z) |

근거는 코드(`src/`)이고, 세부 설명은 `docs/monit-frontend-handbook.html`(18장)에서 가져왔다. 코드와 문서가 다르면 코드가 정본이다. "확인 필요"로 표시한 항목은 핸드북이 코드만으로 결론 내지 못한 것이다.

---

## 0. 모든 화면에 공통으로 깔린 규칙

### 0.1 레이어와 요청 1건의 경로

```
사용자 조작
  → 화면 컴포넌트 (src/screens/*, src/components/layout/*)
      · 인터랙션 상태만 useAppState()로 읽고 쓴다 (탭·모달 열림·폼 입력·달력 커서)
  → 도메인 훅 useGetXxx / usePostXxx (src/services/{domain}/{domain}.hook.ts)
      · queryKey는 src/services/queryKeys.ts 레지스트리에서만 만든다
  → 서비스 함수 (src/services/{domain}/{domain}.service.ts) → axios 인스턴스 api (src/services/api.ts)
      · 요청 인터셉터: PUBLIC_PATHS가 아니면 Authorization: Bearer {accessToken}(Zustand 메모리) 부착
      · 응답 인터셉터: 401이면 refreshAccessToken()(single-flight) 후 원 요청 1회 재시도, 그 외 실패는 ApiError(code, message, status)
  → 서버 /api/v1/... (개발 서버는 vite 프록시 → localhost:8080)
  → React Query 캐시 (staleTime 30초, 4xx 재시도 없음, 5xx·네트워크 1회)
  → 뷰모델 buildXxx (src/data/*View.ts — 순수 함수, 서버 값을 다시 계산하지 않음)
  → JSX + 디자인 토큰 var(--xxx)
```

- 서버 응답을 AppState나 Zustand로 복사하지 않는다. 화면은 훅으로 읽고 뷰모델로 바꿔 바로 그린다.
- 파일 업·다운로드만 별도 인스턴스 `apiBlob.ts`(60초, 같은 refresh 큐). 업로드는 공용 `api`로 `multipart/form-data`를 **반드시 명시**.
- 긴 요청의 timeout: 연동 동기화 30초, 엑셀 업로드 60초. 기본 10초.

### 0.2 상태 네 층과 localStorage 키

| 층 | 위치 | 담는 것 | 담지 않는 것 |
|---|---|---|---|
| AppState | `src/state/` — `useAppState()`, 액션은 `PATCH`(부분 객체) / `PATCH_FN`(이전 상태 → 부분 객체), 리듀서는 **얕은 병합** | 탭 선택, 모달·드롭다운 열림, 폼 입력, 달력 커서, 인증 폼의 이메일·이름·코드 | 서버 응답 복사본, 비밀번호, API 키, 토큰 |
| React Query | `src/services/{domain}/*.hook.ts`, `queryClient.ts` | 서버 데이터 캐시·로딩·에러 | 화면 조작 상태 |
| Zustand | `src/stores/auth.ts` (유일) | 액세스 토큰(메모리 전용), `status`(unknown / authenticated / anonymous), `manualAuthPending`, `authGeneration` | 그 외 전부 |
| localStorage | 키마다 담당 파일 하나, 전부 `monit.` 접두어 + try/catch | 서버 정본의 캐시(테마), 이 기기 전용 힌트 | 토큰·금액·이름 |

| 키 | 담당 파일 | 값 | 용도 |
|---|---|---|---|
| `monit.seenSession` | `stores/auth.ts` | `'1'` | 재방문자(BootScreen) vs 첫 방문자(바로 로그인 화면) 분기 |
| `monit.theme` | `utils/theme.ts` + `index.html` 인라인 스크립트 | light / dark / system | 서버 테마의 캐시, 첫 페인트 깜빡임 방지 |
| `monit.dashboardLayout` | `utils/dashboardLayout.ts` | A / B / C | 서버 필드가 없어 여기가 정본 |
| `monit.ledger.lastAccounts` | `utils/ledgerLastAccounts.ts` | 유형별 `{ accountId, withdrawAccountId }` | 가계부 입력 폼 계좌 폴백(AppState에 쓰지 않음) |
| `monit.notification.prefs` · `monit.notification.askDismissedAt` | `utils/notificationPrefs.ts` | 배너·맥 알림·내용 보이기 | 알림 받는 방식(이 기기) |

### 0.3 모달 규칙

- 모달 24개는 전부 `AuthenticatedApp.tsx`에 **항상 마운트**되어 있고, `state.openModal`(문자열 키 하나) 또는 전용 id 필드(`accountDetailId`, `assetClassDetail`, `reportOpen`, `sharedAccountDetailId` …)로 열린다. 라우트와 무관하다.
- 닫아도 언마운트되지 않으므로 모든 모달에 `resetAndClose`/`closeXxx`가 있어 로컬 state·뮤테이션 에러·날짜 선택 키를 직접 되돌린다. **새 입력칸을 추가하면 초기화 목록에도 추가한다.**
- 층: 1단계 80, 그 위에 겹치는 상세·추가·수정은 90. Esc는 `modalStack`에서 zIndex가 가장 큰 모달만 받고, 드롭다운·달력 팝오버(스크림 94)가 열려 있으면 그것부터 닫힌다.
- "되돌아갈 곳": `addAccountReturnTo` · `addGoalReturnTo` · `shareMembersReturnTo` · `entryReturnSharedAccountId` — 다른 모달에서 열린 모달이 닫히면 연 모달로 복귀한다.
- 되돌리기 어려운 동작(삭제·해지·종료·내보내기)은 `window.confirm`이 아니라 같은 자리의 인라인 확인 블록 + "~할게요" 버튼. 진행 중에는 다른 조작을 잠근다.
- 토스트 컴포넌트는 없다. 성공은 모달이 닫히거나 목록이 갱신되는 것으로 알린다.

### 0.4 정산월

- "이번 달"은 달력 1일이 아니라 사용자 설정 `monthStartDay`(1~28) 기준 정산월이고, 이름은 **시작일이 속한 달**이다(28일 시작이면 9/26은 "8월", 8/28~9/27).
- 정본은 `GET /users/me/settlements/current`를 감싼 `useCurrentSettlementMonth()`. 응답 전에는 `settlementMonthOf(오늘, monthStartDay)`로 같은 규칙을 계산해 채운다. `todayYearMonth()`(달력)를 API 파라미터로 쓰지 않는다.
- 정산월에 의존하는 쿼리는 queryKey에 `{ year, month }`를 넣는다. 월 시작일을 바꾸면 설정 쿼리를 뺀 **캐시 전체**가 무효화된다.
- 달력 기준인 것은 둘뿐: 총자산 추이(올해 1/1~오늘), 고정 지출 결제 예정일.

### 0.5 쓰기 한 번이 흔드는 캐시 (mutation → 무효화)

| mutation | 무효화하는 도메인 | 훅 파일 |
|---|---|---|
| 거래 등록·수정·삭제 | transaction · account · asset · dashboard · goal | `transaction.hook.ts` |
| 공유 계좌 거래 등록·수정·삭제 | share | `share.hook.ts` (소유자 가계부에 저장되므로 내 transaction은 그대로) |
| 계좌 등록·수정·해지 | account · asset · dashboard · institution · stock · trade · goal | `account.hook.ts` |
| 계좌 잔액 정정 | account · asset · dashboard · goal (조정 거래는 가계부에 안 나오므로 transaction 제외) | 같은 파일 |
| 매매 등록·일괄·수정·삭제 | trade · stock · account · asset · dashboard · goal | `trade.hook.ts` |
| 환전 등록·수정·삭제 | exchange · account · asset · stock · dashboard · goal | `exchange.hook.ts` |
| 종목 등록 / 종목 수정 | stock / stock · trade | `stock.hook.ts` |
| 목표 저장·삭제 | goal · dashboard | `goal.hook.ts` |
| 고정지출·구독 등록·수정·종료 | subscription만 (거래는 서버 배치가 결제일에 만든다) | `subscription.hook.ts` |
| 소분류 추가·삭제 | category · transaction | `category.hook.ts` |
| 엑셀 가져오기(importedCount > 0) | transaction · account · asset · dashboard · goal (+ 계좌면 institution) | `import.hook.ts` |
| 연동 등록·해제 / 재동기화 | connection / connection · account · asset · trade · stock · dashboard · goal · transaction | `connection.hook.ts` |
| 공유 초대·응답·권한·해제 | share · notification | `share.hook.ts` |
| 알림 읽음 · SSE 수신 · 재연결 | notification (· share) | `notification.hook.ts`, `useNotificationStream` |
| 내 정보·비밀번호 변경 | user.me | `user.hook.ts` |
| 사용자 설정 변경 | 낙관적 갱신 + 응답 setQueryData. monthStartDay가 바뀌면 설정 쿼리를 뺀 전체 | 같은 파일 |
| 로그인 · 온보딩 완료 · 로그아웃 · 탈퇴 성공 | `queryClient.clear()` | `auth.hook.ts`, `user.hook.ts` |

목록을 줄이면 화면 한쪽 숫자만 옛값으로 남는다(예: 거래를 적었는데 대시보드 총자산이 30초 뒤에야 바뀜). 새 mutation은 "서버가 이 변경으로 다시 계산하는 값을 어느 화면이 보여주는가"로 도메인을 고른다.

### 0.6 에러 표기 규칙

- 서버 실패는 전부 `ApiError(code, message, status)`. `message`는 완성된 한국어 문장이라 기본은 그대로 보여주고, UX를 바꿔야 할 때만 `code`로 분기한다. `INVALID_INPUT`은 `friendlyInvalidInputMessage`가 "○○ 입력을 다시 확인해주세요 — 길이나 형식이 맞지 않아요"로 바꾼다.
- 문구는 그 입력칸 바로 아래(제출 버튼 위)에 작은 빨간 글씨. 화면 상단·토스트로 올리지 않는다.
- 422 `FX_RATE_NOT_FOUND`(환율 미수집)는 서버 장애가 아니라 데이터 미준비 → 빨간 에러가 아니라 **회색 안내**(`isExchangeRateMissing`).
- 404 `ACCOUNT_NOT_FOUND` / `SUBCATEGORY_NOT_FOUND`는 그 목록을 refetch해 사라진 선택지를 치운다.
- 코드가 여러 화면에서 반복되면 변환 함수 하나(`describeConnectionError`, `describeShareError`)를 두고 화면은 결과만 그린다.
- 서버가 null로 준 값(시세 미확보, 모수 0인 비율, 스냅샷 없는 증감)은 0으로 바꾸지 않고 '—' 또는 안내 문구. 반올림으로 0%지만 금액이 움직였으면 "1% 미만".

### 0.7 라우팅·부팅·인증 게이트

- URL을 가진 화면은 5개뿐(`/dashboard /assets /stocks /ledger /settings`, `NAV_ITEMS`). 그 외 경로는 `/dashboard`. 탭·모달은 URL과 무관.
- 부팅: `index.html` 인라인 스크립트가 `monit.theme`로 다크 클래스 → `AppShell`의 `useRestoreSession`이 `POST /auth/refresh`(쿠키) + 3.5초 포기 타이머 → `status`에 따라 `Auth`(anonymous) / `BootScreen`(unknown + 재방문자) / lazy `AuthenticatedApp`(authenticated).
- 로그인·가입·로그아웃·401 재발급의 경쟁 방지 장치(`manualAuthPending`, `authGeneration`)는 설정 문서 F3·FD0·FD4.

---

## 1. 재산 (자산 관리) — [flow-assets.html](flow-assets.html)

한 화면(`Assets.tsx`)과 모달 12개. 자산 구성 카드 5칸(+ 부동산 준비 중) → 자산군 상세(계좌 목록) → 계좌 상세/수정/추가가 한 단씩 겹친다. 계좌 추가 모달 안에 보유 종목 담기(`AccountHoldingsField`)와 API 키 연동(`ConnectAccountView`)이 들어 있고, 계좌 공유(함께 보는 사람 · 공유받은 계좌 상세)도 여기 있다.

- 주요 파일: `Assets.tsx` · `AssetCategoryModal` · `AccountDetailModal` · `AddAccountModal` · `EditAccountModal` · `ShareMembersModal` · `SharedAccountDetailModal` · `data/assetsView.ts` · `data/shareView.ts` · `data/connectionView.ts`
- 기억할 것: 계좌 대표 금액은 `totalValueKrw`(예수금 + 보유 종목) · 달러 환산은 서버 `amountKrw` · 잔액 정정은 통화별로 원화 → 달러 순서 · 공유받은 계좌는 내 총자산에 더하지 않는다.

## 2. 주식 — [flow-stocks.html](flow-stocks.html)

보유 종목·청산 종목·매매 내역(최근 10건)·환전·시장 지표·섹터 비중. 숫자는 대부분 서버 값이고 프론트는 "시세 있는 종목만" 합산한다. 매수·매도(`QuickStockModal`)와 환전 등록(`ExchangeAddModal`)은 파일이 `Assets/modals`에 있지만 이 문서에서 다룬다.

- 주요 파일: `Stocks.tsx` · `AddHoldingsModal` · `TradeEditModal` · `StockEditModal` · `ExchangeHistoryModal` · `data/stocksView.ts`
- 기억할 것: 시세 null은 0이 아니다 · 그룹별 수익률·섹터 비중은 탭을 따르지 않는다 · PUT은 전체 교체(tax·exchangeRate·memo 되돌려 보내기) · settleCash는 등록 전용.

## 3. 가계부 — [flow-ledger.html](flow-ledger.html)

개요 탭(딥카드·분류 순위·고정지출·저축률)과 내역 탭(정산월 달력 + 목록 5건/쪽). 거래 입력 모달은 세 진입점이 같은 업데이터(`openNewEntryUpdater`)를 쓰고, 저장하지 않고 닫으면 초안을 보관한다.

- 주요 파일: `Ledger.tsx` · `LedgerEntryModal` · `FixedExpenseModal` · `SubscriptionIconPicker` · `CategoryDetailModal` · `data/ledgerView.ts` · `state/selectors/entryDraft.ts` · `utils/date.ts`
- 기억할 것: 수입/지출은 소분류 필수·상대 계좌 금지, 저축은 둘 다 필수, 이체는 그 반대 · 저축·이체의 "계좌" 칸이 `transferAccountId` · 기간 조건은 섞지 않는다(주간·날짜는 from/to, 월간은 year/month).

## 4. 설정 · 인증 · 계정 · 알림 — [flow-settings.html](flow-settings.html)

로그인 전(로그인 · 회원가입 4단계 · 비밀번호 찾기)과 로그인 후(설정 모달 4개 · 계정 모달 · 알림 배너/패널 · 가족·커플 공유), 그리고 모든 화면이 공유하는 부팅·401 재발급 경로.

- 주요 파일: `AppShell` · `screens/Auth/*` · `Settings.tsx` + `modals/*` · `layout/modals/AccountModal` · `NotificationBanner` · `useNotificationDelivery.ts` · `NotificationPanel` · `FamilyShareModal` · `ShareInviteConfirmModal`
- 기억할 것: 가입 성공 ≠ 로그인(온보딩 "모닛 시작하기"에서 signIn) · 테마 롤백은 훅 한 곳 · 월 시작일 변경은 캐시 전체 · SSE는 1회용 티켓이라 재연결을 직접 · 연동 해제는 여기서만.

## 5. 대시보드 — [flow-dashboard.html](flow-dashboard.html)

레이아웃 A·B·C(이 기기 localStorage)와 카드 13종. 카드 하나가 파일 하나이고 자기 데이터 훅을 직접 부른다. 총자산 판정(`useDashboardHero`)과 추이(`useDashboardTrend`)는 여러 카드가 공유하고, 월간 리포트(스토리 카드 5장)와 목표 설정 모달도 여기서 다룬다.

- 주요 파일: `Dashboard.tsx` · `layouts/DashboardLayout{A,B,C}` · `cards/*` · `hooks/*` · `Assets/modals/ReportOverlay` · `AddGoalModal` · `data/dashboardView.ts` · `data/reportView.ts` · `utils/reportExport.ts`
- 기억할 것: summary 0은 "계좌 없음"이 아닐 수 있다(allocation으로 보완) · 추이 x축은 달력 12개월 고정 · 목표 미설정은 0으로 채운 200 · 리포트 이미지는 로드된 폰트 조각만.

---

## 화면 ↔ 서비스 도메인 교차표

| 도메인 (`src/services/`) | 재산 | 주식 | 가계부 | 설정·인증 | 대시보드 |
|---|---|---|---|---|---|
| auth · user | — | — | settings(정산월) | ● 전부 | — |
| institution | ● 계좌 추가·드롭다운 | ● 계좌 드롭다운 | ● 계좌 드롭다운 | — | ● 보관처 |
| account | ● 등록·상세·수정·잔액정정·해지 | ● 계좌 목록 | ● 계좌 목록 | — | ● 결제 계좌 |
| asset | ● 분포·유동성 | — | — | — | ● 보관처 |
| category | — | — | ● 소분류 선택 | ● 소분류 추가·삭제 | — |
| transaction | ● 계좌 상세 거래 | — | ● 전부 | — | ● C안 카드 |
| subscription | — | — | ● 고정지출·구독 | — | ● 결제 예정 |
| stock · trade | ● 보유 종목 담기 · 계좌 상세 매매 | ● 전부 | — | — | — |
| exchange | ● 환전 등록(파일 위치) | ● 요약·내역·등록 | — | — | — |
| marketIndex | — | ● 시장 지표 | — | — | — |
| goal | ● AddGoalModal(파일 위치) | — | — | ● 맞춤 설정 | ● 목표 카드 · 미리보기 |
| dashboard | ● 월간 리포트 | ● 총자산 대비 비중 | — | — | ● 요약·추이·구성 |
| notification | — | — | — | ● SSE·패널·배너 | — |
| export · import | — | — | — | ● 데이터 관리 | — |
| connection | ● 등록·첫 동기화·계좌 상세 가져오기 | — | — | ● 목록·재동기화·해제 | — |
| share | ● 초대·멤버·공유받은 계좌 | — | ● 공유 계좌 거래 | ● 가족·커플 공유 · 초대 확인 | — |

---

## 시퀀스 색인

**재산 FA** — FA0 진입(자산 구성·함께 보는 계좌·트리맵·유동성) · FA1 자산군 카드 → 계좌 목록 → 상세·수정·추가 · FA2 계좌 상세(한 겹 감싼 응답·합친 거래내역·연동 가져오기·함께 보기) · FA3 계좌 추가 · FA4 보유 종목 담기 · FA5 API 키 연동 · FA6 계좌 수정·잔액 정정·해지 · FA7 함께 보는 사람(초대·권한·내보내기·끄기) · FA8 공유받은 계좌 상세 · FA9 트리맵 블록 만들기 · FA10 보관처 전체 보기·부동산 준비 중

**주식 FB** — FB0 진입·시장 탭 · FB1 매수(검색·신규 종목·저장) · FB2 매도(보유량 상한·예수금 입금) · FB3 보유 종목 추가(순차 POST) · FB4 매매 수정·삭제 · FB5 종목 정보 수정 · FB6 환전 등록 · FB7 환전 내역·수정·삭제 · FB8 환율·시세 미확보 회색 안내 · FB9 시장 지표 타일·전광판

**가계부 FC** — FC0 개요 진입·이번 달/올해·지난 정산월 · FC1 내역 탭 달력+목록 · FC2 기간 이동·주간↔월간·날짜 선택·검색 · FC3 입력 모달 세 진입점·초안 복원 · FC4 거래 저장 유형별 분기·공유 계좌 · FC5 수정·삭제 · FC6 닫기 — 초안 보관 · FC7 고정 지출·구독 · FC8 분류별 상세 · FC9 정산월 달력 그리기 · FC10 월 시작일 변경 → 가계부

**설정 FD** — FD0 부팅·세션 복원·인증 게이트 · FD1 로그인 · FD2 회원가입 4단계 · FD3 비밀번호 찾기 · FD4 401 재발급 인터셉터 · FD5 계정 모달 · FD6 테마 낙관적·롤백 · FD7 월 시작일·소분류·D-Day · FD8 엑셀·연동 관리 · FD9 알림 SSE·캐시 삽입·배너·패널 · FD10 맥·PC 알림 허락 · FD11 가족·커플 공유·초대 확인 · FD12 설정 화면 진입·약관 전문

**대시보드 FE** — FE0 진입·레이아웃·요청 합치기 · FE1 총자산 히어로 판정 · FE2 올해 추이 · FE3 구성 도넛·보관처 · FE4 목표 설정·미리보기·저장·삭제 · FE5 월간 리포트 열기·달 이동 · FE6 리포트 이미지 저장·공유 · FE7 C안 가계부 카드 · FE8 레이아웃 전환 · FE9 다른 화면의 쓰기 → 대시보드 갱신

---

## 관련 문서

- `docs/monit-frontend-handbook.html` — 프론트 핸드북 18장(이 문서의 세부 근거)
- `CLAUDE.md` — 절대 규칙·도메인 컨텍스트
- `docs/architecture.md` · `docs/state-management.md` · `docs/api-conventions.md` · `docs/code-convention.md` · `docs/mobile.md` · `docs/excel-import.md`
- 백엔드 흐름: `../../../asset/docs/flow/README.md`
- API 스펙 정본: 실행 중 서버의 OpenAPI (`http://localhost:8080/docs`)
