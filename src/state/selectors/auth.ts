// '인증 화면 전환'·'코드 방금 보냄' 같은 상태 전이를 모아 둔 곳. screens/Auth/*Form.tsx가 전부
// 같은 필드를 같은 방식으로 리셋하도록 하기 위함이다(selectors/modal.ts의 useCloseModal이 모달
// 공용 상태를 닫을 때 리셋하는 것과 같은 원칙).

import { useAppState } from '../AppStateContext'
import type { AuthScreen } from '../types'

/** 로그인/회원가입/비밀번호 찾기 화면 전환. 이전 화면에서 입력하던 이메일·이름·코드·동의 상태를
 * 다음 화면으로 들고 가지 않도록 매번 초기화한다(비밀번호는 애초에 여기 없다 — 각 폼의 로컬 state,
 * screens/Auth/LoginForm.tsx 헤더 주석 참고). 회원가입은 1/3 약관 동의부터 시작하므로 다른 화면과
 * 달리 첫 단계가 'terms'다. */
export function useGoAuthScreen() {
  const { setState } = useAppState()
  return (screen: AuthScreen) =>
    setState({
      authScreen: screen,
      authStep: screen === 'signup' ? 'terms' : 'form',
      authEmail: '',
      authName: '',
      authCode: '',
      authKeepLogin: false,
      authAgreements: { service: false, privacy: false, marketing: false },
      authCodeSentAt: null,
    })
}

/** 인증 코드 발송 성공 직후 호출 — 코드 입력 UI를 펼치고 재발송 쿨다운 기준 시각을 남긴다. */
export function useMarkAuthCodeSent() {
  const { setState } = useAppState()
  return () => setState({ authStep: 'sent', authCode: '', authCodeSentAt: Date.now() })
}
