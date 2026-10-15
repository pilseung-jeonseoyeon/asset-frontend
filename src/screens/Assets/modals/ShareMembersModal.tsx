// '함께 보는 사람' — 계좌 소유자가 멤버와 초대를 관리하는 유일한 새 화면(시안 5번).
// `state.shareMembersAccountId !== null`로 열림을 판단한다(AccountDetailModal과 같은 전용 필드 패턴).
//
// 열리는 곳이 둘이다:
// - 계좌 상세의 [초대하기]/[관리] — 같은 층(z-index 90)에 두 모달이 겹치지 않도록 상세를 닫고 연다.
//   그래서 헤더에 뒤로 가기 화살표가 있고(shareMembersReturnTo === 'accountDetail'), 누르면 그 계좌 상세로
//   돌아간다. X는 전부 닫는다.
// - 설정 → 가족 · 커플 공유의 [관리] — 설정 모달(z-index 80) 위에 그대로 겹친다(returnTo null).
//
// 데이터: GET /accounts/{id}(계좌 이름·기관), GET /shares?side=OWNER&accountId=(초대·멤버 전부, 상태 불문),
// GET /users/me(주인 행). 서버는 행을 지우지 않고 상태만 바꾸므로 거절·종료 행도 내려오지만 여기서는
// 그리지 않는다(data/shareView.ts의 groupOwnerShares).
//
// 서버에 "다시 보내기"는 없다 — 만료된 초대는 같은 이메일로 **새로** 초대한다(POST). "공유 끄기"도
// 일괄 API가 없어 공유 중·대기 중 행을 하나씩 해제한다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Avatar } from '../../../components/primitives/Avatar/Avatar'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'
import {
  SHARE_INVITE_DAYS,
  SHARE_MAX_MEMBERS,
  SHARE_ROLE_LABELS,
  SHARE_ROLE_ORDER,
  describeShareError,
  formatShareDate,
  groupOwnerShares,
  shareSeatsLabel,
} from '../../../data/shareView'
import { ApiError } from '@/services/api'
import { useGetAccount } from '@/services/account'
import { useDeleteShare, useGetShares, usePatchShare, usePostShare } from '@/services/share'
import type { ShareResponse, ShareRole } from '@/services/share'
import { useGetMe } from '@/services/user'

const ICON_BUTTON_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
}
const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
const SMALL_BTN_STYLE: CSSProperties = {
  border: '0.5px solid var(--border)', background: 'var(--surface)', borderRadius: 8,
  padding: '8px 12px', minHeight: 36, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)',
  cursor: 'pointer', fontFamily: 'inherit', flex: 'none', whiteSpace: 'nowrap',
}
const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)', minWidth: 0,
}
const BADGE_STYLE: CSSProperties = {
  fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px', flex: 'none', lineHeight: 1.4, whiteSpace: 'nowrap',
}

/** 서버 실패를 화면 문구로. */
function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeShareError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface RoleChipsProps {
  value: ShareRole
  onChange: (role: ShareRole) => void
  disabled?: boolean
  /** 멤버 행에 들어가는 작은 버전. */
  compact?: boolean
}

/** 보기만 / 함께 기록 선택 칩. DataModal의 기간 칩과 같은 규격이다. */
function RoleChips({ value, onChange, disabled, compact }: RoleChipsProps) {
  return (
    <div role="group" aria-label="권한" style={{ display: 'flex', gap: 6, flex: 'none' }}>
      {SHARE_ROLE_ORDER.map((r) => {
        const active = value === r
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(r)}
            className={compact ? 'tap-44' : undefined}
            style={{
              padding: compact ? '5px 9px' : '7px 12px', borderRadius: 8, fontSize: compact ? 11 : 11.5, fontWeight: 700,
              fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap',
              border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
              background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text-mid)',
            }}
          >
            {SHARE_ROLE_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}

/** 한 행에 남기는 마지막 동작 결과(실패 문구). 한 번에 한 줄만 조작하므로 id 하나로 충분하다. */
interface RowNote {
  shareId: number
  text: string
}

export function ShareMembersModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const accountId = state.shareMembersAccountId
  const isOpen = accountId !== null
  const returnsToDetail = state.shareMembersReturnTo === 'accountDetail'

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const sharesQuery = useGetShares({ side: 'OWNER', accountId: accountId ?? undefined }, { enabled: isOpen })
  const meQuery = useGetMe()
  const postShare = usePostShare()
  const patchShare = usePatchShare()
  const deleteShare = useDeleteShare()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('EDITOR')
  const [emailInvalid, setEmailInvalid] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)
  const [confirmTurnOff, setConfirmTurnOff] = useState(false)
  const [turningOff, setTurningOff] = useState(false)
  const [turnOffError, setTurnOffError] = useState<string | null>(null)
  const [rowNote, setRowNote] = useState<RowNote | null>(null)

  if (!isOpen) return null

  const account = accountQuery.data?.account
  const groups = groupOwnerShares(sharesQuery.shares)
  const activeCount = groups.members.length + groups.pending.length
  const seatsFull = activeCount >= SHARE_MAX_MEMBERS
  const me = meQuery.data

  // 모달은 닫아도 언마운트되지 않으므로(architecture.md) 로컬 상태와 mutation을 직접 되돌린다 —
  // 안 하면 다음에 다른 계좌를 열었을 때 지난 초대 실패 문구와 확인창이 그대로 남는다.
  const resetLocal = () => {
    setEmail('')
    setRole('EDITOR')
    setEmailInvalid(false)
    setConfirmRemoveId(null)
    setConfirmTurnOff(false)
    setTurningOff(false)
    setTurnOffError(null)
    setRowNote(null)
    postShare.reset()
    patchShare.reset()
    deleteShare.reset()
  }
  const closeAll = () => {
    resetLocal()
    setState({ shareMembersAccountId: null, shareMembersReturnTo: null, openDropdown: null })
  }
  const goBack = () => {
    resetLocal()
    setState({
      shareMembersAccountId: null,
      shareMembersReturnTo: null,
      openDropdown: null,
      ...(returnsToDetail ? { accountDetailId: accountId } : null),
    })
  }

  const handleInvite = () => {
    const trimmed = email.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailInvalid(true)
      return
    }
    setEmailInvalid(false)
    postShare.mutate({ accountId, email: trimmed, role }, { onSuccess: () => setEmail('') })
  }

  /** 만료된 초대를 같은 이메일·권한으로 새로 보낸다(서버에 재전송 API가 없다). */
  const reinvite = (s: ShareResponse) => {
    setRowNote(null)
    postShare.reset()
    postShare.mutate(
      { accountId, email: s.member.email, role: s.role },
      { onError: (e) => setRowNote({ shareId: s.id, text: messageOf(e, '다시 초대하지 못했어요.') }) },
    )
  }

  const changeRole = (s: ShareResponse, next: ShareRole) => {
    if (s.role === next) return
    setRowNote(null)
    patchShare.mutate(
      { shareId: s.id, body: { role: next } },
      { onError: (e) => setRowNote({ shareId: s.id, text: messageOf(e, '권한을 바꾸지 못했어요.') }) },
    )
  }

  const revoke = (s: ShareResponse) => {
    setRowNote(null)
    deleteShare.mutate(s.id, {
      onSuccess: () => setConfirmRemoveId(null),
      onError: (e) => setRowNote({ shareId: s.id, text: messageOf(e, '해제하지 못했어요.') }),
    })
  }

  /** 공유 끄기 — 공유 중·대기 중 전부를 하나씩 해제한다. 중간에 실패하면 거기서 멈추고 이유를 보여준다. */
  const turnOff = async () => {
    setTurningOff(true)
    setTurnOffError(null)
    try {
      for (const s of [...groups.members, ...groups.pending]) {
        await deleteShare.mutateAsync(s.id)
      }
      setConfirmTurnOff(false)
    } catch (e) {
      setTurnOffError(messageOf(e, '공유를 끄지 못했어요.'))
    } finally {
      setTurningOff(false)
    }
  }

  const rowBusy = (shareId: number) =>
    (patchShare.isPending && patchShare.variables?.shareId === shareId) ||
    (deleteShare.isPending && deleteShare.variables === shareId) ||
    turningOff
  const inviteError = postShare.error && !rowNote ? messageOf(postShare.error, '초대를 보내지 못했어요.') : null

  return (
    <Modal onClose={closeAll} zIndex={90} width={600} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, ...sheetStickyHeaderStyle(isMobile, 20) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {returnsToDetail && (
            <button type="button" onClick={goBack} aria-label="계좌 상세로 돌아가기" style={ICON_BUTTON_STYLE}>
              <Icon name="arrow_back" size={19} color="var(--text-mid)" />
            </button>
          )}
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="group" size={20} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap' }}>함께 보는 사람</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {account?.name ?? (accountQuery.isPending ? '—' : '계좌')}
            </div>
          </div>
        </div>
        <button type="button" onClick={closeAll} aria-label="닫기" style={ICON_BUTTON_STYLE}>
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {sharesQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : sharesQuery.error ? (
        <div role="alert" style={{ ...HINT_STYLE, color: 'var(--down)' }}>
          함께 보는 사람을 불러오지 못했어요.{' '}
          <button type="button" onClick={() => void sharesQuery.refetch()} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {/* 인원 요약 — 주인 포함 N명 · 대기 M */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 4 }}>
            <span>
              <b style={{ color: 'var(--text-strong)' }}>{shareSeatsLabel(groups.members.length, groups.pending.length)}</b>
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-weak)', whiteSpace: 'nowrap' }}>
              초대 {activeCount}/{SHARE_MAX_MEMBERS}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* 주인(나) */}
            <div style={ROW_STYLE}>
              <Avatar name={me?.name ?? ''} size="s" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me?.name ?? '나'}</span>
                  <span style={{ ...BADGE_STYLE, background: 'var(--track)', color: 'var(--text-mid)' }}>주인</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me?.email ?? ''}</div>
              </div>
            </div>

            {/* 공유 중인 멤버 */}
            {groups.members.map((s) => {
              const busy = rowBusy(s.id)
              const note = rowNote?.shareId === s.id ? rowNote : null
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid var(--track)' }}>
                  <div style={{ ...ROW_STYLE, borderBottom: 'none', flexWrap: 'wrap' }}>
                    <Avatar name={s.member.name} size="s" />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.member.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.acceptedAt ? `${formatShareDate(s.acceptedAt)}부터 · ` : ''}{s.member.email}
                      </div>
                    </div>
                    {/* 권한 칩과 내보내기를 한 묶음으로 둔다 — 좁은 폭(360px)에서 줄이 꺾일 때 셋이 함께 다음 줄로 내려가
                        오른쪽 정렬을 유지한다(따로 두면 내보내기만 홀로 떨어진다). */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', marginLeft: 'auto' }}>
                      <RoleChips value={s.role} onChange={(r) => changeRole(s, r)} disabled={busy} compact />
                      <button
                        type="button"
                        className="qbtn"
                        disabled={busy}
                        onClick={() => {
                          setRowNote(null)
                          setConfirmRemoveId((id) => (id === s.id ? null : s.id))
                        }}
                        style={{ ...SMALL_BTN_STYLE, color: 'var(--down)', opacity: busy ? 0.6 : 1 }}
                      >
                        {deleteShare.isPending && deleteShare.variables === s.id ? '내보내는 중…' : '내보내기'}
                      </button>
                    </div>
                  </div>
                  {confirmRemoveId === s.id && (
                    // 되돌릴 수 없는 동작이라 그 자리에서 확인을 받는다(ConnectionsSection의 해제 확인과 같은 규격).
                    <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{s.member.name}님을 내보낼까요?</div>
                      <div style={HINT_STYLE}>
                        {s.member.name}님이 적은 거래는 계좌에 그대로 남아요. 상대에게 &lsquo;공유가 끝났어요&rsquo; 알림이 가요.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="qbtn" disabled={busy} onClick={() => revoke(s)} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
                          내보낼게요
                        </button>
                        <button type="button" className="qbtn" onClick={() => setConfirmRemoveId(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                  {note && <div role="alert" style={{ ...ERROR_STYLE, marginTop: 0, marginBottom: 10 }}>{note.text}</div>}
                </div>
              )
            })}

            {/* 수락을 기다리는 초대 */}
            {groups.pending.map((s) => {
              const busy = rowBusy(s.id)
              const note = rowNote?.shareId === s.id ? rowNote : null
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid var(--track)' }}>
                  <div style={{ ...ROW_STYLE, borderBottom: 'none' }}>
                    <span style={{ width: 36, height: 36, borderRadius: 999, border: '1px dashed var(--text-weak)', color: 'var(--text-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxSizing: 'border-box' }}>
                      <Icon name="schedule" size={17} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.member.email}</span>
                        <span style={{ ...BADGE_STYLE, background: 'var(--accent-soft)', color: 'var(--accent)' }}>대기 중</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                        {formatShareDate(s.expiresAt)}까지 수락하지 않으면 만료돼요 · {SHARE_ROLE_LABELS[s.role]}
                      </div>
                    </div>
                    <button type="button" className="qbtn" disabled={busy} onClick={() => revoke(s)} style={{ ...SMALL_BTN_STYLE, opacity: busy ? 0.6 : 1 }}>
                      {deleteShare.isPending && deleteShare.variables === s.id ? '취소 중…' : '취소'}
                    </button>
                  </div>
                  {note && <div role="alert" style={{ ...ERROR_STYLE, marginTop: 0, marginBottom: 10 }}>{note.text}</div>}
                </div>
              )
            })}

            {/* 만료된 초대 — 다시 초대만 할 수 있다 */}
            {groups.expired.map((s) => {
              const busy = postShare.isPending || turningOff
              const note = rowNote?.shareId === s.id ? rowNote : null
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid var(--track)' }}>
                  <div style={{ ...ROW_STYLE, borderBottom: 'none' }}>
                    <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--track)', color: 'var(--text-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <Icon name="schedule" size={17} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.member.email}</span>
                        <span style={{ ...BADGE_STYLE, background: 'var(--track)', color: 'var(--text-weak)' }}>기한 지남</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{SHARE_INVITE_DAYS}일 안에 수락하지 않았어요</div>
                    </div>
                    <button type="button" className="qbtn" disabled={busy || seatsFull} onClick={() => reinvite(s)} style={{ ...SMALL_BTN_STYLE, display: 'flex', alignItems: 'center', gap: 4, opacity: busy || seatsFull ? 0.6 : 1 }}>
                      <Icon name="send" size={13} />
                      다시 초대
                    </button>
                  </div>
                  {note && <div role="alert" style={{ ...ERROR_STYLE, marginTop: 0, marginBottom: 10 }}>{note.text}</div>}
                </div>
              )
            })}
          </div>

          {/* 새 초대 */}
          <div style={{ marginTop: 18 }}>
            <div style={LABEL_STYLE}>초대하기</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <Icon name="mail" size={18} color="var(--text-weak)" ariaHidden />
              <input
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="상대의 모닛 가입 이메일"
                aria-label="초대할 이메일"
                value={email}
                disabled={seatsFull}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailInvalid) setEmailInvalid(false)
                  if (postShare.error) postShare.reset()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleInvite()
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            {emailInvalid && <div style={ERROR_STYLE}>이메일 형식을 확인해주세요</div>}
            {inviteError && <div role="alert" style={ERROR_STYLE}>{inviteError}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>권한</span>
              <RoleChips value={role} onChange={setRole} disabled={seatsFull} />
              <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
                {role === 'EDITOR' ? '잔액·내역을 보고 수입·지출도 적을 수 있어요' : '잔액·내역만 볼 수 있어요'}
              </span>
            </div>
            <div style={{ ...HINT_STYLE, marginTop: 8 }}>
              {seatsFull
                ? `한 계좌는 ${SHARE_MAX_MEMBERS}명까지만 함께 볼 수 있어요. 대기 중인 초대를 취소하거나 멤버를 내보낸 뒤 초대할 수 있어요.`
                : `나 말고 ${SHARE_MAX_MEMBERS}명까지 함께 볼 수 있어요. 대기 중인 초대도 인원에 들어가요. 초대받은 사람은 알림에서 ${SHARE_INVITE_DAYS}일 안에 수락하거나 거절할 수 있어요.`}
            </div>
            <button
              type="button"
              className="qbtn"
              onClick={handleInvite}
              disabled={postShare.isPending || seatsFull}
              aria-busy={postShare.isPending}
              style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postShare.isPending || seatsFull ? 'default' : 'pointer', fontFamily: 'inherit', opacity: postShare.isPending || seatsFull ? 0.7 : 1, transition: 'transform .12s' }}
            >
              {postShare.isPending ? '보내는 중…' : '초대 보내기'}
            </button>
          </div>

          {/* 공유 끄기 — 멤버가 있거나 대기 중인 초대가 있을 때만 */}
          {activeCount > 0 && (
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '0.5px solid var(--track)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="qbtn"
                  disabled={turningOff}
                  onClick={() => setConfirmTurnOff((v) => !v)}
                  style={{ ...SMALL_BTN_STYLE, color: 'var(--down)' }}
                >
                  공유 끄기
                </button>
                <span style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>모든 멤버가 이 계좌를 더 볼 수 없게 되고, 대기 중인 초대도 취소돼요</span>
              </div>
              {confirmTurnOff && (
                <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>&lsquo;{account?.name ?? '이 계좌'}&rsquo; 공유를 끌까요?</div>
                  <div style={HINT_STYLE}>
                    함께 보던 {groups.members.length}명이 더는 이 계좌를 볼 수 없고 대기 중인 초대 {groups.pending.length}건도 취소돼요.
                    멤버가 적은 거래는 계좌에 그대로 남아요. 다시 공유하려면 새로 초대해야 해요.
                  </div>
                  {turnOffError && <div role="alert" style={{ ...ERROR_STYLE, marginTop: 0 }}>{turnOffError}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="qbtn" disabled={turningOff} onClick={() => void turnOff()} aria-busy={turningOff} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: turningOff ? 0.6 : 1 }}>
                      {turningOff ? '끄는 중…' : '공유를 끌게요'}
                    </button>
                    <button type="button" className="qbtn" disabled={turningOff} onClick={() => setConfirmTurnOff(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
