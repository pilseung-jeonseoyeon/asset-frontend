# API 통신 컨벤션

axios + React Query 기반 API 통신 규칙입니다. 전체 폴더 구조는 `docs/architecture.md`, 상태 경계는
`docs/state-management.md`를 보세요.

> **백엔드 스펙의 정본은 실행 중인 서버의 OpenAPI 문서입니다** — Swagger UI
> `http://localhost:8080/docs`(또는 `/swagger-ui/index.html`), JSON `http://localhost:8080/v3/api-docs`.
> 필드 유무·타입·enum·`required`·nullable(`type: [..., "null"]`)과 에러 코드 전체 표(`ErrorResponse`
> 스키마 설명)가 여기 있습니다. 별도 API 스펙 문서는 만들지 않습니다. OpenAPI에도 없는 세부는
> 추측하지 말고 사용자에게 확인하세요.

## 설치된 것 / 설정된 것

- 의존성: `axios`, `@tanstack/react-query`, `zustand`, `zod`
- 경로 별칭: `@/*` → `src/*` (`tsconfig.app.json`의 `paths`, `vite.config.ts`의 `resolve.alias`)
- `src/services/api.ts` — axios 인스턴스 `api` + 요청/응답 인터셉터 + `ApiError` + `unwrap` +
  `refreshAccessToken`
- `src/services/apiBlob.ts` — 파일 다운로드 전용 인스턴스(`downloadBlobFile`, `todayStamp`). 아래
  "파일 주고받기" 참고
- `src/services/api.types.ts` — `ApiResponse<T>` / `ApiErrorPayload` 공통 봉투 타입
- `src/services/common.type.ts` — 여러 도메인이 함께 쓰는 enum(`Currency`, `AccountType`,
  `AssetClass`, `TransactionType`, `Market` 등), 목록 조회 파라미터, Spring `Page<T>`
- `src/services/queryKeys.ts` — React Query 키 중앙 레지스트리(`queryKeys`)
- `src/services/queryClient.ts` — `QueryClient`. `src/main.tsx`에서 `QueryClientProvider`로
  `AppStateProvider` 바깥을 감쌉니다.

### baseURL과 개발 서버 프록시

- baseURL은 `VITE_API_BASE_URL`(타입은 `src/vite-env.d.ts`)이고, 비어 있으면 `api.ts`의 기본값
  `/api/v1`(상대 경로)을 씁니다. **버전 `/api/v1`은 baseURL에 포함**되므로 서비스 함수는 `/accounts`처럼
  버전 없이 씁니다.
- **개발(`pnpm dev`)**: `VITE_API_BASE_URL`은 비워 두거나 `/api/v1`로 둡니다. `/api` 요청은
  `vite.config.ts` 프록시가 `VITE_DEV_PROXY_TARGET`으로 넘기며, **기본값은 로컬 백엔드
  `http://localhost:8080`** 입니다. 브라우저는 같은 출처로만 요청하므로 백엔드 CORS·쿠키 SameSite 설정과
  무관하게 refresh 쿠키 로그인 유지가 됩니다. 절대 URL을 넣으면 프록시를 건너뛰니 넣지 마세요.
- **운영 API로 붙어야 할 때만** `.env.local`(gitignore됨)에 `VITE_DEV_PROXY_TARGET=https://api.monit.io.kr`
  한 줄을 넣습니다. 이때 로컬 화면의 등록·삭제가 운영 DB를 바꾸니 테스트 계정으로 쓰세요.
  `.env.development` 같은 커밋되는 env 파일은 만들지 않습니다.
- 프록시는 개발 편의를 위해 `Origin` 헤더를 떼고, 쿠키의 `Domain`·`Secure`를 지웁니다(http인 개발 서버에서
  refresh 쿠키가 저장되게).
- **프로덕션 빌드**: 배포 환경(Vercel) 환경변수의 `VITE_API_BASE_URL`(절대 URL)을 씁니다.

## Axios 인스턴스

`api.ts`의 인스턴스 하나를 모든 서비스 함수가 공유합니다.

```ts
export const api = axios.create({
  baseURL,                          // API_BASE_URL
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,            // refresh_token이 httpOnly 쿠키로 오간다
  paramsSerializer: { indexes: null }, // 배열을 sort=a&sort=b로
})
```

- **반복 파라미터**: Spring `Pageable`은 `sort=transactionDate,desc&sort=id,desc`처럼 같은 키를 반복해
  받습니다. axios 기본값(`sort[]=a`)으로는 서버가 정렬을 못 읽어 `indexes: null`을 걸어 두었습니다.
- **정렬은 항상 명시**: 페이지네이션이 있는 목록은 `GET /transactions` 하나이고 서버 기본 정렬이 없어,
  `sort`를 빼면 페이지 사이에 항목이 겹치거나 빠집니다. `transaction.service.ts`의
  `DEFAULT_TRANSACTION_SORT`가 2차 키(`id`)까지 고정합니다. 없는 필드명을 보내면 400이 아니라 500이니
  정렬 키를 임의로 늘리지 마세요.
- **timeout 오버라이드**는 오래 걸리는 요청에만 서비스 함수에서 겁니다: 연동 동기화 30초
  (`connection.service.ts`), 엑셀 업로드 60초(`import.service.ts`). 토큰 재발급(`refreshAccessToken`)은
  single-flight라 호출부별 timeout을 두지 않습니다.
- 반복되는 요청/응답 가공(에러 정규화 등)은 서비스 함수가 아니라 인터셉터에서 한 번만 합니다.

## 엔드포인트·함수 네이밍

- 경로는 RESTful 리소스 중심이고 버전 프리픽스는 baseURL에만 둡니다.
- 서비스 함수는 camelCase `{httpMethod}{Resource}`: `getAccounts`, `postAccount`, `deleteAccount`.
- React Query 훅은 `use{HttpMethod}{Domain}{Action}`: `useGetAccounts`, `usePostLogin`,
  `usePatchUserSettings`. HTTP 요청 하나에 대응하지 않는 훅은 동작 이름을 씁니다(`useRestoreSession`,
  `useNotificationStream`, `useCompleteSignupOnboarding`).

## Request/Response 타입

- 도메인 타입은 `src/services/{domain}/{domain}.type.ts`에 `PascalCase` + `Request`/`Response`
  접미사로 둡니다(`CreateAccountRequest`, `AccountResponse`).
- 여러 도메인이 함께 쓰는 enum·파라미터·`Page<T>`는 `common.type.ts`에 둡니다. 도메인 폴더끼리는 서로
  import하지 않습니다(순환 방지).
- 공통 응답 봉투(`api.types.ts`). 성공/실패를 유니온으로 합치지 않는 이유는 axios가 비-2xx를 reject해
  서비스 함수 본문에서는 성공 형태만 다루기 때문입니다.

  ```ts
  // 성공: { "success": true, "data": { ... } }
  export interface ApiResponse<T> {
    success: true
    data?: T // 204/Void 응답은 data 키 자체가 없음(@JsonInclude(NON_NULL))
  }

  // 실패: { "success": false, "error": { "code": "...", "message": "..." } }
  export interface ApiErrorPayload {
    success: false
    error: { code: string; message: string }
  }
  ```

  서버 `ErrorResponse`에는 쿨다운이 있는 실패(`VERIFICATION_CODE_RESEND_COOLDOWN` 등)에만
  `retryAfter`(초)가 더 붙지만, 프론트 타입과 `ApiError`는 아직 이 값을 싣지 않습니다.

- 서비스 함수는 `unwrap`으로 `data`를 꺼냅니다(`data`가 없으면 `EMPTY_RESPONSE`). 204를 돌려주는
  DELETE 계열은 `unwrap`을 쓰지 않습니다.

  ```ts
  export async function getAccounts(params: AccountListParams = {}) {
    return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
  }
  export async function deleteAccount(accountId: number) {
    await api.delete(`/accounts/${accountId}`) // 204 No Content
  }
  ```

- `zod`는 설치만 되어 있고 쓰는 도메인은 없습니다. 응답 검증이 필요한 도메인이 생기면 스키마를 선언하고
  `z.infer`로 타입을 뽑습니다(모든 도메인에 강제하지 않음).
- `verbatimModuleSyntax: true`이므로 타입만 가져올 땐 `import type { ... }`을 씁니다.

## 인증과 인터셉터

계약: 액세스 토큰 30분(`expiresIn: 1800`, 메모리 전용 — `src/stores/auth.ts`), 리프레시 토큰은
`refresh_token` httpOnly 쿠키(`Path=/api/v1/auth`, 14일, rotation). 폐기된 리프레시 토큰을 다시 쓰면
서버가 탈취로 보고 그 유저의 모든 세션을 끊습니다(`REFRESH_TOKEN_REUSED`) — 그래서 재발급은 반드시
single-flight입니다.

- **요청 인터셉터**: `useAuthStore.getState().accessToken`으로 `Authorization: Bearer`를 붙입니다.
  `PUBLIC_PATHS`(`/auth/login`, `/auth/signup`, `/auth/signup/code`, `/auth/refresh`, `/auth/password`,
  `/auth/password/code`)에는 토큰이 있어도 붙이지 않고, 401이 나도 재발급하지 않습니다.
- **401 → 재발급**: 공개 경로가 아닌 요청이 401을 받으면 `refreshAccessToken()`의 단일 Promise로
  `POST /auth/refresh`(쿠키 기반, 바디 없음)를 한 번만 보내고, 동시에 401을 받은 요청들은 같은 Promise를
  기다린 뒤 `_retriedAfterRefresh` 플래그로 **한 번만** 재시도합니다.
  - 재발급은 인터셉터가 없는 별도 `refreshClient`로 보냅니다(무한 재귀 방지).
  - 재발급 실패 시 `signOut()`으로 세션을 끊고 `AppShell`이 로그인 화면으로 돌려보냅니다.
  - 재발급과 재시도는 따로 잡습니다 — 재발급은 됐는데 재시도가 400/404로 실패한 경우를 세션 만료로
    오인하지 않고, 실제 실패를 호출부에 그대로 전달하기 위함입니다.
  - 응답이 돌아왔을 때 그 사이 로그인/로그아웃이 있었으면(`authGeneration`이 바뀜) 새 토큰을 반영하지
    않습니다.
- **`INVALID_REFRESH_TOKEN` / `REFRESH_TOKEN_REUSED`는 `POST /auth/refresh` 응답에만 나옵니다**
  (보호된 엔드포인트의 401은 `UNAUTHENTICATED`/`TOKEN_EXPIRED`뿐). 이 호출은 `refreshClient`로만 나가므로
  응답 인터셉터에서 이 두 코드를 분기하면 도달하지 않는 죽은 코드입니다. 구분은 `api.ts`의
  `describeRefreshFailure`에서 하며, `REFRESH_TOKEN_REUSED`는 "모든 기기에서 로그아웃" 문구로 따로
  안내합니다.
- **에러 정규화**: 그 밖의 실패는 서버 `error.code`/`error.message`를 담은 `ApiError(code, message,
  status)`로 reject합니다. 응답 body가 없으면 `code`는 `NETWORK_ERROR`입니다. `INVALID_INPUT`은 서버
  문구 끝에 영어 필드명이 붙어 오므로 `friendlyInvalidInputMessage`가 `INVALID_INPUT_FIELD_LABELS`에 있는
  필드만 한국어 문구로 바꿉니다(목록에 없으면 원문 유지).
- **로그아웃·로그인 시 캐시**: `auth.hook.ts`가 로그인·온보딩 완료·로그아웃 때 `queryClient.clear()`로
  이전 사용자 캐시를 비웁니다.
- **알림 SSE**: `EventSource`는 헤더를 못 붙이므로 `POST /notifications/stream/tickets`로 1회용 티켓을
  받아 `GET /notifications/stream?ticket=`에 붙입니다(`useNotificationStream`, 지수 백오프 재연결).

### 로그인 화면(`src/screens/Auth/`)과의 경계

- `AppShell`은 `useRestoreSession()`(`auth.hook.ts`)이 돌려주는 `useAuthStore().status`로 게이팅합니다:
  `unknown`이면 이 브라우저에서 세션을 본 적이 있을 때만 `BootScreen`, 없으면 바로 로그인 화면,
  `anonymous`면 `Auth.tsx`만, `authenticated`면 `AuthenticatedApp`을 렌더합니다.
  `anonymous`일 때 화면·모달을 마운트하지 않는 이유는 `useGetMe` 등 마운트 즉시 나가는 쿼리가 토큰 없이
  401을 반복하기 때문입니다.
- 인증 흐름은 `src/services/auth/`의 `usePostLogin` / `usePostSignupCode` / `usePostSignup` /
  `useCompleteSignupOnboarding` / `usePostPasswordResetCode` / `usePutPassword` / `usePostLogout`을
  씁니다. 로그인 상태에서의 비밀번호 변경은 `PATCH /users/me/password`(`user` 도메인)이고,
  `PUT /auth/password`는 비밀번호 찾기(재설정) 전용입니다.

## 파일 주고받기 (엑셀)

- **다운로드**(`responseType: 'blob'`)는 실패 시 body도 Blob이라 공용 응답 인터셉터가 `code`/`message`를
  못 읽습니다. 그래서 `apiBlob.ts`의 `downloadBlobFile`을 씁니다 — 별도 인스턴스(timeout 60초)가 Blob을
  텍스트로 읽어 서버 메시지를 복원하고, 401이면 `refreshAccessToken()`을 재사용해 한 번만 재시도합니다.
  파일명은 `Content-Disposition`에서 읽고 없으면 폴백 이름을 씁니다. 실제 브라우저 다운로드는 훅에서
  `triggerBrowserDownload`(`src/utils/download.ts`)로 합니다. `export`(내보내기)와 `import`(양식
  내려받기)가 함께 씁니다.
- **업로드**(`import.service.ts`의 `uploadImportFile`)는 공용 `api`로 `FormData`를 보내되,
  `Content-Type: multipart/form-data`를 **반드시 명시**합니다. 기본 헤더가 JSON이면 axios가 FormData를
  JSON으로 직렬화해 415가 납니다. boundary는 브라우저가 붙이므로 직접 만들지 않습니다.
- 가져오기 계약(시트·열 순서·전체 롤백·에러 코드)은 `docs/excel-import.md`를 보세요.

## 에러 핸들링

- 서비스 함수는 try/catch로 감싸지 않습니다. 인터셉터가 이미 `ApiError`로 정규화하므로 호출부(훅 사용처)에서
  한 번만 처리합니다.
- `err.message`는 이미 완성된 한국어 문장이므로 기본적으로 그대로 노출하고, UX를 바꿔야 할 때만
  `ApiError.code`로 분기합니다(`INSUFFICIENT_HOLDING`, `SUBCATEGORY_DUPLICATE_NAME` 등). 가능한 코드 전체는
  OpenAPI `ErrorResponse` 표에 있습니다.
- **에러가 아닌 실패**를 구분하세요. `FX_RATE_NOT_FOUND`(422)는 "환율 데이터가 아직 없음"이라 빨간 에러가
  아니라 `var(--text-weak)` 안내문으로 렌더합니다(`isExchangeRateMissing`, `stock.hook.ts`).
- **재시도**(`queryClient.ts`): 4xx는 다시 보내도 결과가 같아 재시도하지 않고, 5xx·네트워크 오류만 1회
  재시도합니다.
- 토스트/알림 프리미티브는 없습니다. 에러는 상태로 들고 있다가 그 자리에 렌더합니다. 토스트 컴포넌트를
  임의로 만들지 마세요(디자인 시스템 결정이 필요 — 사용자에게 확인).

## 로딩 상태

- React Query의 `isPending`/`isFetching`을 그대로 씁니다 — 별도 로딩 상태나 전역 로딩 카운터 스토어를
  만들지 마세요.
- 화면 전체를 덮는 로딩 오버레이는 없습니다. 카드·모달 단위로 그 자리에서 표시합니다(`Skeleton`
  프리미티브, `aria-busy`, 값 자리의 `—`).
- 페이지를 넘길 때 이전 페이지를 유지해야 하는 목록은 `placeholderData: keepPreviousData`를 씁니다
  (`useGetTransactions`).

## 서비스 폴더 구조

파일명은 단수형(`.hook.ts` / `.type.ts`)입니다(`docs/code-convention.md`).

```
src/services/
  api.ts                 axios 인스턴스 + 인터셉터 + ApiError + unwrap + refreshAccessToken
  apiBlob.ts             파일 다운로드 전용 인스턴스(downloadBlobFile)
  api.types.ts           ApiResponse<T> / ApiErrorPayload
  common.type.ts         도메인 공용 enum · 목록 파라미터 · Page<T>
  queryKeys.ts           React Query 키 중앙 레지스트리
  queryClient.ts         QueryClient(기본 staleTime·retry)
  {domain}/
    {domain}.service.ts    api 인스턴스를 쓰는 순수 함수 (getAccounts 등)
    {domain}.hook.ts       useQuery/useMutation으로 감싼 훅 (useGetAccounts 등)
    {domain}.type.ts       Request/Response 타입
    index.ts               위 세 파일 재export
```

현재 도메인 18개: `auth` `user` `institution` `account` `asset` `category` `transaction`
`subscription` `stock` `trade` `exchange` `marketIndex` `goal` `dashboard` `notification` `export`
`import` `connection`.

도메인 폴더는 백엔드 컨트롤러(OpenAPI 태그) 단위로 나눕니다. 폴더명과 경로가 다른 것: `marketIndex` ↔
`/indices`, `subscription` ↔ `/subscriptions`(고정지출 포함), `export`/`import` ↔ `/export/excel/*`,
`/import/excel/*`. 보유 종목은 `/stocks/holdings`이므로 `holding` 폴더를 만들지 말고 `stock` 도메인에 둡니다.

예시(`account` — 새 도메인은 이 형태를 따릅니다):

```ts
// account.service.ts
import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountListParams } from '../common.type'
import type { AccountResponse } from './account.type'

export async function getAccounts(params: AccountListParams = {}) {
  return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
}

// account.hook.ts
export function useGetAccounts(params: AccountListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.account.list(params),
    queryFn: () => getAccounts(params),
    enabled: options?.enabled,
  })
}

// index.ts
export * from './account.service'
export * from './account.hook'
export * from './account.type'
```

화면에서는 `import { useGetAccounts } from '@/services/account'`로 가져다 씁니다.

## queryKey 규칙

키는 배열 리터럴로 흩뿌리지 말고 `queryKeys.ts`의 `queryKeys`만 씁니다.

- 한 파일에 모은 이유: 백엔드가 잔액·평단·손익을 매 요청 원장에서 재계산하므로 거래 1건 등록이
  `transaction`·`account`·`asset`·`dashboard`·`goal`을 함께 무효화합니다. 도메인별로 나누면 mutation마다
  cross-import가 생깁니다.
- 배열 첫 요소는 도메인 이름(폴더명과 동일), 파라미터는 **마지막 하나의 객체**로 둡니다 — prefix 부분
  무효화(`queryKeys.account.all()`)를 유지하기 위함입니다.
- **정산월에 의존하는 쿼리는 `{ year, month }`를 키에 반드시 포함**합니다(`monthStartDay` 기준 정산월).
  "이번 달"은 달력 월이 아니라 `useCurrentSettlementMonth()`(`GET /users/me/settlements/current`)로 잡습니다.
- 화면 컴포넌트는 `queryKeys`를 직접 import하지 않습니다 — 훅 안에 캡슐화합니다.
- `staleTime` 기본값은 30초(`queryClient.ts`)이고, 마스터성 데이터만 늘립니다: 카테고리·금융기관·
  내 정보·사용자 설정 5분, 섹터 1시간, 현재 정산월·목표 미리보기 1분.
