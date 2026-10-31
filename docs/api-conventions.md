# 데이터 접근 컨벤션 (supabase-js + React Query)

프론트가 서버 데이터를 읽고 쓰는 규칙입니다. 전체 폴더 구조는 `docs/architecture.md`, 상태 경계는
`docs/state-management.md`, 백엔드(DB 함수·Edge Function) 쪽 정본은 `supabase/README.md`를 보세요.

> **백엔드 계약의 정본은 `supabase/migrations/*.sql`과 `supabase/functions/*`입니다.** 응답 모양은 함수 본문의
> `jsonb_build_object`(camelCase, 스프링 `*Res`와 같은 이름)에서, 오류 코드와 문구는 `src/services/errorMessages.ts`
> 사전에서 확인하세요. 별도 API 스펙 문서는 만들지 않습니다. 여기에도 없는 세부는 추측하지 말고 사용자에게 확인하세요.

## 설치된 것 / 설정된 것

- 의존성: `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `zod`(설치만), `xlsx`(SheetJS — 엑셀, 지연 로드)
- 경로 별칭: `@/*` → `src/*` (`tsconfig.app.json`의 `paths`, `vite.config.ts`의 `resolve.alias`)
- `src/services/supabase.ts` — Supabase 클라이언트 **하나**(`supabase`) + `rpc()` / `invoke()` 래퍼 + `currentUserId()` +
  `unwrapResult()` + 세션 저장소(`sessionAwareStorage`, 로그인 유지 여부에 따라 localStorage/sessionStorage)
- `src/services/supabaseError.ts` — PostgREST·Auth·Edge Function·네트워크 오류 → `ApiError(code, message, status)`
- `src/services/errorMessages.ts` — 오류 코드 → 한국어 문구·HTTP 상태 사전(`errorMessageOf`, `errorStatusOf`). **문구 정본**
- `src/services/api.ts` — `ApiError` 타입(화면이 `code`로 분기)
- `src/services/priceRefresh.ts` — 매매·연동 직후 시세·환율 즉시 수집(실패는 삼킨다, 배치가 다음 시각에 채운다)
- `src/services/common.type.ts` — 여러 도메인이 함께 쓰는 enum(`Currency`, `AccountType`, `AssetClass`, `TransactionType`,
  `Market` 등), 목록 조회 파라미터, `Page<T>`
- `src/services/queryKeys.ts` — React Query 키 중앙 레지스트리(`queryKeys`)
- `src/services/queryClient.ts` — `QueryClient`. `src/main.tsx`에서 `QueryClientProvider`로 `AppStateProvider` 바깥을 감쌉니다.

### 환경변수와 로컬 스택

- `VITE_SUPABASE_URL`·`VITE_SUPABASE_PUBLIC_KEY`(`src/vite-env.d.ts`, Publishable 키 `sb_publishable_…`) 두 개뿐입니다. 옛 이름
  `VITE_SUPABASE_ANON_KEY`도 이미 만든 `.env.local`을 위해 잠시 같이 읽습니다(2026-10-31 이름 변경). `.env.local`(gitignore됨)에 두고, 키 목록은
  `.env.example`에 있습니다. 비어 있으면 `supabase.ts`가 부팅 때 바로 예외를 던집니다(조용히 깨지지 않게).
- **개발(`pnpm dev`)**: 기본은 로컬 도커 스택(`supabase start`, `http://127.0.0.1:54321`). 프록시는 없습니다 — 브라우저가 supabase-js로
  직접 부릅니다(CORS는 Supabase가 허용). 가입·비밀번호 찾기 코드 메일은 Mailpit(`http://127.0.0.1:54324`)에서 봅니다.
  시세·환율·탈퇴·연동 동기화는 Edge Function이라 `supabase functions serve --env-file supabase/functions/.env`를 함께 띄웁니다.
- **운영 프로젝트로 봐야 할 때만** `.env.local`의 두 값을 운영 것으로 바꿉니다. 그때 등록·삭제는 운영 데이터를 실제로 바꾸니
  테스트 계정으로 쓰세요. `.env.development` 같은 커밋되는 env 파일은 만들지 않습니다.
- anon 키는 공개 가능한 값입니다 — 데이터 접근은 RLS가 막습니다. **service role 키는 Edge Function 안에서만** 쓰고 프론트에
  절대 넣지 않습니다.

## 어디로 부를지 — RPC · 테이블 · Edge Function

| 일 | 수단 | 예 |
|---|---|---|
| 계산이 들어간 읽기(잔액·보유·손익·집계·대시보드·목록 Page) | **DB 함수(RPC)** `rpc<T>('get_…' \| 'list_…', { p_… })` | `get_accounts`, `list_transactions`, `get_dashboard_summary` |
| 단순 목록·마스터 | **테이블 직접 읽기**(RLS가 내 행만) `supabase.from('…').select()` | `institutions`, `account_connections_masked`(뷰) |
| 한 행 쓰기(규칙은 트리거가 검증) | **테이블 직접 쓰기** `insert/update/delete` + 응답은 `get_…` RPC로 재조회 | `transactions`, `subcategories`, `recurring_expenses` |
| 여러 행을 한 트랜잭션으로(계좌 등록+초기잔액, 매매+정산, 환전, 잔액 정정, 공유 연결·공유 계좌, 연동 등록) | **쓰기 RPC** `rpc('create_…' \| 'adjust_…' \| '…_share…' \| 'set_shared_accounts')` | `create_account`, `create_trade`, `invite_share` |
| 외부 API·관리자 권한·시크릿이 필요한 일 | **Edge Function** `invoke<T>(name, { body })` | `collect-stock-prices`, `market-indices`, `withdraw`, `connections` |
| 새 알림 받기 | **Realtime** `postgres_changes`(INSERT, RLS + `user_id` 필터) | `useNotificationStream` |
| 인증 | `supabase.auth.*` (가입·로그인·코드 확인·비밀번호·로그아웃) | `auth.service.ts` |

- 읽기 응답은 함수가 만든 camelCase jsonb를 **그대로** 씁니다(TS 매퍼를 두지 않는다). 테이블을 직접 읽는 곳은 snake_case 열을
  서비스 함수 안에서 한 번만 camelCase로 바꿉니다(`account_connections_masked` → `ConnectionResponse`).
- 쓰기 응답은 TS에서 조립하지 않고 **DB 재조회**(`get_transaction`, `list_subscriptions`)로 만듭니다 — `*Res`를 만드는 곳이 DB 한 곳이게.
- 사용자 식별은 서버가 `auth.uid()`로 합니다. 프론트는 insert에 `user_id: await currentUserId()`를 채울 뿐 다른 사람의 id를 보내지 않습니다.
- `rpc()`의 인자 이름은 함수 시그니처의 `p_` 접두 그대로(`p_account_id`), 복합 입력은 `p: { … }` jsonb 하나.
- `invoke()`는 로그인 사용자의 JWT를 자동으로 싣습니다(`verify_jwt`). Edge Function 오류 본문은 `{ error: { code, message } }`로 고정.

## 함수·훅 네이밍

- 서비스 함수는 스프링 때 이름 그대로 camelCase `{httpMethod}{Resource}`: `getAccounts`, `postAccount`, `deleteAccount`
  (호출부·훅이 바뀌지 않도록 — 안쪽만 supabase-js).
- React Query 훅은 `use{HttpMethod}{Domain}{Action}`: `useGetAccounts`, `usePostLogin`, `usePatchUserSettings`.
  요청 하나에 대응하지 않는 훅은 동작 이름(`useRestoreSession`, `useNotificationStream`, `useCompleteSignupOnboarding`).

## Request/Response 타입

- 도메인 타입은 `src/services/{domain}/{domain}.type.ts`에 `PascalCase` + `Request`/`Response` 접미사(`CreateAccountRequest`,
  `AccountResponse`). 모양은 DB 함수의 jsonb(= 스프링 `*Res`)와 같습니다.
- 여러 도메인이 함께 쓰는 enum·파라미터·`Page<T>`는 `common.type.ts`. 도메인 폴더끼리는 서로 import하지 않습니다(순환 방지).
- id 타입: 사용자 id는 `string`(uuid), 나머지(계좌·거래·종목 등)는 `number`(bigint identity).
- `verbatimModuleSyntax: true`이므로 타입만 가져올 땐 `import type { ... }`.
- `zod`는 설치만 되어 있고 쓰는 도메인은 없습니다(필요한 도메인이 생기면 그때).

## 인증

세션(액세스·리프레시 토큰)은 Supabase 클라이언트가 보관·갱신하고 요청마다 자동으로 싣습니다. 앱 store(`src/stores/auth.ts`)는
`status`·`userId`만 듭니다. 흐름·게이팅·경쟁 조건은 `docs/state-management.md` "인증" 절.

- 로그인 유지(`rememberMe`)는 `setRememberMe()` → 세션을 localStorage(유지) / sessionStorage(탭 닫으면 끝)에 둡니다.
- 가입은 `signUp(options.data = { name, agreements })` → DB 트리거가 프로필·약관·기본 소분류를 만들고 → 6자리 코드 메일 →
  `verifyOtp` → 온보딩 → `signIn`. 코드·재전송·비밀번호 찾기도 전부 `supabase.auth`.
- 탈퇴는 Edge Function `withdraw`(사용자 권한 `withdraw_me` + service role로 Auth 차단 + 전 기기 로그아웃)를 한 번 부릅니다.
- Supabase Auth 오류 코드(`invalid_credentials`, `user_banned`, `email_exists`, `otp_expired` …)는 `supabaseError.ts`의
  `AUTH_CODE_MAP`이 스프링 코드(`INVALID_CREDENTIALS`, `WITHDRAWN_ACCOUNT`, `DUPLICATE_EMAIL`, `INVALID_VERIFICATION_CODE` …)로 바꿉니다 —
  화면의 분기 이름을 유지하기 위해서입니다.
- **로그아웃·로그인 시 캐시**: `auth.hook.ts`가 `queryClient.clear()`로 이전 사용자 캐시를 비우고, `AppShell`이 인터랙션 상태(AppState)를
  처음 값으로 되돌립니다(기기 설정인 테마·대시보드 배치·알림 방식은 남김).

## 오류 처리

- 서비스 함수는 try/catch로 감싸지 않습니다. `rpc()`/`unwrapResult()`/`invoke()`가 모든 실패를 `ApiError`로 바꾸므로 호출부(훅 사용처)에서
  한 번만 처리합니다.
- 코드 → 문구는 `errorMessages.ts` 사전이 정본입니다. DB 함수·트리거는 `raise exception '<코드>'`라 PostgREST `message`가 곧 코드이고
  (`supabaseError.toApiError`), SQLSTATE만 오는 경우(`23505` 등)는 `SQLSTATE_MAP`으로 공용 코드(`DUPLICATE` 등)가 됩니다 — 도메인 코드가
  필요하면 서비스 함수가 바꿉니다(`connection.service.ts`의 `CONNECTION_DUPLICATE`, `category.service.ts`의 `SUBCATEGORY_DUPLICATE_NAME`).
- `err.message`는 완성된 한국어 문장이라 기본적으로 그대로 노출하고, UX를 바꿔야 할 때만 `ApiError.code`로 분기합니다
  (`INSUFFICIENT_HOLDING`, `CONNECTION_INVALID_CREDENTIALS` 등).
- **에러가 아닌 실패**를 구분하세요. `FX_RATE_NOT_FOUND`(422)는 "환율 데이터가 아직 없음"이라 빨간 에러가 아니라 `var(--text-weak)` 안내문으로
  렌더하고(`isExchangeRateMissing`), `ensureFxRatesOnce()`로 세션당 1회 환율 수집을 요청합니다.
- **재시도**(`queryClient.ts`): 4xx는 다시 보내도 결과가 같아 재시도하지 않고, 5xx·네트워크 오류만 1회 재시도합니다.
- 토스트/알림 프리미티브는 없습니다. 에러는 상태로 들고 있다가 그 자리에 렌더합니다.

## 로딩 상태

- React Query의 `isPending`/`isFetching`을 그대로 씁니다 — 별도 로딩 상태나 전역 로딩 카운터 스토어를 만들지 마세요.
- 화면 전체를 덮는 로딩 오버레이는 없습니다. 카드·모달 단위로 그 자리에서 표시합니다(`Skeleton`, `aria-busy`, 값 자리의 `—`).
- 페이지를 넘길 때 이전 페이지를 유지해야 하는 목록은 `placeholderData: keepPreviousData`(`useGetTransactions`).

## 파일 주고받기 (엑셀)

- 엑셀 파일은 **앱이 만들고 읽습니다**(SheetJS, `src/utils/xlsx/` — 처음 쓸 때만 내려받는 별도 청크). 검증·이름 매칭·전체 롤백은 DB 함수
  `import_transactions`·`import_accounts`가, 내보내기 행은 `export_*`가 돌려줍니다. 저장은 `saveFile`(`src/utils/saveFile.ts` — 브라우저는
  다운로드, 데스크톱 앱은 저장 창). 계약은 `docs/excel-import.md`.

## 서비스 폴더 구조

파일명은 단수형(`.hook.ts` / `.type.ts`)입니다(`docs/code-convention.md`).

```
src/services/
  supabase.ts            클라이언트 + rpc/invoke/currentUserId/unwrapResult + 세션 저장소
  supabaseError.ts       Supabase 오류 → ApiError
  errorMessages.ts       오류 코드 → 문구·상태 사전(정본)
  api.ts                 ApiError
  priceRefresh.ts        시세·환율 즉시 수집
  common.type.ts         도메인 공용 enum · 목록 파라미터 · Page<T>
  queryKeys.ts           React Query 키 중앙 레지스트리
  queryClient.ts         QueryClient(기본 staleTime·retry)
  {domain}/
    {domain}.service.ts    supabase 를 쓰는 순수 함수 (getAccounts 등)
    {domain}.hook.ts       useQuery/useMutation으로 감싼 훅 (useGetAccounts 등)
    {domain}.type.ts       Request/Response 타입
    index.ts               위 세 파일 재export
```

현재 도메인 19개: `auth` `user` `institution` `account` `asset` `category` `transaction` `subscription` `stock` `trade` `exchange`
`marketIndex` `goal` `dashboard` `notification` `export` `import` `connection` `share`.

도메인 폴더끼리 import하지 않습니다(예외 없음 — 가족·커플 공유 v17의 `share`는 연결·초대 코드·공유 계좌 설정만 다루고, 공유 계좌의
이름·잔액은 `account`의 `get_accounts({ scope: 'SHARED' })`로 받습니다). 공유 알림이 오면 범위 쿼리를 다시 받는 일은 `notification`이
`queryKeys`만으로 처리합니다. 타입·값(함수·훅) 모두 다른 도메인에서 가져오지 않습니다. 다른 도메인의 데이터가 값으로 필요하면 같은 RPC를 직접 부릅니다
(`import.service.ts`가 `get_accounts`·`get_categories`를 부르듯이).

예시(`account` — 새 도메인은 이 형태를 따릅니다):

```ts
// account.service.ts
import { rpc } from '../supabase'
import type { AccountListParams } from '../common.type'
import type { AccountResponse } from './account.type'

export async function getAccounts(params: AccountListParams = {}) {
  return rpc<AccountResponse[]>('get_accounts', {
    p_type: params.type ?? null,
    p_institution_id: params.institutionId ?? null,
    p_include_closed: false,
  })
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

- 한 파일에 모은 이유: DB가 잔액·평단·손익을 매 요청 원장에서 재계산하므로 거래 1건 등록이 `transaction`·`account`·`asset`·`dashboard`·`goal`을
  함께 무효화합니다. 도메인별로 나누면 mutation마다 cross-import가 생깁니다.
- 배열 첫 요소는 도메인 이름(폴더명과 동일), 파라미터는 **마지막 하나의 객체**로 둡니다 — prefix 부분 무효화(`queryKeys.account.all()`)를 위해.
- **정산월에 의존하는 쿼리는 `{ year, month }`를 키에 반드시 포함**합니다. "이번 달"은 달력 월이 아니라 `useCurrentSettlementMonth()`
  (`get_current_settlement`)로 잡습니다.
- 화면 컴포넌트는 `queryKeys`를 직접 import하지 않습니다 — 훅 안에 캡슐화합니다.
- `staleTime` 기본값은 30초(`queryClient.ts`)이고, 마스터성 데이터만 늘립니다: 카테고리·금융기관·내 정보·사용자 설정 5분, 섹터 1시간,
  현재 정산월·목표 미리보기 1분.
