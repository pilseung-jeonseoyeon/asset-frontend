// 인증 게이팅 — 백엔드가 JWT를 요구하므로 실제로 동작한다(src/stores/auth.ts 참고). 네 갈래:
// 'unknown', 이 브라우저에서 세션을 본 적이 없음(stores/auth.ts hasSeenSession()) —
// 조용한 refresh를 기다리지 않고 곧바로 로그인 화면을 그린다. 한 번도 로그인한
// 적 없는 방문자는 사실상 401이 확정인 refresh를 기다려봐야 얻을 게 없다.
// useRestoreSession은 그 refresh를 백그라운드에서 계속 진행하고, 어쩌다
// 성공하면(예: 다른 탭에서 만든 세션) status를 'authenticated'로 바꾼다.
// 'unknown', 세션을 본 적이 있음 — 조용한 refresh가 끝날 때까지 빈 '—'가 아니라 BootScreen을
// 보여준다. 이미 로그인한 채 돌아온 사용자에게 로그인 화면이 번쩍이지 않게.
// 'anonymous' — screens/Auth/Auth.tsx만 그린다. SidebarNav/Header/모든 모달은 일부러
// 건너뛴다 — 여럿이 마운트되자마자 쿼리를 쏘는데(useGetMe, 분류 목록 등),
// 익명 상태로 마운트하면 토큰이 필요한 엔드포인트에 401이 무더기로 나간다.
// 'authenticated' — 내비/화면/모달 트리 전체. 별도 lazy 청크(AuthenticatedApp)로 갈라 로그인만
// 하고 가는 방문자가 내려받지 않게 한다. 청크 요청은 *reject*될 수 있어
// (재배포로 예전 해시 URL이 사라진 채 오래 열려 있던 탭) Suspense가 처리하지
// 못하므로 ChunkErrorBoundary로 감싼다.

import { lazy, Suspense, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BootScreen } from './BootScreen'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { NAV_ITEMS } from './navItems'
import { Auth } from '../../screens/Auth/Auth'
import { hasSeenSession } from '@/stores/auth'
import { useRestoreSession } from '@/services/auth'

const AuthenticatedApp = lazy(() =>
  import('./AuthenticatedApp').then((m) => ({ default: m.AuthenticatedApp })),
)

const HOME_PATH = NAV_ITEMS[0].path

export function AppShell() {
  const authStatus = useRestoreSession()
  const navigate = useNavigate()
  const location = useLocation()
  // 로그아웃(직접 로그아웃 또는 토큰 재발급 실패로 인한 강제 로그아웃) 시점에만 URL을
  // 대시보드로 되돌린다. 'authenticated' → 'anonymous' 전환만 감지하고, 부팅 시
  // 'unknown' → 'anonymous'(새로고침 세션 복원 실패 포함)는 건드리지 않는다 — 그 경로는
  // "새로고침해도 보던 화면 유지"가 지켜져야 하는 자동 세션 복원 경로이기 때문이다.
  const prevAuthStatusRef = useRef(authStatus)

  useEffect(() => {
    const prevAuthStatus = prevAuthStatusRef.current
    prevAuthStatusRef.current = authStatus
    if (
      prevAuthStatus === 'authenticated' &&
      authStatus === 'anonymous' &&
      location.pathname !== HOME_PATH
    ) {
      navigate(HOME_PATH, { replace: true })
    }
  }, [authStatus, location.pathname, navigate])

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
