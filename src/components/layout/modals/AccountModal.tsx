// Source: secret/Asset Manager v14.dc.html L3013-3137 (modalAccount) — transcribed verbatim. Opened
// globally from the sidebar avatar (openAccountProfile, L751), not owned by any single screen — see the
// plan's Phase 5 note on why this is NOT built as a Ledger-owned modal despite its line range sitting
// near the Ledger section of the source file.
// authInput/authPrimary/authSecondary (source L3572-3589) and filterPwInput (L3636) live in
// screens/Auth/authFormStyles.ts (the real auth screens' canonical home for these constants) and are
// reused here verbatim for the password-change subview instead of keeping a second copy.
// 로그아웃 버튼은 usePostLogout()에 연결되어 있다 — 실패해도 클라이언트 세션은 끊는다
// (auth.hook.ts의 usePostLogout onSettled 주석 참고), 되돌리기 쉬운 동작이라 확인 모달은 두지 않는다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../primitives/Icon/Icon'
import { Avatar } from '../../primitives/Avatar/Avatar'
import { useAppState } from '../../../state/AppStateContext'
import { stopPropagation, useCloseModal } from '../../../state/selectors/modal'
import { authInput, authPrimary, authSecondary, filterPwInput } from '../../../screens/Auth/authFormStyles'
import { useGetMe, usePatchPassword, useProfileName } from '@/services/user'
import { usePostLogout, PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/services/auth'

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '15px 0',
  borderBottom: '0.5px solid var(--track)',
}

export function AccountModal() {
  const { state, setState } = useAppState()
  const { data: me } = useGetMe()
  const profileName = useProfileName()
  const closeModal = useCloseModal()
  const logoutMutation = usePostLogout()
  const patchPassword = usePatchPassword()

  // 비밀번호는 전역 상태(AppState)에 두지 않는다 — 평문이 앱 전역 상태에 남게 된다.
  // 이 모달은 AppShell에 항상 마운트되므로 닫을 때 반드시 직접 지운다.
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [localPwError, setLocalPwError] = useState<string | null>(null)

  if (state.modalOpen !== 'account') return null

  const isAccountMain = state.accountModalView !== 'password'
  const isAccountPassword = state.accountModalView === 'password'

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

  // 서버 메시지는 이미 완성된 한국어 문장이라 그대로 노출한다. 프론트 검증은 서버에 보내기 전에
  // 확실히 걸러지는 것만 본다(서버 규칙과 동일한 PASSWORD_PATTERN 재사용).
  const pwError = localPwError ?? (patchPassword.error ? patchPassword.error.message : null)

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
  // 이 모달은 AppShell에 항상 마운트되어 닫아도 언마운트되지 않는다 — 평문 비밀번호가 다음 세션까지
  // 메모리에 남지 않도록 닫을 때 직접 지운다.
  const closeAndReset = () => {
    resetPasswordForm()
    closeModal()
  }
  const confirmWithdraw = () => setState({ modalOpen: null, withdrawConfirmOpen: false, accountModalView: 'main' })

  return (
    <div
      onClick={closeAndReset}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: 24,
      }}
    >
      <div
        onClick={stopPropagation}
        style={{
          position: 'relative',
          background: 'var(--surface)',
          borderRadius: 10,
          padding: 30,
          width: 520,
          maxWidth: '100%',
          maxHeight: '86vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
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
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 3 }}>
                  {me?.email ?? 'name@example.com'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                  {/* 원본에는 "마지막 변경 2026.05.12"가 있었지만 서버가 그 값을 주지 않는다 —
                      하드코딩된 날짜를 사실처럼 보여주지 않기 위해 규칙 안내로 바꿨다. */}
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{PASSWORD_RULE_TEXT}</div>
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
                  onClick={() => setState({ withdrawConfirmOpen: true })}
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
                onClick={() => setState({ accountModalView: 'main' })}
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
                  onInput={filterPwInput}
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
                  onInput={filterPwInput}
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
                  onInput={filterPwInput}
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

        {state.withdrawConfirmOpen && (
          <div
            onClick={stopPropagation}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface)',
              borderRadius: 10,
              padding: 30,
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
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 24 }}>
              탈퇴 시 기록된 자산 · 가계부 데이터는 복구되지 않습니다.
            </div>
            <button
              className="pill-btn"
              onClick={confirmWithdraw}
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
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              탈퇴하기
            </button>
            <button className="pill-btn" onClick={() => setState({ withdrawConfirmOpen: false })} style={authSecondary}>
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
