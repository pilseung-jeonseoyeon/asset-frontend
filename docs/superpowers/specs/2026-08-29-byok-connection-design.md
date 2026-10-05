# 증권사·거래소 API 키 연동(BYOK) — 계약과 남은 확인 사항

> 정본은 실행 중인 서버 OpenAPI(`/v3/api-docs`, 태그 "외부 기관 연동")다. 아래는 2026-09-27 스냅샷과 대조한 요약이다.

사용자가 기관에서 **본인 명의로 직접 발급받은 API 키**를 등록하면, 서버가 그 키로 기관 API를 대신 호출해 계좌·보유 종목·
체결을 가져온다. 은행·카드는 키 발급 제도가 없어 대상이 아니며 엑셀 가져오기(`docs/excel-import.md`)로 대응한다.

## 1. 서버 계약

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/connections` | 연동 목록. 앱 키는 마스킹(`acce****`) |
| `POST` | `/connections` | 연동 등록 → 201 `ConnectionRes` |
| `POST` | `/connections/{connectionId}/syncs` | 동기화 실행 → 201 `SyncRes` |
| `DELETE` | `/connections/{connectionId}` | 연동 삭제 → 204 |

**수정 API는 없다.** 앱 시크릿은 서버가 암호화 저장하고 응답에 절대 내려오지 않으므로, 키를 바꾸려면 해제 후 재등록한다.

### `CreateConnectionReq`

| 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|
| `provider` | `'UPBIT' \| 'TOSS_INVEST' \| 'KB_SECURITIES' \| 'KIWOOM'` | ✅ | |
| `appKey` | string (≤255) | ✅ | 앱 키(액세스 키) |
| `appSecret` | string (≤255) | ✅ | 앱 시크릿 |
| `accountId` | int64 | — | 기존 계좌에 체결을 넣을 때. 생략하면 첫 동기화가 계좌를 자동 생성 |

### `ConnectionRes`

`id` · `provider` · `providerDescription`(기관 표시명, 예 `"업비트"`) · `appKey`(마스킹) ·
`accountId`(첫 동기화 전이면 null) · `lastSyncedAt`(첫 동기화 전이면 null) · `createdAt`

### `SyncRes`

| 필드 | 뜻 |
|---|---|
| `accountId` | 연결된 계좌 id |
| `accountCreated` | 이번에 계좌를 자동 생성했는지 |
| `seeded` | 기초 보유로 등록한 보유 종목 수 — 계좌 자동 생성 때만 0보다 클 수 있다 |
| `imported` | 매매로 등록한 체결 수 |
| `skipped` | 이미 등록돼 건너뛴 체결 수 |
| `rejected` | 검증에 걸려 거부된 체결 수 |

### 동기화 동작

- **첫 동기화**: 계좌를 자동 생성(또는 `accountId`로 지정한 계좌에 연결)하고, 지금 가진 종목을 기초 보유로 등록(`seeded`)한 뒤
  기준 시각만 잡는다. **연동 이전의 과거 체결은 가져오지 않으므로 `imported: 0`이 정상**이다.
- **이후 동기화**: 기준 시각 이후 체결만 매매 내역으로 추가한다. 기존 계좌·거래는 수정하지 않는다(추가만).
- **연동을 삭제해도 이미 만들어진 계좌·매매 내역은 남는다.**
- 동기화는 사용자가 버튼을 눌러야만 한다(자동·주기 동기화 없음).

### 에러 코드

OpenAPI에는 목록이 없고, 백엔드와 확정한 값이다(2026-08-29).

| 코드 | HTTP | 뜻 |
|---|---|---|
| `CONNECTION_DUPLICATE` | 409 | 같은 키로 이미 등록된 연동 |
| `CONNECTION_NOT_FOUND` | 404 | 없는(이미 해제된) 연동 |
| `CONNECTION_INVALID_CREDENTIALS` | 400 | **키 오류와 허용 IP 미등록이 같은 코드로 온다** |
| `CONNECTION_PROVIDER_NOT_SUPPORTED` | 400 | 동기화 미구현 기관(현재 KB증권) |
| `CONNECTION_SYNC_FAILED` | 502 | 기관 쪽 장애 |

화면 문구는 `src/data/connectionView.ts`의 `describeConnectionError`가 정본이다. 서버 `message`에는 "그래서 뭘 해야 하는지"가
빠져 있어 코드별로 다시 쓴다 — `CONNECTION_INVALID_CREDENTIALS`는 키 재확인과 허용 IP 등록을 둘 다 짚는다.

### 기관 지원 현황

`UPBIT`(가상자산) · `TOSS_INVEST` · `KIWOOM`(주식)은 동기화까지 된다. **`KB_SECURITIES`는 등록만 되고 동기화가
`CONNECTION_PROVIDER_NOT_SUPPORTED`로 떨어진다**(백엔드 미구현). 그래서 화면은 KB증권 칩을 "· 준비 중"으로 비활성하고
연동 배너의 기관명 나열에서도 뺀다. 근거는 `PROVIDER_META[p].supported`.

### 허용 IP

업비트·토스증권은 허용 IP 등록이 필요하다. 기관을 호출하는 주체는 사용자 브라우저가 아니라 **모닛 서버**이므로
등록할 값은 서버 공인 IP `43.202.91.109`다. 가이드 페이지 상단에 복사 버튼과 함께 있다.

## 2. 화면 동작

### 등록 — 계좌 추가 모달 안

- `src/screens/Assets/modals/AddAccountModal.tsx` 본문 맨 위(계좌 이름 칸 앞)에 점선 배너가 뜬다. 자산 유형이
  **주식·가상자산일 때만**(`providersFor(assetClass)`가 비지 않을 때) 보인다. 첫 동기화가 계좌를 만들기 때문에 등록 진입점은
  계좌 추가 흐름 한 곳뿐이다.
- 배너를 누르면 같은 패널이 `ConnectAccountView`로 바뀐다(새 모달 없음). 단계는 AppState `connectView`
  (`'none' | 'provider' | 'form' | 'result'`)와 `connectProvider`로 관리한다.
  1. **기관 선택**(주식만): 토스증권·KB증권·키움증권 칩. 이미 연동한 기관은 "· 연동됨", 미지원 기관은 "· 준비 중"으로 비활성.
     가상자산은 후보가 업비트 하나라 이 단계를 건너뛰고, 뒤로가기는 곧바로 계좌 추가 폼으로 돌아간다.
  2. **키 입력**: 기관별 입력 라벨·한 줄 발급 안내(`PROVIDER_META`)와 가이드 링크. 두 값 필수, 앞뒤 공백 제거, 255자 이하.
     입력칸은 `type="password"` · `autoComplete="off"` · `spellCheck={false}`. "연동하고 가져오기" 한 번으로
     `POST /connections` → `POST /connections/{id}/syncs`를 이어 부른다. `accountId`는 싣지 않는다(항상 자동 생성 경로).
  3. **결과**: `describeSync`가 네 숫자를 문장으로 만든다 — 0건 항목은 생략하되 `rejected > 0`은 반드시 드러내고,
     계좌를 새로 만든 경우 "지금까지의 내역은 가져오지 않는다"를 덧붙인다. 체결은 주식이면 '매매', 가상자산이면 '거래'로 부른다
     (`tradeNounFor`).
  - **등록은 됐는데 동기화만 실패**하면 연동을 지우지 않고 남긴 채 "다시 시도 / 나중에 할게요"를 보여준다. 가져오는 중에는
    닫기 버튼을 감춘다.
- 기관 표시명은 이미 연동한 기관이면 서버 `providerDescription`을, 아직 연동한 적 없는 기관이면 `PROVIDER_META[p].label`을 쓴다.

### 관리 — 설정 → 데이터 관리 및 백업

`src/screens/Settings/modals/ConnectionsSection.tsx`(DataModal 안 인라인 아코디언). 펼쳤을 때만 목록을 조회한다.
기관명 · 마스킹된 앱 키 · 마지막 가져오기 시각(`formatNotificationTime`) · [가져오기] [해제]. 새 연동 등록은 여기 없다.

- **해제 수단은 여기 한 곳뿐이다** — 이 화면이 없으면 등록한 키를 지울 방법이 없다.
- 해제는 인라인 확인을 받고, 확인 문구에 "이미 만들어진 계좌와 매매 내역은 그대로 남아요"를 넣는다.
- 빈 상태: 계좌 추가에서 연동할 수 있다는 안내 + 가이드 링크.

### 연동 계좌 표시

- 계좌 상세(`AccountDetailModal`)에는 연동된 계좌에만 "{기관} 연동" 칸과 [가져오기] 버튼이 뜬다. 해제는 두지 않는다.
- 자산군 상세(`AssetCategoryModal`)의 계좌 행에는 연동 표시가 붙는다.
- 계좌 ↔ 연동 매칭은 `connectionOfAccount`(`accountId`가 null인 연동은 제외).

### 가이드 페이지

기관별 발급 절차(권한 범위·허용 IP·시크릿 1회 노출·업비트 키 1년 만료)는 앱 밖 정적 페이지
`public/guide/connections.html`에 있다. URL은 `CONNECTION_GUIDE_URL` 한 곳에만 두고 기관 선택·키 입력·설정 빈 상태에서
**새 창**으로 연다(같은 창으로 이동하면 입력 중인 키가 사라진다). `vercel.json` rewrite 예외에 `guide/`가 있어야 앱 화면이 뜨지 않는다.

## 3. 데이터·상태

- 서비스: `src/services/connection/` — `useGetConnections` / `usePostConnection` / `usePostConnectionSync` / `useDeleteConnection`.
  queryKey는 `connection.all()` · `connection.list()`.
- 타임아웃: 동기화만 30초(기관 API를 실제로 호출).
- 무효화:
  - 등록: `connection`만(아직 계좌·매매가 없다).
  - 동기화: `connection` · `account` · `asset` · `trade` · `stock` · `dashboard` · `goal` · `transaction`
    (서버가 잔액·평단·손익을 원장에서 매번 재계산하므로 좁게 잡으면 화면끼리 어긋난다).
  - 삭제: `connection`만(계좌·매매는 남는다).

## 4. 보안

- **API 키는 `ConnectAccountView`의 로컬 `useState`에만 둔다.** AppState·localStorage·sessionStorage에 넣지 않는다.
  이 컴포넌트는 `connectView !== 'none'`일 때만 마운트되므로 뒤로 나가거나 모달을 닫으면 키도 함께 사라지고,
  등록에 성공하는 즉시 입력값을 비운다(재시도는 `connectionId`로 한다).
- 키가 담긴 요청·응답을 `console.log`로 남기지 않는다.
- 목록은 서버가 마스킹한 `appKey`만 보여주고 프론트에서 따로 마스킹하지 않는다.
- 외부 링크는 `target="_blank"` + `rel="noopener noreferrer"`.

## 5. 남은 확인 사항

1. **실제 기관 키로 동기화 성공 경로를 검증했는지 기록이 없다.** 잘못된 키 → `CONNECTION_INVALID_CREDENTIALS`까지만
   확인됐다(2026-08-29). 성공 결과 문장(`accountCreated`/`seeded`/`imported`/`skipped`/`rejected`)을 실제 응답으로 봐야 한다.
2. **업비트 키 1년 만료를 미리 알릴 방법이 없다.** `ConnectionRes`에 만료일 필드가 없다. 백엔드에 노출을 요청할지 결정 필요.
3. **KB증권 지원 시작 시** `PROVIDER_META.KB_SECURITIES.supported`를 `true`로 바꾸고 가이드 페이지의 "준비 중" 카드를 갱신한다.
4. **기존 계좌에 연동 붙이기**(`accountId` 지정)는 화면에 없다. 손으로 만든 증권 계좌가 있는 사용자는 계좌가 중복될 수 있다.
   붙이려면 계좌 유형이 맞지 않을 때 어떤 에러가 오는지부터 백엔드에 확인한다.
5. **같은 기관을 두 번 연동하는 경우.** 서버는 "같은 키"만 막는데(`CONNECTION_DUPLICATE`), 화면은 이미 연동한 기관을 통째로
   비활성한다. 한 기관에 계좌가 둘인 사용자를 지원할지 결정 필요.
