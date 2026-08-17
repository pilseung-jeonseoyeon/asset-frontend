// 서버 사용자 설정(`theme`)을 AppState·localStorage로 미러링하는 훅. `services/`에는 UI 관심사
// (AppState, localStorage)를 두지 않는 규칙(docs/architecture.md) 때문에 layout 계층의 단독 파일로
// 둔다 — 선례: `src/components/primitives/usePopoverAnchor.ts`.
//
// 서버가 정본이고 이 훅이 유일한 반영 경로다(설계 결정 1·3번, synthetic-sleeping-wigderson.md).
// GeneralModal의 pickTheme은 낙관적으로 AppState를 먼저 바꾸고, 실패하면 usePatchUserSettings의
// onError가 캐시를 되돌리는데, 그 되돌아간 캐시 값을 여기서 다시 읽어 AppState·localStorage를
// 원래대로 복원한다 — 롤백 로직이 화면과 훅 두 군데로 갈라지지 않는다.

import { useEffect, useRef } from 'react'
import { useAppState } from '../../state/AppStateContext'
import { storeTheme, toThemeSetting } from '../../utils/theme'
import { useGetUserSettings } from '@/services/user'
import type { ThemeType } from '@/services/common.type'

export function useSyncUserTheme(): void {
  const { setState } = useAppState()
  // useGetUserSettings()는 항상 enabled(옵션 생략)라 이 훅이 마운트되는 즉시(=인증된 화면 트리
  // 전체) 설정을 조회한다. AuthenticatedApp 안에서만 마운트되므로 401을 쏘지 않는다.
  const { data } = useGetUserSettings()
  // 서버 값이 "바뀔 때만" 반영한다 — 매 렌더 useEffect를 돌리면 방금 사용자가 누른 값을 뒤늦게
  // 도착한(경쟁 상태의) 예전 응답이 되돌릴 여지가 생긴다.
  const lastServerThemeRef = useRef<ThemeType | null>(null)

  useEffect(() => {
    // 급소: `settings`(DEFAULT_USER_SETTINGS로 채워지는 렌더 안전망)가 아니라 `data`를 봐야 한다.
    // settings를 보면 로딩·에러 중에도 기본값 'SYSTEM'이 섞여 나와, 새로고침마다 사용자가 고른
    // 테마가 한 번 '시스템'으로 튀었다가 실제 응답으로 되돌아오는 깜빡임이 생긴다.
    const serverTheme = data?.theme
    if (!serverTheme || serverTheme === lastServerThemeRef.current) return
    lastServerThemeRef.current = serverTheme

    const next = toThemeSetting(serverTheme)
    storeTheme(next)
    setState((st) => (st.theme === next ? {} : { theme: next }))
    // 조회 실패 시에는 이 effect 자체가 돌지 않으므로(data가 undefined) 캐시·로컬 테마가
    // 그대로 유지된다 — 전역 에러 UI 없이 조용히 넘어간다.
  }, [data?.theme, setState])
}
