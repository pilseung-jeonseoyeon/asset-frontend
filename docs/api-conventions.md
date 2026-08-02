# API 통신 컨벤션

이 문서는 axios + React Query 기반 API 통신 규칙입니다. 다른 프로젝트(Next.js/Cursor)에서 쓰던
규칙을 이 저장소(Vite + React 19, 라우터 없음, `state.screen` 기반 화면 전환) 구조에 맞게 옮긴
것입니다. 원본과 다르게 조정한 부분은 각 절에 표시해두었습니다.

> 이 문서 작성 시점 기준으로 실제 백엔드 연동은 아직 없습니다. 모든 화면 데이터는 여전히
> `src/data/mock*.ts`입니다(`CLAUDE.md` 참고). 아래 인프라(axios 인스턴스, React Query,
> zustand 로딩 스토어, 경로 별칭)는 실제로 설치·구성되어 있지만, **도메인 서비스 폴더는 아직
> 하나도 없습니다** — 실제 API 연동을 시작할 때 이 문서의 "서비스 폴더 구조" 절을 따라 만드세요.

## 설치된 것 / 설정된 것

- 의존성: `axios`, `@tanstack/react-query`, `zustand`, `zod` (`package.json`)
- 경로 별칭: `@/*` → `src/*` (`tsconfig.app.json`의 `paths`, `vite.config.ts`의 `resolve.alias`)
- `src/services/api.ts` — axios 인스턴스 + 공통 응답 인터셉터
- `src/services/api.types.ts` — `ApiResponse<T>` 공통 응답 타입
- `src/services/queryClient.ts` — React Query `QueryClient`, `src/main.tsx`에서
  `QueryClientProvider`로 `AppStateProvider` 바깥을 감싸는 중
- `src/stores/ui.ts` — 전역 로딩 카운터 zustand 스토어(`useUiStore`)
- `VITE_API_BASE_URL` 환경변수로 baseURL 주입 (`.env`에 설정 — `.env`는 git에 커밋되지 않음.
  `import.meta.env` 타입은 `src/vite-env.d.ts`에 선언)

## Axios 인스턴스 설정 패턴

`src/services/api.ts`에서 인스턴스 하나를 만들어 모든 서비스 함수가 공유합니다.

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false, // 쿠키 기반 인증이 필요해지면 true로 전환
})
```

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

- 도메인별 타입은 `src/services/{domain}/{domain}.types.ts`에 `PascalCase` +
  `Request`/`Response` 접미사로 정의합니다 (`LoginRequest`, `LoginResponse`).
- 공통 응답 봉투는 `src/services/api.types.ts`의 `ApiResponse<T>`를 재사용합니다.

  ```ts
  export interface ApiResponse<T> {
    success: boolean
    code: string
    message: string
    data: T
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

**[상태: 문서화만 — 아직 구현하지 않음]** `CLAUDE.md`에 명시된 대로 이 앱은 단일 하드코딩
사용자이며 인증/로그인 개념이 없습니다("원본 프로토타입의 인증 플로우는 이번 포팅 범위에서
명시적으로 제외"). 따라서 지금 `useAuthStore`나 `Authorization: Bearer` 헤더 부착, refresh
token 재인증 큐를 실제로 구현하지 않았습니다. 인증이 실제로 도입되면:

- 요청 인터셉터에서 인증 스토어의 `accessToken`을 읽어 `Authorization: Bearer` 헤더를 붙입니다.
  붙이는 지점은 `src/services/api.ts`의 주석(`// 인증이 도입되면 여기서...`)으로 표시해뒀습니다.
- 401 응답과 토큰 갱신은 동시 요청에도 갱신이 한 번만 일어나도록 큐 패턴으로 처리합니다
  (첫 401이 갱신을 시작하고, 갱신이 끝날 때까지 뒤따르는 401들은 같은 Promise를 기다림).

지금 실제로 구현된 것은 **응답 인터셉터의 에러 정규화**뿐입니다 (`src/services/api.ts`):

```ts
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError<ApiErrorPayload>(error)) {
      const message = error.response?.data?.message ?? error.message
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  },
)
```

## 에러 핸들링 전략

- 서비스 함수 자체는 try/catch로 감싸지 않습니다 — axios 에러는 위 응답 인터셉터가 이미
  일반 `Error(message)`로 정규화해 던지므로, 호출부(React Query 훅 사용처)에서 한 번만
  처리합니다.
- **[조정]** 원본 규칙은 실패 시 `toast`/`FormMessage`로 사용자에게 안내하라고 하지만, 이
  프로젝트의 `src/components/primitives`에는 아직 토스트/알림 컴포넌트가 없습니다. 토스트
  컴포넌트가 추가되기 전까지는 에러를 상태로 들고 있다가 화면에 직접 렌더링하거나
  `console.error`로만 남기세요. 임의로 토스트 컴포넌트를 새로 만들지 마세요(디자인 시스템
  결정이 필요한 사안 — `secret/ds_rules_v2_5.md` 기준 확인 필요).
- 서버가 내려주는 실패 코드는 `ApiResponse.code` 값으로 분기 처리합니다(권한 부족, 잔액 부족 등
  도메인별 케이스).

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

```
src/services/
  api.ts                 axios 인스턴스 + 공통 인터셉터
  api.types.ts           ApiResponse<T> 등 공통 타입
  queryClient.ts          React Query QueryClient
  {domain}/
    {domain}.service.ts    api 인스턴스를 직접 사용하는 순수 함수 (postLogin, getCourses 등)
    {domain}.hooks.ts       useMutation/useQuery로 위 함수를 감싼 훅 (usePostLogin 등)
    {domain}.types.ts       Request/Response 타입 (+ 필요 시 zod 스키마)
    index.ts                 위 세 파일의 재export
```

예시 (아직 실제로 존재하지 않는 `auth` 도메인 기준 — 도메인을 새로 추가할 때 이 형태를 그대로
따라 하면 됩니다):

```ts
// src/services/auth/auth.types.ts
export interface LoginRequest {
  email: string
  password: string
}
export interface LoginResponse {
  accessToken: string
  profileName: string
}

// src/services/auth/auth.service.ts
import { api } from '../api'
import type { ApiResponse } from '../api.types'
import type { LoginRequest, LoginResponse } from './auth.types'

export async function postLogin(body: LoginRequest) {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', body)
  return data.data
}

// src/services/auth/auth.hooks.ts
import { useMutation } from '@tanstack/react-query'
import { postLogin } from './auth.service'

export function usePostLogin() {
  return useMutation({ mutationFn: postLogin })
}

// src/services/auth/index.ts
export * from './auth.service'
export * from './auth.hooks'
export * from './auth.types'
```

화면에서는 `@/services/auth`로 가져다 씁니다:

```ts
import { usePostLogin } from '@/services/auth'
```

## 요약

| 항목 | 상태 |
|---|---|
| axios 인스턴스, 응답 인터셉터 에러 정규화 | 구현됨 (`src/services/api.ts`) |
| React Query `QueryClient` + Provider 연결 | 구현됨 (`src/services/queryClient.ts`, `src/main.tsx`) |
| 전역 로딩 zustand 스토어 | 구현됨 (`src/stores/ui.ts`) |
| `@/` 경로 별칭 | 구현됨 (`tsconfig.app.json`, `vite.config.ts`) |
| 인증 헤더 부착 / refresh token 큐 | 문서화만 — 인증 도입 전까지 미구현 |
| 도메인 서비스 폴더(`{domain}.service/hooks/types.ts`) | 패턴만 정의, 실제 도메인 폴더 없음 |
| 토스트/알림 UI 연동 | 보류 — 디자인 시스템 컴포넌트 필요, 확인 후 결정 |
