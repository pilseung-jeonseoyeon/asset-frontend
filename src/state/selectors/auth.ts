// No direct source equivalent — dc.html's auth screens (L454-700) were UI-prototype stubs with no
// real navigation helper to mirror. This groups the "switch auth screen" / "code just sent" state
// transitions so every screens/Auth/*Form.tsx resets the same fields the same way (same discipline as
// selectors/modal.ts's useCloseModal resetting shared modal state on close).

import { useAppState } from '../AppStateContext'
import type { AuthScreen } from '../types'

/** 로그인/회원가입/비밀번호 찾기 화면 전환. 이전 화면에서 입력하던 이메일·이름·코드·동의 상태를
 * 다음 화면으로 들고 가지 않도록 매번 초기화한다(비밀번호는 애초에 여기 없다 — 각 폼의 로컬 state,
 * screens/Auth/LoginForm.tsx 헤더 주석 참고). */
export function useGoAuthScreen() {
  const { setState } = useAppState()
  return (screen: AuthScreen) =>
    setState({
      authScreen: screen,
      authStep: 'form',
      authEmail: '',
      authName: '',
      authCode: '',
      authKeepLogin: false,
      authMarketingOptIn: false,
      authCodeSentAt: null,
    })
}

/** 인증 코드 발송 성공 직후 호출 — 코드 입력 UI를 펼치고 재발송 쿨다운 기준 시각을 남긴다. */
export function useMarkAuthCodeSent() {
  const { setState } = useAppState()
  return () => setState({ authStep: 'sent', authCode: '', authCodeSentAt: Date.now() })
}
