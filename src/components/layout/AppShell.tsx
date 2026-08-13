// Auth gating (source's isAuthed, dc.html L701) is real now that the backend requires a JWT — see
// src/stores/auth.ts. Four branches:
//   'unknown', never seen a session on this browser (stores/auth.ts hasSeenSession()) — render the
//                     login screen immediately instead of waiting on the silent refresh. A visitor
//                     who has never logged in here has nothing to gain from waiting on a refresh
//                     that's virtually guaranteed to 401; useRestoreSession keeps that refresh going
//                     in the background and flips status to 'authenticated' if it somehow succeeds
//                     (e.g. a session created in another tab).
//   'unknown', has seen a session before — show BootScreen (not a blank `—`) while the silent
//                     refresh resolves, so a returning, already-logged-in user doesn't see the login
//                     screen flash before it comes back.
//   'anonymous'     — render ONLY screens/Auth/Auth.tsx. Deliberately skip SidebarNav/Header/every
//                     modalXxx here — several of them fire queries on mount (useGetMe, category lists,
//                     etc.), and mounting them while anonymous would fire a burst of 401s against
//                     endpoints that now require a token.
//   'authenticated' — the original nav/screens/modals tree, split into its own lazy chunk
//                     (AuthenticatedApp) so a login-only visitor never downloads it. Wrapped in
//                     ChunkErrorBoundary because a chunk fetch can *reject* (a redeploy removes the
//                     old hashed URL from under a long-open tab), which Suspense does not handle.

import { lazy, Suspense } from 'react'
import { BootScreen } from './BootScreen'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { Auth } from '../../screens/Auth/Auth'
import { hasSeenSession } from '@/stores/auth'
import { useRestoreSession } from '@/services/auth'

const AuthenticatedApp = lazy(() =>
  import('./AuthenticatedApp').then((m) => ({ default: m.AuthenticatedApp })),
)

export function AppShell() {
  const authStatus = useRestoreSession()

  if (authStatus === 'unknown') {
    if (!hasSeenSession()) return <Auth />
    return <BootScreen />
  }

  if (authStatus === 'anonymous') {
    return <Auth />
  }

  // ChunkErrorBoundary가 Suspense 바깥이어야 한다 — 잡아야 할 건 "아직 안 온 것"이 아니라
  // import()가 reject된 경우(재배포로 사라진 옛 청크 URL)라서 Suspense는 그걸 처리하지 못한다.
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<BootScreen />}>
        <AuthenticatedApp />
      </Suspense>
    </ChunkErrorBoundary>
  )
}
