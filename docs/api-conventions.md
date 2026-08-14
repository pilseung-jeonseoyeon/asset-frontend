# API 통신 컨벤션

이 문서는 axios + React Query 기반 API 통신 규칙입니다. 다른 프로젝트(Next.js/Cursor)에서 쓰던
규칙을 이 저장소(Vite + React 19, `react-router-dom`으로 5개 메뉴 화면만 URL에 연결, 자세한 건
`docs/architecture.md` 참고) 구조에 맞게 옮긴 것입니다. 원본과 다르게 조정한 부분은 각 절에
표시해두었습니다.

> 실제 백엔드 스펙은 `secret/API-SPEC.md`입니다(git 미커밋). 도메인 서비스를 새로 만들 때는
> 이 문서의 "서비스 폴더 구조" 절을 그대로 따르세요.

## 설치된 것 / 설정된 것

- 의존성: `axios`, `@tanstack/react-query`, `zustand`, `zod` (`package.json`)
- 경로 별칭: `@/*` → `src/*` (`tsconfig.app.json`의 `paths`, `vite.config.ts`의 `resolve.alias`)
- `src/services/api.ts` — axios 인스턴스 + 응답 인터셉터 + `ApiError` + `unwrap`
- `src/services/api.types.ts` — `ApiResponse<T>` / `ApiErrorPayload` 공통 봉투 타입
- `src/services/common.type.ts` — 여러 도메인이 함께 쓰는 enum(`Currency`, `AccountType`,
  `AssetClass`, `TransactionType`, `Market` 등), 목록 조회 파라미터, Spring `Page<T>` 타입
- `src/services/queryKeys.ts` — React Query 키 중앙 레지스트리(`qk`)
- `src/services/queryClient.ts` — React Query `QueryClient`, `src/main.tsx`에서
  `QueryClientProvider`로 `AppStateProvider` 바깥을 감싸는 중
- `src/stores/ui.ts` — 전역 로딩 카운터 zustand 스토어(`useUiStore`)
- `VITE_API_BASE_URL` 환경변수로 baseURL 주입 (`.env`에 설정 — `.env`는 git에 커밋되지 않음.
  `import.meta.env` 타입은 `src/vite-env.d.ts`에 선언). **경로 버전 `/api/v1`을 baseURL에
  포함**시키므로 서비스 함수에서는 `/accounts`처럼 버전 없이 씁니다.
  로컬 기본값: `VITE_API_BASE_URL=http://localhost:8080/api/v1`

## Axios 인스턴스 설정 패턴

`src/services/api.ts`에서 인스턴스 하나를 만들어 모든 서비스 함수가 공유합니다.

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 리프레시 토큰이 httpOnly 쿠키로 오가므로 필수 (아래 "인터셉터 사용" 절)
  paramsSerializer: { indexes: null }, // 배열을 sort=a&sort=b로 (아래 "반복 파라미터" 참고)
})
```

**반복 파라미터**: Spring Data의 `Pageable`은 정렬을 `sort=transactionDate,desc&sort=id,desc`처럼
같은 키를 반복해서 받습니다. axios 기본 직렬화는 `sort[]=a&sort[]=b`라 서버가 정렬 조건을 하나도
읽지 못하므로 인스턴스에 `paramsSerializer: { indexes: null }`을 걸어 두었습니다.

**정렬은 항상 명시하세요.** `GET /transactions`에는 서버 기본 정렬이 없어(API-SPEC §6.1) `sort`를
빼면 페이지를 넘길 때 같은 항목이 두 번 나오거나 빠집니다. `transaction.service.ts`의
`DEFAULT_TRANSACTION_SORT`가 2차 정렬 키(`id`)까지 못 박아 두었고, 없는 필드명을 보내면 400이
아니라 **500**이 나므로 정렬 키는 화이트리스트 밖으로 나가면 안 됩니다.

반복되는 요청/응답 가공(에러 메시지 정규화 등)은 개별 서비스 함수가 아니라
`api.interceptors`에서 한 번만 처리합니다.

## API 엔드포인트 네이밍 규칙

- RESTful 리소스 중심: `/{domain}/{action}` (예: `/auth/login`). 버전 프리픽스가 필요하면
  `VITE_API_BASE_URL` 자체에 `/api/v1`을 포함시키거나(권장), 백엔드가 버전을 안 쓰면 생략하세요.
  원본 규칙의 `/api/v1/{domain}/{action}` 하드코딩은 baseURL과 경로에 버전이 중복될 수 있어
  baseURL 쪽으로 옮겼습니다.
- **[조정]** 서비스 함수 이름은 원본의 `POST_login` 스타일(언더스코어 + 대문자 접두)이 아니라
  이 코드베이스의 camelCase 컨벤션(`fmt`, `mkDelta`, `useApplyTheme` 등)을 따라
  `postLogin`, `getCourses`처럼 씁니다.
- React Query 훅은 `use{HttpMethod}{Domain}{Action}` 형태를 유지합니다: `usePostLogin`,
  `useGetCourses`, `usePostPurchaseCreate`.

## Request/Response 타입 정의

- 도메인별 타입은 `src/services/{domain}/{domain}.type.ts`에 `PascalCase` +
  `Request`/`Response` 접미사로 정의합니다 (`CreateAccountRequest`, `AccountResponse`).
- 여러 도메인이 함께 쓰는 enum·파라미터·`Page<T>`는 `src/services/common.type.ts`에 둡니다.
  도메인 폴더끼리는 서로 import하지 않습니다(순환 방지).
- 공통 응답 봉투는 `src/services/api.types.ts`의 `ApiResponse<T>`를 재사용합니다. 실제 서버는
  성공/실패 형태가 다르고, 실패는 `error` 객체 안에 중첩되어 있습니다.

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

- 서비스 함수는 `unwrap`으로 `data`를 꺼냅니다. 204를 돌려주는 DELETE 계열은 `unwrap`을 쓰지
  않습니다.

  ```ts
  export async function getAccounts(params?: AccountListParams) {
    return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
  }
  export async function deleteAccount(accountId: number) {
    await api.delete(`/accounts/${accountId}`) // 204 No Content
  }
  ```

- 응답 스키마 검증이 필요한 도메인은 `zod`로 스키마를 선언하고 `z.infer`로 타입을 뽑아
  씁니다. 모든 도메인에 강제하진 않습니다 — 지금은 zod 스키마를 쓰는 실제 도메인이 아직 없습니다.

  ```ts
  const LoginResponseSchema = z.object({
    accessToken: z.string(),
    profileName: z.string(),
  })
  type LoginResponse = z.infer<typeof LoginResponseSchema>
  ```

- `tsconfig.app.json`이 `verbatimModuleSyntax: true`이므로 타입만 가져올 땐 반드시
  `import type { ... }`을 씁니다(`api.ts`의 `import type { ApiErrorPayload } from './api.types'` 참고).

## 인터셉터 사용 (인증, 에러 처리)

**[상태: 구현됨]** 백엔드가 개발 도중 JWT 인증을 켜면서 모든 API가 인증을 요구하게 됐습니다.
갱신된 `secret/API-SPEC.md` §16이 이제 정식 계약입니다 — 액세스 토큰 30분(`expiresIn: 1800`),
리프레시 토큰은 `refresh_token` httpOnly 쿠키(`Path=/api/v1/auth`, 14일, **rotation**)입니다.
폐기된 리프레시 토큰을 다시 쓰면 서버가 탈취로 보고 **그 유저의 모든 세션을 종료**합니다
(`REFRESH_TOKEN_REUSED`) — 그래서 refresh 호출은 반드시 single-flight여야 합니다.
`src/services/api.ts`에 아래가 모두 구현되어 있습니다.

- **요청 인터셉터**가 `useAuthStore.getState().accessToken`을 읽어 `Authorization: Bearer`
  헤더를 붙입니다. 단, `PUBLIC_PATHS`(로그인·회원가입·코드 발송·refresh·비밀번호 재설정)는
  토큰이 있어도 붙이지 않습니다 — 토큰이 만료된 상태에서 로그인을 다시 시도하는 경우 등을
  방어하기 위함입니다.
- **`INVALID_REFRESH_TOKEN` / `REFRESH_TOKEN_REUSED`는 `POST /auth/refresh` 응답에만 나옵니다**
  (보호된 엔드포인트의 401은 `UNAUTHENTICATED`/`TOKEN_EXPIRED`뿐). 그리고 그 호출은 무한 재귀를
  막으려고 인터셉터가 없는 `refreshClient`로만 나갑니다 — 즉 **응답 인터셉터에서 이 두 코드를
  분기하면 절대 도달하지 않는 죽은 코드**가 됩니다. 구분이 필요하면 재발급이 실패한 자리
  (`api.ts`의 `describeRefreshFailure`)에서 하세요. `REFRESH_TOKEN_REUSED`는 단순 만료가 아니라
  서버가 탈취로 판단해 계정의 모든 세션을 끊은 상태라 사용자 안내 문구가 달라야 합니다.
- **401 응답과 토큰 갱신**은 `refreshAccessToken()`의 단일 비행(single-flight) Promise로
  처리합니다: 첫 401이 `POST /auth/refresh`(쿠키 기반, 바디 없음)를 시작하고, 같은 순간의
  다른 401들은 새로 refresh를 트리거하지 않고 같은 Promise를 기다린 뒤 원래 요청을
  `config._retriedAfterRefresh` 플래그로 **한 번만** 재시도합니다. refresh 자체가 401이면(세션
  만료) 이 인스턴스가 아니라 인터셉터를 달지 않은 별도의 `refreshClient`로 호출해 무한 재귀를
  피하고, 실패 시 `useAuthStore().signOut()`으로 세션을 끊습니다 — `AppShell`이 이를 감지해
  로그인 화면으로 돌려보냅니다.
- `PUBLIC_PATHS`에 해당하는 경로는 401을 받아도 재발급을 시도하지 않습니다(애초에 토큰이
  필요 없는 요청이므로).

지금까지 구현된 것에 더해 **응답 인터셉터의 에러 정규화**도 그대로 유지됩니다. 서버 실패
코드를 호출부에서 분기할 수 있도록 `ApiError`로 감싸 reject합니다:

```ts
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError<ApiErrorPayload>(error)) {
      const payload = error.response?.data
      return Promise.reject(
        new ApiError(
          payload?.error?.code ?? 'NETWORK_ERROR',
          payload?.error?.message ?? error.message,
          error.response?.status,
        ),
      )
    }
    return Promise.reject(error)
  },
)
```

> `responseType: 'blob'` 요청(엑셀 내보내기, API-SPEC §14)은 실패 시 body가 Blob이라 이 인터셉터가
> `code`/`message`를 읽을 수 없습니다. 해당 기능은 이 인스턴스를 쓰지 말고 별도로 처리하세요.

### 로그인 화면 (`src/screens/Auth/`)과의 경계

- `AppShell`은 `useRestoreSession()`(`src/services/auth/auth.hook.ts`)이 돌려주는
  `useAuthStore().status`로 게이팅합니다: `unknown`이면 최소 로딩만, `anonymous`면
  `screens/Auth/Auth.tsx`만, `authenticated`면 기존 화면 트리 전체를 렌더합니다.
  `anonymous`일 때 기존 모달/화면을 마운트하지 않는 이유는 `useGetMe` 등 마운트 즉시 쏘는
  쿼리가 토큰 없이 401을 반복해서 받기 때문입니다.
- 로그인/회원가입/비밀번호 재설정 자체는 `src/services/auth/`의 `usePostLogin` /
  `usePostSignupCode` / `usePostSignup` / `usePostPasswordResetCode` / `usePutPassword` /
  `usePostLogout`을 그대로 씁니다 — 이 도메인만 `services/{domain}` 표준 구조에서 조금
  벗어나 `auth.service.ts`가 요청 인터셉터가 자동으로 건드리지 않는 `PUBLIC_PATHS`를 직접
  호출한다는 점이 다릅니다.

## 에러 핸들링 전략

- 서비스 함수 자체는 try/catch로 감싸지 않습니다 — axios 에러는 위 응답 인터셉터가 이미
  일반 `Error(message)`로 정규화해 던지므로, 호출부(React Query 훅 사용처)에서 한 번만
  처리합니다.
- **[조정]** 원본 규칙은 실패 시 `toast`/`FormMessage`로 사용자에게 안내하라고 하지만, 이
  프로젝트의 `src/components/primitives`에는 아직 토스트/알림 컴포넌트가 없습니다. 토스트
  컴포넌트가 추가되기 전까지는 에러를 상태로 들고 있다가 화면에 직접 렌더링하거나
  `console.error`로만 남기세요. 임의로 토스트 컴포넌트를 새로 만들지 마세요(디자인 시스템
  결정이 필요한 사안 — `secret/ds_rules_v2_5.md` 기준 확인 필요).
- 서버가 내려주는 실패 코드는 `ApiError.code` 값으로 분기 처리합니다(`INSUFFICIENT_HOLDING`,
  `SUBCATEGORY_DUPLICATE_NAME`, `INSTITUTION_HAS_ACTIVE_ACCOUNTS` 등). `err.message`는 이미
  완성된 한국어 문장이므로 기본적으로 그대로 노출하고, 코드 분기는 UX를 바꿔야 할 때만 씁니다.
- **에러가 아닌 실패**를 구분하세요. `FX_RATE_NOT_FOUND`(422), `USER_SETTINGS_NOT_FOUND`(404)는
  "데이터가 아직 없음"에 가까우므로 빨간 에러가 아니라 `var(--text-weak)` 안내문으로 렌더합니다.

## 로딩 상태 관리

- 개별 요청의 로딩 상태는 React Query의 `isPending`/`isFetching`을 그대로 씁니다 — 별도 상태를
  만들지 마세요.
- 화면 전체를 덮는 전역 로딩 표시가 필요할 때만 `src/stores/ui.ts`의 `useUiStore`를
  `onMutate`/`onSettled`에 연결합니다:

  ```ts
  const { startLoading, stopLoading } = useUiStore()

  useMutation({
    mutationFn: postLogin,
    onMutate: startLoading,
    onSettled: stopLoading,
  })
  ```

- `pendingRequests` 카운터 방식이라 동시에 여러 요청이 떠 있어도 마지막 요청이 끝나야
  `isLoading`이 꺼집니다.
- **[조정]** 원본의 `tw-animate-css` 스피너는 이 프로젝트에 Tailwind가 없으므로(CSS 프레임워크
  미사용) 적용하지 않습니다. 로딩 인디케이터 컴포넌트가 필요하면 기존
  `src/components/primitives` 컨벤션에 맞춰 새로 만들고, 이 문서에서 참조를 추가하세요.

## 서비스 폴더 구조

**[조정]** 원본의 `shared/services/{domain}` 대신 이 프로젝트의 기존 `src/{layer}` 평면 구조를
따라 `src/services/{domain}`으로 둡니다.

**파일명은 단수형**(`.hook.ts` / `.type.ts`)입니다 — `docs/code-convention.md`의 "도메인 전용
서비스 파일은 단수형" 규칙을 따릅니다.

```
src/services/
  api.ts                 axios 인스턴스 + 인터셉터 + ApiError + unwrap
  api.types.ts           ApiResponse<T> / ApiErrorPayload 공통 봉투 타입
  common.type.ts         도메인 공용 enum · 목록 파라미터 · Page<T>
  queryKeys.ts           React Query 키 중앙 레지스트리(qk)
  queryClient.ts         React Query QueryClient
  {domain}/
    {domain}.service.ts    api 인스턴스를 직접 사용하는 순수 함수 (getAccounts 등)
    {domain}.hook.ts       useQuery/useMutation으로 위 함수를 감싼 훅 (useGetAccounts 등)
    {domain}.type.ts       Request/Response 타입 (+ 필요 시 zod 스키마)
    index.ts               위 세 파일의 재export
```

도메인 폴더는 백엔드 컨트롤러의 base path와 1:1로 나눕니다(`secret/API-SPEC.md`와 대조하기 쉽게).
예외: 보유 종목은 `/stocks/holdings`로 통합되어 있으므로 `holding` 폴더를 만들지 말고 `stock`
도메인 안에 둡니다.

예시 (`account` 도메인 — 새 도메인을 추가할 때 이 형태를 그대로 따라 하면 됩니다):

```ts
// src/services/account/account.type.ts
import type { AccountType, Currency } from '../common.type'

export interface AccountResponse {
  id: number
  name: string
  type: AccountType
  institutionName: string | null
  balance: number
  currency: Currency
  isLiquid: boolean
  maturityDate: string | null
}

// src/services/account/account.service.ts
import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type { AccountListParams } from '../common.type'
import type { AccountResponse } from './account.type'

export async function getAccounts(params?: AccountListParams) {
  return unwrap(await api.get<ApiResponse<AccountResponse[]>>('/accounts', { params }))
}

// src/services/account/account.hook.ts
import { useQuery } from '@tanstack/react-query'
import { qk } from '../queryKeys'
import type { AccountListParams } from '../common.type'
import { getAccounts } from './account.service'

export function useGetAccounts(params: AccountListParams = {}) {
  return useQuery({ queryKey: qk.account.list(params), queryFn: () => getAccounts(params) })
}

// src/services/account/index.ts
export * from './account.service'
export * from './account.hook'
export * from './account.type'
```

화면에서는 `@/services/account`로 가져다 씁니다:

```ts
import { useGetAccounts } from '@/services/account'
```

## queryKey 규칙

키는 배열 리터럴로 흩뿌리지 말고 `src/services/queryKeys.ts`의 중앙 레지스트리 `qk`만 씁니다.

- 도메인별 팩토리로 쪼개지 않은 이유: 이 백엔드는 잔액·평단·손익을 매 요청마다 원장에서
  재계산합니다. 그래서 거래 1건 등록이 `transaction`·`account`·`asset`·`dashboard`·`goal`을
  동시에 무효화합니다. 도메인별로 나누면 mutation마다 여러 도메인을 cross-import해야 합니다.
- 배열 첫 요소는 도메인 이름(폴더명과 동일), 파라미터는 **마지막 하나의 객체**로 둡니다 —
  prefix 부분 무효화(`invalidateQueries({ queryKey: qk.account.all() })`)를 유지하기 위함입니다.
- **정산월에 의존하는 쿼리는 `{ year, month }`를 키에 반드시 포함**합니다. 이 앱의 "월"은 사용자
  설정 `monthStartDay`(1~28) 기준 정산월이라 달력 1일과 다를 수 있습니다.
- 화면 컴포넌트는 `qk`를 직접 import하지 않습니다 — 훅 안에 캡슐화합니다.
- `staleTime`은 도메인별로 오버라이드합니다: 시장 지표 30초(외부 실시간 조회라 느림),
  카테고리·금융기관 5분(마스터성), 나머지는 `queryClient.ts`의 기본값 30초.

## 요약

| 항목 | 상태 |
|---|---|
| axios 인스턴스, `ApiError` 정규화, `unwrap` | 구현됨 (`src/services/api.ts`) |
| 공통 봉투 타입 / 도메인 공용 enum | 구현됨 (`api.types.ts`, `common.type.ts`) |
| queryKey 중앙 레지스트리 `qk` | 구현됨 (`src/services/queryKeys.ts`) |
| React Query `QueryClient` + Provider 연결 | 구현됨 (`src/services/queryClient.ts`, `src/main.tsx`) |
| 전역 로딩 zustand 스토어 | 구현됨 (`src/stores/ui.ts`) |
| `@/` 경로 별칭 | 구현됨 (`tsconfig.app.json`, `vite.config.ts`) |
| 인증 헤더 부착 / refresh token 큐 | 구현됨 (`src/services/api.ts`, `src/stores/auth.ts`) |
| 도메인 서비스 폴더(`{domain}.service/hook/type.ts`) | 도메인별로 순차 추가 중 |
| 토스트/알림 UI 연동 | 보류 — 디자인 시스템 컴포넌트 필요, 확인 후 결정 |
| 엑셀 내보내기(blob 응답) | 미구현 — 공용 axios 인스턴스를 쓰면 안 됨(위 인터셉터 절 참고) |
