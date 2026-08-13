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

// "이 브라우저에서 로그인한 적이 있는가"만 기억하는 불리언 힌트. 토큰이 아니라 민감정보가
// 아니므로 localStorage에 둬도 안전하다 — 부팅 시 refresh 응답을 기다릴지(재방문자) 곧바로
// 로그인 화면을 보여줄지(첫 방문자) 가르는 용도로만 쓴다. 접근이 막힌 환경(사파리 프라이빗 등)
// 에서 예외가 나도 앱이 죽으면 안 되므로 전부 try/catch로 감싼다.
const SEEN_SESSION_KEY = 'monit.seenSession'

export function hasSeenSession(): boolean {
  try {
    return window.localStorage.getItem(SEEN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markSeenSession(): void {
  try {
    window.localStorage.setItem(SEEN_SESSION_KEY, '1')
  } catch {
    // 접근 불가(프라이빗 브라우징 등)면 그냥 매번 대기 화면을 건너뛰게 둔다 — 치명적이지 않다.
  }
}

function clearSeenSession(): void {
  try {
    window.localStorage.removeItem(SEEN_SESSION_KEY)
  } catch {
    // 위와 동일하게 무시한다.
  }
}

interface AuthStore {
  accessToken: string | null
  status: AuthStatus
  /**
   * 사용자가 직접 시작한 로그인/가입이 진행 중인가. 첫 방문자에게는 refresh 응답을 기다리지 않고
   * 로그인 화면을 먼저 띄우기 때문에(AppShell), 그 화면에서 A 계정으로 로그인하는 도중에
   * 백그라운드 refresh가 예전 쿠키(B 계정)로 성공하는 경쟁이 실제로 가능하다. 이 플래그가 서 있는
   * 동안에는 refresh가 신원을 덮어쓰지 못하게 한다 — 사용자의 명시적 행동이 항상 이긴다.
   */
  manualAuthPending: boolean
  /**
   * 사용자가 직접 로그인/로그아웃할 때마다 증가하는 세대 번호. refresh는 요청을 시작할 때의
   * 세대를 기억해 뒀다가, 응답이 돌아왔을 때 세대가 그대로일 때만 결과를 반영한다.
   * 이 값이 없으면 "로그인 성공(A) → 뒤늦게 도착한 refresh 응답(B)"이 신원을 덮어쓴다.
   */
  authGeneration: number
  /** 로그인/가입 폼 제출 직전에 호출 */
  beginManualAuth: () => void
  /** 로그인/가입이 실패로 끝났을 때 호출(성공 시엔 signIn이 알아서 내린다) */
  endManualAuth: () => void
  /** 로그인·회원가입 성공 시 호출 — 사용자의 명시적 행동 */
  signIn: (accessToken: string) => void
  /**
   * refresh 응답을 반영한다. 부팅 시 세션 복원과 세션 중 토큰 재발급 둘 다 이 경로를 쓴다.
   * @param startedAtGeneration refresh **요청을 시작할 때** 읽어둔 authGeneration
   * @returns 실제로 반영됐는지(세대가 바뀌었거나 수동 로그인 중이면 false)
   */
  applyRefreshedToken: (accessToken: string, startedAtGeneration: number) => boolean
  /** 로그아웃, 또는 재발급까지 실패해 세션이 끝났을 때 호출 */
  signOut: () => void
  /**
   * 부팅 시 refresh로 세션을 되찾지 못했을 때.
   * @param sessionInvalid 서버가 세션 무효(401/403)라고 **명확히 답한** 경우에만 true.
   *   타임아웃·네트워크 오류·5xx는 "모름"이므로 false여야 한다 — 그때 힌트를 지워버리면
   *   지하철처럼 잠깐 느린 곳에서 앱을 연 것만으로 멀쩡한 세션의 힌트가 날아간다.
   */
  markAnonymous: (options?: { sessionInvalid?: boolean }) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  status: 'unknown',
  manualAuthPending: false,
  authGeneration: 0,
  beginManualAuth: () => set({ manualAuthPending: true }),
  endManualAuth: () => set({ manualAuthPending: false }),
  signIn: (accessToken) => {
    markSeenSession()
    set((s) => ({
      accessToken,
      status: 'authenticated',
      manualAuthPending: false,
      authGeneration: s.authGeneration + 1,
    }))
  },
  applyRefreshedToken: (accessToken, startedAtGeneration) => {
    const s = get()
    // 요청이 나간 뒤 사용자가 직접 로그인/로그아웃했다면 그 결과가 우선이다.
    if (s.authGeneration !== startedAtGeneration) return false
    // 폼 제출과 응답 도착 사이 구간. 아직 세대는 안 바뀌었지만 곧 바뀔 것이므로, 잠깐이라도
    // 다른 계정으로 앱이 그려지지 않게 여기서 막는다.
    if (s.manualAuthPending) return false
    markSeenSession()
    set({ accessToken, status: 'authenticated' })
    return true
  },
  signOut: () => {
    clearSeenSession()
    set((s) => ({
      accessToken: null,
      status: 'anonymous',
      manualAuthPending: false,
      authGeneration: s.authGeneration + 1,
    }))
  },
  markAnonymous: (options) => {
    // 이미 로그인된 상태를 끌어내리지 않는다. 로그인 화면을 먼저 띄우는 구조 때문에
    // "수동 로그인 성공 → 뒤늦게 부팅 refresh 실패"가 실제로 발생하는데, 그때 여기서
    // 상태를 내리면 방금 로그인한 사용자가 튕긴다. 강제 로그아웃은 signOut의 몫이다.
    if (get().status === 'authenticated') return
    if (options?.sessionInvalid) clearSeenSession()
    set({ accessToken: null, status: 'anonymous' })
  },
}))
