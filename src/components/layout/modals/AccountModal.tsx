// Source: secret/Asset Manager v14.dc.html L3013-3137 (modalAccount) — transcribed verbatim. Opened
// globally from the sidebar avatar (openAccountProfile, L751), not owned by any single screen — see the
// plan's Phase 5 note on why this is NOT built as a Ledger-owned modal despite its line range sitting
// near the Ledger section of the source file.
// authInput/authPrimary/authSecondary (source L3572-3589) and filterPwInput (L3636) are defined in the
// source's "인증 화면 공통 스타일" block but reused verbatim here for the password-change subview —
// transcribed locally since the auth screens themselves are out of scope.

import type { CSSProperties, FormEvent } from 'react'
import { Icon } from '../../primitives/Icon/Icon'
import { Avatar } from '../../primitives/Avatar/Avatar'
import { useAppState } from '../../../state/AppStateContext'
import { stopPropagation, useCloseModal } from '../../../state/selectors/modal'

const authInput: CSSProperties = {
  width: '100%',
  height: 46,
  borderRadius: 10,
  border: '0.5px solid var(--border)',
  background: 'var(--fill-subtle)',
  padding: '0 14px',
  fontSize: 13.5,
  fontFamily: 'inherit',
  color: 'var(--text-strong)',
  outline: 'none',
  boxSizing: 'border-box',
}

const authPrimary: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 10,
  border: 'none',
  background: 'var(--accent)',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
}

const authSecondary: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 10,
  border: '0.5px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-mid)',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  marginTop: 8,
}

function filterPwInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/[^\x21-\x7E]/g, '')
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '15px 0',
  borderBottom: '0.5px solid var(--track)',
}

export function AccountModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'account') return null

  const isAccountMain = state.accountModalView !== 'password'
  const isAccountPassword = state.accountModalView === 'password'

  // No auth screen exists in this port (out of scope) — logout/withdraw just close the modal.
  const doLogout = () => closeModal()
  const confirmWithdraw = () => setState({ modalOpen: null, withdrawConfirmOpen: false, accountModalView: 'main' })

  return (
    <div
      onClick={closeModal}
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
                onClick={closeModal}
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
              <Avatar name={state.profileName} size="m" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{state.profileName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 3 }}>name@example.com</div>
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
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>마지막 변경 2026.05.12</div>
                </div>
                <button
                  onClick={() => setState({ accountModalView: 'password' })}
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
                  로그아웃
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
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>현재 비밀번호</div>
              <input type="password" placeholder="현재 비밀번호 입력" onInput={filterPwInput} style={authInput} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>새 비밀번호</div>
              <input type="password" placeholder="영문 · 숫자 · 기호 조합 8자 이상" onInput={filterPwInput} style={authInput} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 7 }}>새 비밀번호 확인</div>
              <input type="password" placeholder="비밀번호 다시 입력" onInput={filterPwInput} style={authInput} />
            </div>
            <button className="pill-btn" onClick={() => setState({ accountModalView: 'main' })} style={authPrimary}>
              저장
            </button>
            <button className="pill-btn" onClick={() => setState({ accountModalView: 'main' })} style={authSecondary}>
              취소
            </button>
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
