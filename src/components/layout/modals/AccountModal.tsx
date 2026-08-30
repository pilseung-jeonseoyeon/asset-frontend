// Source: secret/Asset Manager v14.dc.html L3013-3137 (modalAccount) — transcribed verbatim. Opened
// globally from the sidebar avatar (openAccountProfile, L751), not owned by any single screen — see the
// plan's Phase 5 note on why this is NOT built as a Ledger-owned modal despite its line range sitting
// near the Ledger section of the source file.
// authInput/authPrimary/authSecondary (source L3572-3589) and filterPasswordInput (L3636) live in
// screens/Auth/authFormStyles.ts (the real auth screens' canonical home for these constants) and are
// reused here verbatim for the password-change subview instead of keeping a second copy.
// 로그아웃 버튼은 usePostLogout()에 연결되어 있다 — 실패해도 클라이언트 세션은 끊는다
// (auth.hook.ts의 usePostLogout onSettled 주석 참고), 되돌리기 쉬운 동작이라 확인 모달은 두지 않는다.
//
// Mobile (<=767px, docs/mobile.md §4): this modal doesn't use the shared primitives/Modal component
// (it's the one documented exception, alongside ReportOverlay), so the bottom-sheet conversion is
// re-implemented locally here — same shape as Modal.tsx: flex-end scrim, 10px 10px 0 0 radius, 88vh
// max height, safe-area bottom padding, top grabber, sheet-up slide-in.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../../primitives/Icon/Icon'
import { Avatar } from '../../primitives/Avatar/Avatar'
import { Switch } from '../../primitives/Switch/Switch'
import { useAppState } from '../../../state/AppStateContext'
import { stopPropagation, useCloseModal } from '../../../state/selectors/modal'
import { authInput, authPrimary, authSecondary, filterPasswordInput } from '../../../screens/Auth/authFormStyles'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useDeleteMe, useGetMe, usePatchMe, usePatchPassword, useProfileName } from '@/services/user'
import { usePostLogout, PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/services/auth'
import { ApiError } from '@/services/api'

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '15px 0',
  borderBottom: '0.5px solid var(--track)',
}

const LABEL_STYLE: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }

/** UserProfileRes.passwordChangedAt(Instant, 'Z' suffix)을 "YYYY.MM.DD"로 — 원본 문구 복원용. */
function formatChangedAtDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function AccountModal() {
  const { state, setState } = useAppState()
  const { data: me } = useGetMe()
  const profileName = useProfileName()
  const closeModal = useCloseModal()
  const logoutMutation = usePostLogout()
  const patchPassword = usePatchPassword()
  const patchProfile = usePatchMe()
  const withdraw = useDeleteMe()
  const isMobile = useIsMobile()

  // 비밀번호는 전역 상태(AppState)에 두지 않는다 — 평문이 앱 전역 상태에 남게 된다.
  // 이 모달은 AppShell에 항상 마운트되므로 닫을 때 반드시 직접 지운다.
  // 훅은 아래 `if (!isOpen) return null`보다 위에 있어야 한다(react-hooks/rules-of-hooks).
  const scrimPressedRef = useRef(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [localPwError, setLocalPwError] = useState<string | null>(null)

  // 이름 자체는 민감정보가 아니지만, 비밀번호 서브뷰와 같은 이유(이 모달은 닫아도 언마운트되지
  // 않는다)로 편집 중인 초안을 로컬 state로 두고 닫을 때 직접 지운다.
  const [profileNameInput, setProfileNameInput] = useState('')
  const [profileMarketingOptIn, setProfileMarketingOptIn] = useState(false)
  const [localProfileError, setLocalProfileError] = useState<string | null>(null)

  // 탈퇴도 비밀번호와 같은 이유로 로컬 state에 두고 닫을 때 직접 지운다(위 비밀번호 서브뷰 주석 참고).
  const [withdrawPw, setWithdrawPw] = useState('')
  const [localWithdrawError, setLocalWithdrawError] = useState<string | null>(null)

  const isOpen = state.modalOpen === 'account'

  // 아래 7개 함수는 원래 조건부 return 다음(모달이 열려 있을 때만 계산)에 있었지만, Esc 핸들러
  // (바로 아래 useEffect)가 참조해야 한다 — useEffect는 Rules of Hooks 때문에 매 렌더 동일한 순서로
  // 호출해야 하므로 조건부 return보다 먼저 와야 하고, 그러려면 이 클로저들도 함께 끌어올려야 한다.
  const resetPasswordForm = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setLocalPwError(null)
    patchPassword.reset()
  }
  const closePasswordView = () => {
    resetPasswordForm()
    setState({ accountModalView: 'main' })
  }
  const resetProfileForm = () => {
    setProfileNameInput('')
    setProfileMarketingOptIn(false)
    setLocalProfileError(null)
    patchProfile.reset()
  }
  const closeProfileView = () => {
    resetProfileForm()
    setState({ accountModalView: 'main' })
  }
  // 이 모달은 AppShell에 항상 마운트되어 닫아도 언마운트되지 않는다 — 평문 비밀번호가 다음 세션까지
  // 메모리에 남지 않도록 닫을 때 직접 지운다.
  const resetWithdrawForm = () => {
    setWithdrawPw('')
    setLocalWithdrawError(null)
    withdraw.reset()
  }
  const closeAndReset = () => {
    resetPasswordForm()
    resetProfileForm()
    resetWithdrawForm()
    closeModal()
  }
  const cancelWithdraw = () => {
    resetWithdrawForm()
    setState({ withdrawConfirmOpen: false })
  }

  // 이 모달은 primitives/Modal을 쓰지 않는 자체 스크림이라 Esc도 직접 붙인다. 서브뷰(비밀번호 변경/
  // 이름 변경)나 탈퇴 확인 배너에 있을 때 Esc는 모달을 통째로 닫지 않고, 그 서브뷰의 기존 뒤로가기·
  // "취소" 버튼과 똑같이 로컬 입력만 지우고 메인 뷰로 돌아간다 — 안 그러면 비밀번호를 입력하던 중
  // Esc 한 번에 모달 전체가 사라진다. 탈퇴 확인 배너는 메인 뷰 위에 얹히는 형태라 가장 먼저 검사한다.
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.isComposing) return
      if (state.withdrawConfirmOpen) {
        cancelWithdraw()
        return
      }
      if (state.accountModalView === 'password') {
        closePasswordView()
        return
      }
      if (state.accountModalView === 'profile') {
        closeProfileView()
        return
      }
      closeAndReset()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // cancelWithdraw/closePasswordView/closeProfileView/closeAndReset은 매 렌더 새로 만들어지지만
    // 안에서 부르는 것도 결국 React state 세터와 setState(둘 다 리렌더와 무관하게 항상 같은 동작을
    // 하는 안정 참조)뿐이라, deps에 넣어 매 키 입력마다 리스너를 갈아 끼울 필요가 없다 — 재구독은
    // 실제로 분기를 바꾸는 isOpen/withdrawConfirmOpen/accountModalView가 바뀔 때만 하면 충분하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state.withdrawConfirmOpen, state.accountModalView])

  if (!isOpen) return null

  const isAccountPassword = state.accountModalView === 'password'
  const isAccountProfile = state.accountModalView === 'profile'
  const isAccountMain = !isAccountPassword && !isAccountProfile

  // 서버 메시지는 이미 완성된 한국어 문장이라 그대로 노출한다. 프론트 검증은 서버에 보내기 전에
  // 확실히 걸러지는 것만 본다(서버 규칙과 동일한 PASSWORD_PATTERN 재사용).
  const pwError = localPwError ?? (patchPassword.error ? patchPassword.error.message : null)

  const openProfileEdit = () => {
    setProfileNameInput(me?.name ?? '')
    setProfileMarketingOptIn(me?.hasMarketingOptIn ?? false)
    setLocalProfileError(null)
    patchProfile.reset()
    setState({ accountModalView: 'profile' })
  }
  const profileError = localProfileError ?? (patchProfile.error ? patchProfile.error.message : null)

  const handleSaveProfile = () => {
    const trimmed = profileNameInput.trim()
    if (!trimmed) {
      setLocalProfileError('이름을 입력해주세요.')
      return
    }
    if (trimmed.length > 50) {
      setLocalProfileError('이름은 50자 이하여야 해요.')
      return
    }
    setLocalProfileError(null)
    patchProfile.reset()
    patchProfile.mutate({ name: trimmed, hasMarketingOptIn: profileMarketingOptIn })
  }

  const handleChangePassword = () => {
    if (!currentPw) {
      setLocalPwError('현재 비밀번호를 입력해주세요.')
      return
    }
    if (!PASSWORD_PATTERN.test(newPw)) {
      setLocalPwError(`새 비밀번호는 ${PASSWORD_RULE_TEXT}이어야 해요.`)
      return
    }
    if (newPw !== confirmPw) {
      setLocalPwError('새 비밀번호가 서로 달라요.')
      return
    }
    if (newPw === currentPw) {
      setLocalPwError('지금 쓰는 비밀번호와 다른 것으로 정해주세요.')
      return
    }
    setLocalPwError(null)
    patchPassword.reset()
    patchPassword.mutate(
      { currentPassword: currentPw, newPassword: newPw },
      {
        onSuccess: () => {
          setCurrentPw('')
          setNewPw('')
          setConfirmPw('')
        },
      },
    )
  }

  // 실패해도 usePostLogout이 onSettled에서 클라이언트 세션을 끊는다 — 여기서는 그냥 호출만 한다.
  const doLogout = () => logoutMutation.mutate()
  const openWithdrawConfirm = () => {
    resetWithdrawForm()
    setState({ withdrawConfirmOpen: true })
  }
  // 로그아웃(doLogout)과 달리 실패하면 세션을 유지한다 — useDeleteMe가 성공했을 때만 signOut +
  // 캐시 초기화를 하므로, 여기서는 그냥 mutate만 호출한다(성공하면 AppShell이 로그인 화면으로
  // 전환하며 이 모달째로 언마운트된다).
  const confirmWithdraw = () => {
    if (!withdrawPw) {
      setLocalWithdrawError('비밀번호를 입력해주세요.')
      return
    }
    setLocalWithdrawError(null)
    withdraw.reset()
    withdraw.mutate({ password: withdrawPw })
  }

  const withdrawInvalidPassword = withdraw.error instanceof ApiError && withdraw.error.code === 'INVALID_CURRENT_PASSWORD'
  const withdrawAlreadyDone = withdraw.error instanceof ApiError && withdraw.error.code === 'ALREADY_WITHDRAWN'
  const withdrawErrorMessage =
    localWithdrawError ??
    (withdrawInvalidPassword
      ? '비밀번호가 올바르지 않아요.'
      : withdrawAlreadyDone
        ? '이미 탈퇴 처리된 계정이에요.'
        : (withdraw.error?.message ?? null))

  // 스크림(배경)을 누르면 닫는다(2026-08-29, primitives/Modal과 같은 시점에 같은 이유로 되돌림).
  // 누른 지점이 스크림 자신일 때만 닫는 이유(드래그 선택·팝오버 층위)는 Modal.tsx의
  // handleScrimPointerDown 주석 참고. 여기서는 서브뷰(프로필/비밀번호/탈퇴)로 들어가 있어도
  // Esc와 달리 곧바로 전체를 닫는다 — 배경을 누르는 건 "이 창을 그만 보겠다"는 뜻이기 때문이다.
  // 프로필·비밀번호 폼은 초안을 기억하지 않으므로 작성 중이던 값은 사라진다(2026-08-29 사용자 확인).
  const handleScrimPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    scrimPressedRef.current = e.target === e.currentTarget
  }
  const handleScrimClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!scrimPressedRef.current) return
    scrimPressedRef.current = false
    if (e.target !== e.currentTarget) return
    closeAndReset()
  }

  return (
    <div
      onPointerDown={handleScrimPointerDown}
      onClick={handleScrimClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        onClick={stopPropagation}
        className={isMobile ? 'sheet-up' : undefined}
        style={
          isMobile
            ? {
                position: 'relative',
                background: 'var(--surface)',
                borderRadius: '10px 10px 0 0',
                padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
                width: '100%',
                maxWidth: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-modal)',
              }
            : {
                position: 'relative',
                background: 'var(--surface)',
                borderRadius: 10,
                padding: 30,
                width: 520,
                maxWidth: '100%',
                maxHeight: '86vh',
                overflow: 'auto',
                boxShadow: 'var(--shadow-modal)',
              }
        }
      >
        {isMobile && (
          <div
            aria-hidden="true"
            style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px' }}
          />
        )}
        {isAccountMain && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="account_circle" size={20} />
                </span>
                <div style={{ fontSize: 16.5, fontWeight: 700 }}>계정 및 프로필</div>
              </div>
              <button
                onClick={closeAndReset}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--track)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="close" size={19} color="var(--text-mid)" />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--fill-subtle)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 8,
              }}
            >
              <Avatar name={profileName} size="m" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{profileName}</div>
                {/* 서버 응답에 없는 값은 그리지 않는다 — 이메일을 아직 못 받아왔으면(로딩/실패) 줄
                    자체를 렌더하지 않고, 가짜 자리표시자(name@example.com)를 보여주지 않는다. */}
                {me?.email && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 3 }}>{me.email}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={ROW_STYLE}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>이름</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>가계부 · 알림에 표시되는 이름</div>
                </div>
                <button
                  onClick={openProfileEdit}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-strong)',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '7px 13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  변경
                </button>
              </div>
              <div style={ROW_STYLE}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>프로필 이미지</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                    이름 첫 글자 기반 기본 이미지 · 커스텀 프로필은 추후 지원 예정
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-weak)',
                    background: 'var(--track)',
                    borderRadius: 8,
                    padding: '5px 10px',
                  }}
                >
                  준비 중
                </span>
              </div>
              <div style={ROW_STYLE}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>비밀번호 변경</div>
                  {/* passwordChangedAt이 null이면(가입 후 한 번도 안 바꿈) 원본의 날짜 문구 대신
                      규칙 안내를 보여준다 — 값이 있으면 원본 문구("마지막 변경 YYYY.MM.DD")를 그대로 복원한다. */}
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                    {me?.passwordChangedAt ? `마지막 변경 ${formatChangedAtDate(me.passwordChangedAt)}` : PASSWORD_RULE_TEXT}
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetPasswordForm()
                    setState({ accountModalView: 'password' })
                  }}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-strong)',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '7px 13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  변경
                </button>
              </div>
              <div style={ROW_STYLE}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>가족 연동</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                    개인 자산과 공유 자산을 나눠서 관리
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-weak)',
                    background: 'var(--track)',
                    borderRadius: 8,
                    padding: '5px 10px',
                  }}
                >
                  준비 중
                </span>
              </div>
              <div style={ROW_STYLE}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>로그아웃</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>이 기기에서 계정을 해제합니다</div>
                </div>
                <button
                  onClick={doLogout}
                  disabled={logoutMutation.isPending}
                  aria-busy={logoutMutation.isPending}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-strong)',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '7px 13px',
                    cursor: logoutMutation.isPending ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    opacity: logoutMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {logoutMutation.isPending ? '로그아웃 중…' : '로그아웃'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>탈퇴</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>계정과 모든 기록을 삭제합니다</div>
                </div>
                <button
                  onClick={openWithdrawConfirm}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--exp-text)',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '7px 13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  탈퇴
                </button>
              </div>
            </div>
          </div>
        )}

        {isAccountPassword && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <button
                onClick={closePasswordView}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--track)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="arrow_back" size={19} color="var(--text-mid)" />
              </button>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>비밀번호 변경</div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleChangePassword()
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="pw-current" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
                  현재 비밀번호
                </label>
                <input
                  id="pw-current"
                  type="password"
                  autoComplete="current-password"
                  placeholder="현재 비밀번호 입력"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  onInput={filterPasswordInput}
                  style={authInput}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="pw-new" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
                  새 비밀번호
                </label>
                <input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  placeholder={PASSWORD_RULE_TEXT}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  onInput={filterPasswordInput}
                  style={authInput}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="pw-confirm" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>
                  새 비밀번호 확인
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호 다시 입력"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  onInput={filterPasswordInput}
                  style={authInput}
                />
              </div>

              <div aria-live="polite" style={{ marginBottom: 14, minHeight: 16 }}>
                {pwError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{pwError}</div>}
                {patchPassword.isSuccess && !pwError && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>비밀번호를 바꿨어요.</div>
                )}
              </div>

              <button
                type="submit"
                className="pill-btn"
                disabled={patchPassword.isPending}
                aria-busy={patchPassword.isPending}
                style={{ ...authPrimary, opacity: patchPassword.isPending ? 0.7 : 1 }}
              >
                {patchPassword.isPending ? '저장 중…' : '저장'}
              </button>
              <button type="button" className="pill-btn" onClick={closePasswordView} style={authSecondary}>
                취소
              </button>
            </form>
          </div>
        )}

        {isAccountProfile && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <button
                onClick={closeProfileView}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--track)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="arrow_back" size={19} color="var(--text-mid)" />
              </button>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>이름 변경</div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSaveProfile()
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="profile-name" style={LABEL_STYLE}>
                  이름
                </label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  maxLength={50}
                  placeholder="이름 입력"
                  value={profileNameInput}
                  onChange={(e) => setProfileNameInput(e.target.value)}
                  style={authInput}
                />
              </div>

              {me && (
                <div style={{ ...ROW_STYLE, borderBottom: 'none', padding: '4px 0 18px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>마케팅 정보 수신 동의</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>이벤트 · 혜택 알림 수신</div>
                  </div>
                  <Switch
                    label="마케팅 정보 수신 동의"
                    checked={profileMarketingOptIn}
                    disabled={patchProfile.isPending}
                    onChange={setProfileMarketingOptIn}
                  />
                </div>
              )}

              <div aria-live="polite" style={{ marginBottom: 14, minHeight: 16 }}>
                {profileError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{profileError}</div>}
                {patchProfile.isSuccess && !profileError && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>이름을 저장했어요.</div>
                )}
              </div>

              <button
                type="submit"
                className="pill-btn"
                disabled={patchProfile.isPending}
                aria-busy={patchProfile.isPending}
                style={{ ...authPrimary, opacity: patchProfile.isPending ? 0.7 : 1 }}
              >
                {patchProfile.isPending ? '저장 중…' : '저장'}
              </button>
              <button type="button" className="pill-btn" onClick={closeProfileView} style={authSecondary}>
                취소
              </button>
            </form>
          </div>
        )}

        {state.withdrawConfirmOpen && (
          <form
            onClick={stopPropagation}
            onSubmit={(e) => {
              e.preventDefault()
              confirmWithdraw()
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface)',
              borderRadius: isMobile ? '10px 10px 0 0' : 10,
              padding: isMobile ? '20px 18px calc(20px + env(safe-area-inset-bottom))' : 30,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--down-chip)',
                color: 'var(--down)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name="warning" size={22} />
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>정말 탈퇴하시겠어요?</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 18 }}>
              {/* 답변서 D-1: soft delete 30일 유예로 확정 — 즉시 삭제가 아니라 유예 기간 후 영구 삭제됨을 안내한다. */}
              탈퇴 후 30일 뒤 영구 삭제됩니다. 유예 기간에는 로그인과 같은 이메일 재가입이 불가합니다.
            </div>
            <div style={{ marginBottom: withdrawErrorMessage ? 10 : 20 }}>
              <label htmlFor="withdraw-pw" style={LABEL_STYLE}>
                현재 비밀번호
              </label>
              <input
                id="withdraw-pw"
                type="password"
                autoComplete="current-password"
                placeholder="현재 비밀번호 입력"
                value={withdrawPw}
                onChange={(e) => {
                  setWithdrawPw(e.target.value)
                  setLocalWithdrawError(null)
                }}
                onInput={filterPasswordInput}
                style={authInput}
              />
            </div>
            {withdrawErrorMessage && (
              <div aria-live="polite" style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
                {withdrawErrorMessage}
              </div>
            )}
            <button
              type="submit"
              className="pill-btn"
              disabled={withdraw.isPending}
              aria-busy={withdraw.isPending}
              style={{
                width: '100%',
                height: 48,
                borderRadius: 10,
                border: 'none',
                background: 'var(--down)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: withdraw.isPending ? 'default' : 'pointer',
                letterSpacing: '-0.01em',
                opacity: withdraw.isPending ? 0.7 : 1,
              }}
            >
              {withdraw.isPending ? '탈퇴 처리 중…' : '탈퇴하기'}
            </button>
            <button type="button" className="pill-btn" onClick={cancelWithdraw} disabled={withdraw.isPending} style={authSecondary}>
              취소
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
