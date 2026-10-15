// 설정 → 가족 · 커플 공유(시안 9번). 받은 초대 · 내가 공유 중 · 참여 중을 한곳에 모은다.
// 알림을 놓친 초대를 여기서 처리하고, 내가 공유 중인 계좌의 [관리](ShareMembersModal)와 참여 중인
// 계좌의 [나가기]를 여기서도 누른다. **새 초대는 여기서 보내지 않는다** — 초대의 집은 계좌 상세다
// (A안, 연동이 '계좌 추가에서 등록 → 설정에서 관리'인 것과 같은 짝).
//
// 데이터: GET /shares?side=MEMBER(받은 초대 — PENDING만), GET /shares?side=OWNER(내가 공유 중 — 계좌별로
// 묶는다), GET /shares/accounts(참여 중). 세 조회 모두 모달이 열려 있을 때만 보낸다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { AvatarStack } from '../../../components/primitives/AvatarStack/AvatarStack'
import { ShareBadge } from '../../../components/primitives/ShareBadge/ShareBadge'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { ACCOUNT_TYPE_LABELS, assetClassMetaOf, assetClassOfAccountType } from '../../../data/assetsView'
import { describeShareError, formatShareDate } from '../../../data/shareView'
import { formatNumber } from '../../../utils/format'
import { ApiError } from '@/services/api'
import { useDeleteShare, useGetSharedAccounts, useGetShares, usePatchShare } from '@/services/share'
import type { ShareResponse } from '@/services/share'
import type { AccountType } from '@/services/common.type'

const SECTION_TITLE_STYLE: CSSProperties = { fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }
const COUNT_STYLE: CSSProperties = {
  minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, boxSizing: 'border-box', background: 'var(--track)',
  color: 'var(--text-mid)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
const EMPTY_STYLE: CSSProperties = { fontSize: 12.5, color: 'var(--text-weak)', padding: '4px 0 2px', lineHeight: 1.6 }
const ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', minWidth: 0,
}
const ICON_SQUARE_STYLE: CSSProperties = {
  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  background: 'var(--accent-soft)', color: 'var(--accent)',
}
const SMALL_BTN_STYLE: CSSProperties = {
  border: '0.5px solid var(--border)', background: 'var(--surface)', borderRadius: 8,
  padding: '8px 12px', minHeight: 36, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)',
  cursor: 'pointer', fontFamily: 'inherit', flex: 'none', whiteSpace: 'nowrap',
}
const HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeShareError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

/** 내가 공유 중인 계좌 한 묶음 — 같은 계좌의 초대·멤버 행을 모은다. */
interface OwnedAccountGroup {
  accountId: number
  accountName: string
  accountType: AccountType
  members: ShareResponse[]
  pendingCount: number
}

/** 소유자 목록을 계좌별로 묶는다. 공유 중이거나 대기 중인 초대가 있는 계좌만 남긴다(종료된 계좌는 뺀다). */
function groupByAccount(shares: ShareResponse[]): OwnedAccountGroup[] {
  const map = new Map<number, OwnedAccountGroup>()
  for (const s of shares) {
    if (s.status !== 'ACCEPTED' && s.status !== 'PENDING') continue
    const group = map.get(s.accountId) ?? { accountId: s.accountId, accountName: s.accountName, accountType: s.accountType, members: [], pendingCount: 0 }
    if (s.status === 'ACCEPTED') group.members.push(s)
    else group.pendingCount += 1
    map.set(s.accountId, group)
  }
  return [...map.values()]
}

function AccountTypeIcon({ type }: { type: AccountType }) {
  const meta = assetClassMetaOf(assetClassOfAccountType(type))
  return (
    <span style={ICON_SQUARE_STYLE}>
      <Icon name={meta.icon} size={17} />
    </span>
  )
}

interface RowNote {
  shareId: number
  text: string
}

export function FamilyShareModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const isOpen = state.openModal === 'familyShare'

  const receivedQuery = useGetShares({ side: 'MEMBER' }, { enabled: isOpen })
  const ownedQuery = useGetShares({ side: 'OWNER' }, { enabled: isOpen })
  const joinedQuery = useGetSharedAccounts({ enabled: isOpen })
  const patchShare = usePatchShare()
  const deleteShare = useDeleteShare()
  const [confirmLeaveId, setConfirmLeaveId] = useState<number | null>(null)
  const [note, setNote] = useState<RowNote | null>(null)

  if (!isOpen) return null

  const received = receivedQuery.shares.filter((s) => s.status === 'PENDING')
  const owned = groupByAccount(ownedQuery.shares)
  const joined = joinedQuery.sharedAccounts

  const closeAndReset = () => {
    setConfirmLeaveId(null)
    setNote(null)
    patchShare.reset()
    deleteShare.reset()
    closeModal()
  }

  const decline = (s: ShareResponse) => {
    setNote(null)
    patchShare.mutate(
      { shareId: s.id, body: { status: 'DECLINED' } },
      { onError: (e) => setNote({ shareId: s.id, text: messageOf(e, '거절하지 못했어요.') }) },
    )
  }

  const leave = (shareId: number) => {
    setNote(null)
    deleteShare.mutate(shareId, {
      onSuccess: () => setConfirmLeaveId(null),
      onError: (e) => setNote({ shareId, text: messageOf(e, '나가지 못했어요.') }),
    })
  }

  const anyPending = receivedQuery.isPending || ownedQuery.isPending || joinedQuery.isPending
  const retryButton = (refetch: () => void) => (
    <button type="button" onClick={refetch} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
      다시 시도
    </button>
  )

  return (
    <Modal onClose={closeAndReset} zIndex={80} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="group" title="가족 · 커플 공유" onClose={closeAndReset} />
      <div aria-busy={anyPending} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 받은 초대 */}
        <section aria-label="받은 초대">
          <div style={SECTION_TITLE_STYLE}>
            받은 초대 <span style={COUNT_STYLE}>{received.length}</span>
          </div>
          {receivedQuery.isPending ? (
            <div style={EMPTY_STYLE}>—</div>
          ) : receivedQuery.error ? (
            <div role="alert" style={{ ...HINT_STYLE, color: 'var(--down)' }}>받은 초대를 불러오지 못했어요. {retryButton(() => void receivedQuery.refetch())}</div>
          ) : received.length === 0 ? (
            <div style={EMPTY_STYLE}>받은 초대가 없어요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {received.map((s) => {
                const busy = patchShare.isPending && patchShare.variables?.shareId === s.id
                const rowNote = note?.shareId === s.id ? note : null
                return (
                  <div key={s.id}>
                    <div style={{ ...ROW_STYLE, borderColor: 'var(--accent)', flexWrap: 'wrap' }}>
                      <span style={ICON_SQUARE_STYLE}><Icon name="mail" size={17} /></span>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.accountName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{s.owner.name} · {formatShareDate(s.expiresAt)}까지</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                        <button
                          type="button"
                          className="qbtn"
                          disabled={busy}
                          onClick={() => setState({ shareInviteConfirmId: s.id })}
                          style={{ ...SMALL_BTN_STYLE, border: 'none', background: 'var(--accent)', color: '#fff' }}
                        >
                          확인하기
                        </button>
                        <button type="button" className="qbtn" disabled={busy} onClick={() => decline(s)} style={{ ...SMALL_BTN_STYLE, opacity: busy ? 0.6 : 1 }}>
                          {busy ? '처리 중…' : '거절'}
                        </button>
                      </div>
                    </div>
                    {rowNote && <div role="alert" style={ERROR_STYLE}>{rowNote.text}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 내가 공유 중 */}
        <section aria-label="내가 공유 중">
          <div style={SECTION_TITLE_STYLE}>
            내가 공유 중 <span style={COUNT_STYLE}>{owned.length}</span>
          </div>
          {ownedQuery.isPending ? (
            <div style={EMPTY_STYLE}>—</div>
          ) : ownedQuery.error ? (
            <div role="alert" style={{ ...HINT_STYLE, color: 'var(--down)' }}>공유 중인 계좌를 불러오지 못했어요. {retryButton(() => void ownedQuery.refetch())}</div>
          ) : owned.length === 0 ? (
            <div style={EMPTY_STYLE}>아직 함께 보는 계좌가 없어요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {owned.map((g) => (
                <div key={g.accountId} style={{ ...ROW_STYLE, flexWrap: 'wrap' }}>
                  <AccountTypeIcon type={g.accountType} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.accountName}</span>
                      {g.members.length > 0 && <ShareBadge />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>
                      {ACCOUNT_TYPE_LABELS[g.accountType]} · 멤버 {formatNumber(g.members.length)}
                      {g.pendingCount > 0 && ` · 대기 ${formatNumber(g.pendingCount)}`}
                    </div>
                  </div>
                  {g.members.length > 0 && <AvatarStack names={g.members.map((m) => m.member.name)} pendingCount={g.pendingCount} />}
                  <button
                    type="button"
                    className="qbtn"
                    onClick={() => setState({ shareMembersAccountId: g.accountId, shareMembersReturnTo: null })}
                    style={SMALL_BTN_STYLE}
                  >
                    관리
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 참여 중 */}
        <section aria-label="참여 중">
          <div style={SECTION_TITLE_STYLE}>
            참여 중 <span style={COUNT_STYLE}>{joined.length}</span>
          </div>
          {joinedQuery.isPending ? (
            <div style={EMPTY_STYLE}>—</div>
          ) : joinedQuery.error ? (
            <div role="alert" style={{ ...HINT_STYLE, color: 'var(--down)' }}>참여 중인 계좌를 불러오지 못했어요. {retryButton(() => void joinedQuery.refetch())}</div>
          ) : joined.length === 0 ? (
            <div style={EMPTY_STYLE}>다른 사람이 초대하면 여기에 보여요.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {joined.map((s) => {
                const busy = deleteShare.isPending && deleteShare.variables === s.shareId
                const rowNote = note?.shareId === s.shareId ? note : null
                return (
                  <div key={s.shareId}>
                    <div style={{ ...ROW_STYLE, flexWrap: 'wrap' }}>
                      {/* 행 컨테이너는 일반 div, 계좌 열기 버튼과 나가기 버튼을 형제로 둔다(중첩 상호작용 요소 회피). */}
                      <button
                        type="button"
                        onClick={() => setState({ sharedAccountDetailId: s.account.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 140, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}
                      >
                        <AccountTypeIcon type={s.account.type} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.account.name}</span>
                            <ShareBadge />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>
                            {s.owner.name}님의 계좌 · {formatShareDate(s.acceptedAt)}부터
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatNumber(s.totalValueKrw)}원</span>
                      </button>
                      <button
                        type="button"
                        className="qbtn"
                        disabled={busy}
                        onClick={() => {
                          setNote(null)
                          setConfirmLeaveId((id) => (id === s.shareId ? null : s.shareId))
                        }}
                        style={{ ...SMALL_BTN_STYLE, color: 'var(--down)', opacity: busy ? 0.6 : 1 }}
                      >
                        {busy ? '나가는 중…' : '나가기'}
                      </button>
                    </div>
                    {confirmLeaveId === s.shareId && (
                      <div style={{ marginTop: 6, background: 'var(--fill-subtle)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>&lsquo;{s.account.name}&rsquo;에서 나갈까요?</div>
                        <div style={HINT_STYLE}>내가 적은 거래는 계좌에 남지만, 내 화면에서는 더 보이지 않아요. 다시 보려면 {s.owner.name}님이 새로 초대해야 해요.</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="qbtn" disabled={busy} onClick={() => leave(s.shareId)} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
                            나갈게요
                          </button>
                          <button type="button" className="qbtn" onClick={() => setConfirmLeaveId(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                    {rowNote && <div role="alert" style={ERROR_STYLE}>{rowNote.text}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div style={HINT_STYLE}>
          계좌를 더 공유하려면 자산 화면에서 현금·예적금 계좌를 열고 <b style={{ color: 'var(--text-strong)' }}>초대하기</b>를 눌러요.
          공유받은 계좌는 내 총자산에 들어가지 않아요.
        </div>
      </div>
    </Modal>
  )
}
