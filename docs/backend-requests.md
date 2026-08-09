# 백엔드에 요청할 항목 (프론트 연동 중 확인된 것)

작성일: 2026-08-09
확인 방법: 실행 중인 `http://localhost:8080`에 직접 요청해 응답을 대조 + `GET /v3/api-docs`(OpenAPI)

> 이 문서는 자산·가계부·주식 화면을 실제 API에 연결하면서 **직접 서버 응답을 확인해** 모은 것입니다.
> "못 그리는 것"은 응답에 값이 없어서 화면에 **아예 렌더하지 않은** 항목입니다 — 가짜 값을
> 채워 넣지 않았습니다.
>
> 우선순위: 🔴 막힘(작업 불가) · 🟠 화면 요소 누락 · 🟡 확인/규약

---

## 🔴 0. 인증이 켜졌는데 스펙 문서에 반영되어 있지 않다 (최우선)

작업 시작 시점에는 모든 API가 인증 없이 응답했고 `secret/API-SPEC.md` 5행도 "단일 사용자 모드 —
별도 인증 헤더가 필요 없습니다"라고 명시하고 있다. 그런데 작업 도중부터 **모든 엔드포인트가
401 `UNAUTHENTICATED`("인증이 필요합니다")** 를 반환하기 시작했다.

`GET /v3/api-docs`로 확인한 결과 실제로는 아래가 새로 들어와 있다:

| 엔드포인트 | 요청 |
|---|---|
| `POST /auth/signup/code` | `{email}` → 204 |
| `POST /auth/signup` | `{email, password, name, code(6자리), hasMarketingOptIn?}` → 201 `TokenRes` |
| `POST /auth/login` | `{email, password, rememberMe?}` → 200 `TokenRes` |
| `POST /auth/refresh` | (본문 없음) → 200 `TokenRes` |
| `POST /auth/logout` | (본문 없음) → 204 |
| `POST /auth/password/code`, `PUT /auth/password` | 비밀번호 재설정 |
| `PATCH /users/me`, `DELETE /users/me`, `PATCH /users/me/password` | 회원정보 수정·탈퇴·비번변경 |
| `GET /notifications/stream` | SSE (신규) |

`TokenRes = {accessToken, tokenType, expiresIn}` · securityScheme = `bearerAuth` (HTTP Bearer, JWT)

**요청**
1. `secret/API-SPEC.md`에 인증 섹션을 추가하고 "인증 불필요" 문구를 정정해 주세요.
2. **리프레시 토큰 전달 방식을 확정해 주세요.** `POST /auth/refresh`가 요청 바디를 받지 않는 걸로
   보아 httpOnly 쿠키로 추정하고 프론트를 `withCredentials: true`로 구현했습니다. 맞는지,
   쿠키 이름·`SameSite`·`Secure`·수명이 어떻게 되는지 알려주세요.
3. **액세스 토큰 수명(`expiresIn`)** 과 만료 시 재발급 정책(슬라이딩 여부)을 알려주세요.
4. 배포 환경의 CORS 허용 오리진(현재 로컬은 `localhost:5173` 허용 확인).
5. 앞으로 **인증 같은 파괴적 변경은 미리 공유**해 주세요. 켜진 순간 프론트 화면 전체가 멈춥니다.

---

## 🔴 1. 시드 데이터가 없어 가계부 기능 전체가 막혀 있다

| 확인 | 결과 |
|---|---|
| `GET /users/me` | 404 `USER_NOT_FOUND` |
| `GET /users/me/settings` | 404 `USER_SETTINGS_NOT_FOUND` |
| `GET /categories` | `[]` (스펙은 "대분류 시드 고정"이라고 명시) |
| `GET /transactions`, `/transactions/summary`, `/rankings`, `/summaries/monthly` | 전부 404 `USER_SETTINGS_NOT_FOUND` |

**못 그리는 것**: 가계부 개요 전체(수지 하이라이트·분류별 지출·저축률·월별 저축률), 자산 목표,
대시보드 전부. 그리고 카테고리가 없으면 `subcategoryId`가 필수라 **거래 등록 자체가 불가능**.

**요청**: 신규 가입 사용자에게 `user_settings` 기본행과 카테고리 대분류/소분류 시드가 자동
생성되는지 확인해 주세요. 안 된다면 (a) 시드 마이그레이션을 넣거나 (b) 설정이 없을 때
기본값(`monthStartDay=1`)으로 응답하도록 해 주세요. **어느 쪽이든 프론트가 404를 폴백 처리해야
하는지 확정이 필요합니다.**

---

## 🔴 2. `GET /indices` — USDKRW 누락 + 변동률(%) 없음

스펙은 KOSPI/SPX/IXIC/USDKRW 4개 고정이라고 하지만 실제 응답은 **3개**(USDKRW 없음).
필드도 `changeFromPreviousClose`(절대 증감)뿐이라 **전일 종가가 없어 %를 계산할 수 없다.**

**못 그리는 것**: 주식 화면 시장 지표 4번째 카드(USD/KRW) 자체, 4개 카드 모두의 `+0.62%` 표기,
그리고 연쇄로 외화 카드의 원화 환산액(#6).

**요청**: (a) USDKRW가 빠지는 조건(외부 API 부분 실패?), (b) `previousClose` 또는 `changePercent`
추가, (c) 일부 실패 시 부분 반환/전체 503 정책 확정.

---

## 🟠 3. 계좌 조회 응답에 `institutionId` / `interestRate`가 없다

`GET /accounts/{id}`가 `institutionName`만 주고 `institutionId`를 주지 않는다.

**영향**: 계좌 수정 화면에서 기관을 **이름으로 역조인**해 id를 복원하고 있다(기관명이 DB 유니크라
동작하지만, 기관 목록 로딩이 늦으면 표시가 틀린다). `interestRate`는 현재 값을 알 방법이 없어
**수정 폼에서 아예 빼 두었다** — 모르는 값을 덮어쓰게 하는 게 더 위험해서.

**요청**: `AccountResponse`에 `institutionId`, `interestRate`, `openedAt` 추가.

---

## 🟠 4. `/assets/distribution`의 계좌 항목에 기관명이 없다

`accounts[]`가 `{accountId, accountName, valueKrw}`뿐이다.

**못 그리는 것**: 자산 카테고리 모달의 계좌 행 둘째 줄(기관명).
현재는 `GET /accounts`를 추가로 받아 조인하는데, 해지 계좌가 목록에서 빠지면 조인이 깨진다.

**요청**: `institutionName`(또는 `institutionId`) 추가.

---

## 🟠 5. `institutions[].icon`의 허용 값 집합이 없다

예시가 `"kakaobank"`, `"toss"`인데, 프론트 `src/design/bank-institutions.ts`의 `tokenKey`(125개)와
같은 체계인지 불명. 다르면 **모든 기관 아이콘이 기본 아이콘으로 폴백되어 브랜드 컬러가 사라진다.**

또한 **아이콘 제거가 불가능하다** — PATCH에서 `icon` 키를 생략해도, `icon: null`을 명시해도 기존
아이콘이 그대로 유지되는 것을 실제로 확인했다. 프론트는 이미 아이콘이 있는 기관을 수정할 때
"선택 안 함" 버튼을 잠그고 안내를 띄우는 것으로 임시 처리했다.

**요청**: (a) `icon` 허용 값 목록 또는 생성 규칙(프론트 tokenKey 목록 제공 가능),
(b) `icon: null`로 제거할 수 있게 해 주세요.

---

## 🟠 6. 주식 포트폴리오 요약 API가 없다

**못 그리는 것**: 주식 화면 상단 4지표(총 평가금액 / 총 매수금액 / 평가손익 / 수익률).

현재는 `GET /stocks/holdings` 배열을 합산해 파생하고, 총 매수금액을
`valuationKrw − unrealizedPnlKrw`로 역산한다 — **수수료 포함 실제 원가와 다를 수 있다.**
"총자산의 N%" 표기는 대시보드 API가 필요해 제거했다.

**요청**: `GET /stocks/holdings/summary` 신설, 또는 holdings 항목에 `principalKrw` 추가.

---

## 🟠 7. 보유 종목 응답에 `ticker`와 현재가가 없다

`GET /stocks/holdings`가 `stockId`/`stockName`만 준다.

**못 그리는 것**: 종목 카드의 티커, "현재가 / 전일대비" 컬럼.
티커는 `GET /stocks` 전체 목록과 조인해 채우고 있고(조인 실패 시 빈 값), 현재가·전일대비는
아예 그리지 않았다(하드코딩하지 않음).

**요청**: `ticker`, `currentPrice`, `previousClose` 추가. 계좌별 보유 조회가 가능한지도 확인 필요
(여러 증권 계좌에 같은 종목이 있을 때 합산되는지).

---

## 🟠 8. `exchanges/summary`에 원화 환산액·현재 환율이 없다

`heldForeignAmount`, `weightedAvgRate`, `unrealizedGainKrw`, `realizedGainKrw`만 온다.

**못 그리는 것**: 외화 카드의 "(원화 약 231,209,000원)".
`/indices`에도 USDKRW가 없어(#2) 프론트에서 계산할 방법도 없다.

**요청**: `heldValueKrw` 또는 `currentRate` 추가.

---

## 🟠 9. 계좌 잔액 추이(스파크라인) 조회 비용

계좌마다 `GET /accounts/{id}/snapshots`를 개별 호출해야 한다(계좌 6개면 6회).

**요청**: 목록 응답에 최근 N개 스냅샷 요약을 얹거나, 전 계좌 벌크 엔드포인트 신설.

---

## 🟡 10. 정산월의 실제 시작·종료일이 응답에 없다

**영향**: 가계부 헤더의 "2026년 6월", "6월 4주차 (6.22–6.28)" 라벨과 캘린더 축을 프론트가
`monthStartDay`로 재계산해야 하는데, **말일 보정 규칙(예: `monthStartDay=28`이고 2월)이 서버와
어긋나면 표시와 데이터가 불일치**한다. 규칙이 문서에 없어 프론트는 현재 달력 연·월을 커서로
쓰고 기간 경계 표기는 보류했다.

**요청**: 월 기준 응답에 `periodStart`/`periodEnd`를 동봉하거나, 정산월 경계 계산 규칙을 문서화.

---

## 🟡 11. `summaries/daily`가 `from`/`to`를 받지 않는다

**못 그리는 것**: 가계부 주간 탭 캘린더를 서버 범위 조회로 처리할 수 없어, 월 데이터를 받아
프론트에서 잘라 쓰고 있다.

**요청**: `from`/`to` 파라미터 허용.

---

## 🟡 12. TRANSFER 거래에 상대 계좌명이 없다

`subcategoryName: null` + `transferAccountId`(숫자)만 온다.

**못 그리는 것**: 내역 리스트의 이체 행 태그. 계좌 목록과 조인해 채우고 실패 시 "계좌 이체"로 폴백.

**요청**: `transferAccountName` 추가.

---

## 🟡 13. `GET /transactions`의 기본 정렬 규약이 없다

실제 응답이 `sort.unsorted: true`. 같은 날짜 안의 2차 정렬 키가 정해져 있지 않으면
**페이지 경계에서 항목이 중복되거나 누락될 수 있다.**

**요청**: 기본 정렬과 2차 정렬 키(예: `transactionDate desc, id desc`) 확정. `sort` 파라미터로
허용되는 필드 목록도 알려주세요.

---

## 🟡 14. 구독/고정지출이 서버 스펙과 화면 설계가 다르다

서버는 `paymentDay`(1~31) 하나만 받는데, 화면에는 **매주/매월/매년** 반복 주기와 결제요일·결제월
입력이 있다. 현재는 매월만 지원되도록 UI를 정리했다.

**요청**: 주간/연간 반복을 지원할 계획이 있는지 확인. 그리고 `paymentDay`가 29~31일 때 해당
날짜가 없는 달(2월 등)에 서버가 어떻게 처리하는지(말일로 당김 / 건너뜀) 알려주세요.

---

## 🟡 15. 소분류 삭제 시 참조 무결성이 없다

사용 중인 소분류를 삭제해도 서버가 막지 않는다(스펙 §7.3 주석에도 명시).
→ 기존 거래·구독의 태그가 깨질 수 있다. 프론트는 삭제 전 확인 단계만 두었다.

**요청**: 사용 건수를 반환하는 API를 주시거나, 사용 중이면 409로 차단해 주세요.

---

## 🟡 16. 계좌 해지의 소프트 삭제 동작 확인

스펙 §1.5가 "(추정 — 원장 보존을 위해 소프트 삭제)"라고 표기하고 있다.
해지 계좌가 목록에서 빠지면 그 계좌를 참조하는 **과거 거래의 `accountId` 조인이 실패**한다.

**요청**: 해지 계좌 조회 방법(`includeClosed` 파라미터 등)이 있는지 확인.

---

## 🟡 17. 되돌릴 수 없는 선택지들

- 계좌의 `institutionId`: `UpdateAccountRequest`가 optional이지만 null 허용이 아니라, 한 번 지정한
  기관을 "미지정"으로 되돌릴 수 없다.
- 계좌의 `maturityDate`: 같은 문제. 한 번 지정하면 "만기일 없음"으로 되돌릴 수 없다.

**요청**: 두 필드 모두 `null` 전송으로 해제할 수 있게 해 주세요.

---

## 🟡 18. 없는 기능

- **자산 배분 목표(목표 비율) API 부재** — 스펙 §5가 스스로 미구현이라고 명시.
  `TargetRatioModal` 화면 전체가 연동 불가(참고: 현재 이 모달은 여는 버튼도 없는 죽은 화면).
  구현 계획이 없다면 화면 제거 여부를 제품 결정으로 확정해 주세요.
- **종목 삭제 API 없음** — 등록/수정/검색만 있어 잘못 등록한 종목을 지울 수 없다.
- **CSV 가져오기 없음** — 엑셀 내보내기만 있다. 가계부 화면의 "CSV 가져오기" 버튼은 제거했다.
- **거래 키워드 검색 없음** — `description` 텍스트 검색 파라미터가 없다.
- **페이지네이션이 `/transactions`에만 있음** — `/trades`, `/exchanges`는 건수가 늘면 전량 반환.
  `/exchanges`는 `currency`가 필수라 "전 통화 환전 내역" 화면도 만들 수 없다.

---

## 🟡 19. `PUT`이 "전체 교체"인지 확정 필요 (데이터 유실 위험)

`transaction.type.ts`/`subscription.type.ts`에는 "PUT은 전체 교체"라고 적혀 있다. 이 말이 맞다면,
**옵셔널 필드를 생략한 PUT은 기존 값을 지운다**는 뜻이다.

문제가 되는 지점: 서버에 단일 거래 조회(`GET /transactions/{id}`)가 없어서, 프론트는 목록 응답의
값으로 수정 폼을 채운다. 목록에는 `memo`/`nativeAmount`/`nativeCurrency`가 오지만 화면에서 편집하지는
않는다. 프론트는 이 값들을 그대로 다시 실어 보내도록 처리했지만(`entryPreserved`),
**"생략 = 유지"인지 "생략 = 삭제"인지 확정되면 이 우회를 걷어낼 수 있다.**

**요청**: PUT의 옵셔널 필드 생략 시 동작을 확정해 주세요. 그리고 `GET /transactions/{id}`,
`GET /subscriptions/{id}` 단건 조회를 추가해 주시면 이런 우회가 필요 없어집니다.

---

## 🟡 20. 확인만 필요한 자잘한 것

- `savingsRatePercent` 계산식이 `/transactions/summary`와 `/dashboard/reports`에서 같은지.
- 목표 `progressPercent`가 100% 초과 시 clamp되는지.
- `/stocks/holdings/groups`의 `by` 파라미터만 소문자 문자열(`"sector"`)이고 다른 enum은 전부
  대문자 코드값이다 — 오타 유발 지점.
- `Currency`가 `KRW|USD` 2개뿐인데 `Market`에는 `CRYPTO`가 있다. 가상자산 종목의 `currency`를
  무엇으로 등록해야 하는지.
- 알림 `linkType`이 `"ACCOUNT"` 고정 문자열인지 enum인지.
- `FX_RATE_NOT_FOUND`가 422로 오는데, 해외 종목 1개 때문에 국내 보유 목록까지 통째로 실패하는지.
- `GET /notifications/stream`(SSE)이 새로 생겼는데 스펙에 없다 — 이벤트 형식과 인증 방법.

---

## 🟠 21. `AccountResponse`에 원금(초기 투자금)이 없다

계좌 상세 모달(`AccountDetailModal`)에서 "현재 잔액"은 `balance`로 그릴 수 있지만, 그 옆에 함께
보여주던 "원금 대비 +N%" 배지를 그릴 근거가 없다. `CreateAccountRequest.initialBalance`는 생성
요청에만 있고, 이후 응답 어디에도 원금(또는 누적 입출금 기준 원가)이 내려오지 않는다.

**못 그리는 것**: 계좌 상세의 원금 대비 증감 배지. 배지 자체를 제거했다(하드코딩·추정값 없음).

**요청**: `AccountResponse`에 원금 필드(예: `initialBalance` 또는 원가 재계산치)를 추가하거나,
스냅샷 원장에서 서버가 계산한 손익률을 별도 필드로 내려주세요.
