import { create } from 'zustand'

// 액세스 토큰은 메모리에만 둔다(localStorage/sessionStorage 사용 안 함).
// 저장소에 넣으면 XSS 한 번으로 토큰이 통째로 새어나가고, 만료 관리도 직접 해야 한다.
// 대신 서버가 리프레시 토큰을 httpOnly 쿠키로 관리하므로(POST /auth/refresh가 요청 바디를 받지
// 않는다), 새로고침 후에는 부팅 시 refresh를 한 번 호출해 액세스 토큰을 다시 받는다.
//
// status
//   'unknown'       — 부팅 직후. 아직 refresh를 시도하지 않아 로그인 상태를 모른다.
//   'authenticated' — 유효한 액세스 토큰이 있다.
//   'anonymous'     — 로그인하지 않았거나 세션이 끝났다.
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

interface AuthStore {
  accessToken: string | null
  status: AuthStatus
  /** 로그인·회원가입·토큰 재발급 성공 시 호출 */
  signIn: (accessToken: string) => void
  /** 로그아웃, 또는 재발급까지 실패해 세션이 끝났을 때 호출 */
  signOut: () => void
  /** 부팅 시 refresh를 시도했으나 세션이 없었을 때 */
  markAnonymous: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  status: 'unknown',
  signIn: (accessToken) => set({ accessToken, status: 'authenticated' }),
  signOut: () => set({ accessToken: null, status: 'anonymous' }),
  markAnonymous: () => set({ accessToken: null, status: 'anonymous' }),
}))
