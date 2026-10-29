import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'

// 인증 상태 store. 토큰은 여기 두지 않는다 — Supabase 클라이언트(src/services/supabase.ts)가 세션(액세스·리프레시 토큰)을
// 직접 보관하고 갱신한다. 이 store 는 "지금 인증되어 있는가"와 "누구인가(userId)"만 들고, AppShell 의 게이팅과
// 공유 작성자 배지·Realtime 필터가 참조한다.
//
// status
// 'unknown' — 부팅 직후. 저장된 세션을 아직 읽지 않아 로그인 상태를 모른다.
// 'authenticated' — 유효한 세션이 있다.
// 'anonymous' — 로그인하지 않았거나 세션이 끝났다.
export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

// "이 브라우저에서 로그인한 적이 있는가"만 기억하는 불리언 힌트. 토큰이 아니라 민감정보가
// 아니므로 localStorage에 둬도 안전하다 — 부팅 시 세션 복원을 기다릴지(재방문자) 곧바로
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
  status: AuthStatus
  /** 로그인한 사용자 id(uuid 문자열). 거래 작성자 배지(createdBy 비교)·알림 Realtime 필터에 쓴다. */
  userId: string | null
  /**
   * 사용자가 직접 시작한 로그인/가입/비밀번호 재설정이 진행 중인가. 첫 방문자에게는 세션 복원을 기다리지 않고
   * 로그인 화면을 먼저 띄우기 때문에(AppShell), 그 화면에서 A 계정으로 로그인하는 도중에 저장돼 있던 다른
   * 세션(B 계정)이 복원되는 경쟁이 가능하다. 또 가입 3단계(코드 확인)·비밀번호 재설정은 Supabase 가 세션을
   * 만들어 SIGNED_IN 을 쏘지만 아직 '로그인 상태'로 올리면 안 되는 구간이다(온보딩을 보여 줘야 한다).
   * 이 플래그가 서 있는 동안에는 자동 복원·자동 SIGNED_IN 이 신원을 덮어쓰지 못한다 — 사용자의 명시적 행동이 항상 이긴다.
   */
  manualAuthPending: boolean
  /**
   * 사용자가 직접 로그인/로그아웃할 때마다 증가하는 세대 번호. 세션 복원은 요청을 시작할 때의
   * 세대를 기억해 뒀다가, 응답이 돌아왔을 때 세대가 그대로일 때만 결과를 반영한다.
   * 이 값이 없으면 "로그인 성공(A) → 뒤늦게 도착한 복원 응답(B)"이 신원을 덮어쓴다.
   */
  authGeneration: number
  /** 로그인/가입/재설정 폼 제출 직전에 호출 */
  beginManualAuth: () => void
  /** 로그인/가입/재설정이 실패로 끝났을 때 호출(성공 시엔 signIn이 알아서 내린다) */
  endManualAuth: () => void
  /** 로그인·회원가입(온보딩 완료) 성공 시 호출 — 사용자의 명시적 행동 */
  signIn: (session: Session) => void
  /**
   * 저장돼 있던 세션(부팅 복원)이나 Supabase 가 알려 온 세션 갱신(TOKEN_REFRESHED·USER_UPDATED)을 반영한다.
   * @param startedAtGeneration 복원 **요청을 시작할 때** 읽어둔 authGeneration
   * @returns 실제로 반영됐는지(세대가 바뀌었거나 수동 인증 중이면 false)
   */
  applyRestoredSession: (session: Session, startedAtGeneration: number) => boolean
  /** 로그아웃, 또는 세션 갱신까지 실패해 세션이 끝났을 때 호출 */
  signOut: () => void
  /**
   * 부팅 시 저장된 세션을 찾지 못했을 때.
   * @param sessionInvalid 세션이 **확실히 없거나 무효**라고 확인된 경우에만 true.
   * 타임아웃·네트워크 오류는 "모름"이므로 false여야 한다 — 그때 힌트를 지워버리면
   * 지하철처럼 잠깐 느린 곳에서 앱을 연 것만으로 멀쩡한 세션의 힌트가 날아간다.
   */
  markAnonymous: (options?: { sessionInvalid?: boolean }) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'unknown',
  userId: null,
  manualAuthPending: false,
  authGeneration: 0,
  beginManualAuth: () => set({ manualAuthPending: true }),
  endManualAuth: () => set({ manualAuthPending: false }),
  signIn: (session) => {
    markSeenSession()
    set((s) => ({
      userId: session.user.id,
      status: 'authenticated',
      manualAuthPending: false,
      authGeneration: s.authGeneration + 1,
    }))
  },
  applyRestoredSession: (session, startedAtGeneration) => {
    const s = get()
    // 요청이 나간 뒤 사용자가 직접 로그인/로그아웃했다면 그 결과가 우선이다.
    if (s.authGeneration !== startedAtGeneration) return false
    // 폼 제출과 응답 도착 사이 구간, 또는 가입 코드 확인·비밀번호 재설정 중. 잠깐이라도
    // 다른 계정(혹은 아직 온보딩 전인 계정)으로 앱이 그려지지 않게 여기서 막는다.
    if (s.manualAuthPending) return false
    markSeenSession()
    set({ userId: session.user.id, status: 'authenticated' })
    return true
  },
  signOut: () => {
    clearSeenSession()
    set((s) => ({
      userId: null,
      status: 'anonymous',
      manualAuthPending: false,
      authGeneration: s.authGeneration + 1,
    }))
  },
  markAnonymous: (options) => {
    // 이미 로그인된 상태를 끌어내리지 않는다. 로그인 화면을 먼저 띄우는 구조 때문에
    // "수동 로그인 성공 → 뒤늦게 부팅 복원 실패"가 실제로 발생하는데, 그때 여기서
    // 상태를 내리면 방금 로그인한 사용자가 튕긴다. 강제 로그아웃은 signOut의 몫이다.
    if (get().status === 'authenticated') return
    if (options?.sessionInvalid) clearSeenSession()
    set({ userId: null, status: 'anonymous' })
  },
}))
