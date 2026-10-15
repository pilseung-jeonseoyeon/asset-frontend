// 초대 확인 창(시안 7번) — 수락하기 전에 무엇이 공유되는지 읽는다. 알림 패널의 초대 카드와 설정의
// '받은 초대'가 함께 여는 전역 오버레이라 layout/modals에 둔다(TermsDetailOverlay와 같은 이유).
// `state.shareInviteConfirmId`(shareId)로 열림을 판단한다.
//
// z-index 90: 알림 패널(60)·설정 모달(80) 어느 위에서도 떠야 한다.
// 데이터: GET /shares?side=MEMBER에서 shareId로 찾는다(단건 조회 API가 없다). 응답의 status는 만료를
// 반영한 값이라 기한이 지난 초대는 EXPIRED로 와서 버튼 대신 안내만 보인다.

import type { CSSProperties } from 'react'
import { Icon } from '../../primitives/Icon/Icon'
import { Avatar } from '../../primitives/Avatar/Avatar'
import { Modal } from '../../primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../primitives/Modal/sheetHeader'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'
import { ACCOUNT_TYPE_LABELS, assetClassMetaOf, assetClassOfAccountType } from '../../../data/assetsView'
import { SHARE_ROLE_LABELS, describeShareError, formatShareDate, shareInviteOutcomeLabel } from '../../../data/shareView'
import { ApiError } from '@/services/api'
import { useGetShares, usePatchShare } from '@/services/share'

const ICON_BUTTON_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
}
const LINE_STYLE: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.55 }

function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeShareError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

export function ShareInviteConfirmModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const shareId = state.shareInviteConfirmId
  const isOpen = shareId !== null

  const sharesQuery = useGetShares({ side: 'MEMBER' }, { enabled: isOpen })
  const patchShare = usePatchShare()

  if (!isOpen) return null

  const share = sharesQuery.shares.find((s) => s.id === shareId) ?? null

  const closeModal = () => {
    patchShare.reset()
    setState({ shareInviteConfirmId: null })
  }
  const respond = (status: 'ACCEPTED' | 'DECLINED') => {
    patchShare.mutate({ shareId, body: { status } }, { onSuccess: closeModal })
  }

  const busy = patchShare.isPending
  const errorMessage = patchShare.error ? messageOf(patchShare.error, '처리하지 못했어요.') : null
  const outcome = share ? shareInviteOutcomeLabel(share.status) : null
  const isEditor = share?.role === 'EDITOR'
  const accountMeta = share ? assetClassMetaOf(assetClassOfAccountType(share.accountType)) : null

  return (
    <Modal onClose={closeModal} zIndex={90} width={500} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, ...sheetStickyHeaderStyle(isMobile, 20) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="mail" size={20} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap' }}>초대 확인</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
              {share?.status === 'PENDING' ? `${formatShareDate(share.expiresAt)}까지 수락할 수 있어요` : '계좌 공유 초대'}
            </div>
          </div>
        </div>
        <button type="button" onClick={closeModal} aria-label="닫기" style={ICON_BUTTON_STYLE}>
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      {sharesQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : sharesQuery.error ? (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--down)' }}>{sharesQuery.error.message}</div>
      ) : !share ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>초대를 찾을 수 없어요. 이미 처리됐거나 취소된 초대일 수 있어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={share.owner.name} size="m" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{share.owner.name}님이 계좌에 초대했어요</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 3 }}>{formatShareDate(share.createdAt)}에 보낸 초대</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--fill-subtle)' }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface)', color: accountMeta?.color ?? 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name={accountMeta?.icon ?? 'account_balance'} size={19} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{share.accountName}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                {ACCOUNT_TYPE_LABELS[share.accountType]} · {SHARE_ROLE_LABELS[share.role]}
              </div>
            </div>
          </div>

          {outcome ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-mid)', lineHeight: 1.6, padding: '4px 0' }}>
              {share.status === 'EXPIRED'
                ? `기한이 지났어요. ${share.owner.name}님에게 다시 초대를 부탁해 주세요.`
                : share.status === 'ACCEPTED'
                  ? '이미 참여한 초대예요. 자산 화면의 함께 보는 계좌에서 볼 수 있어요.'
                  : `${outcome}. 다시 보려면 ${share.owner.name}님이 새로 초대해야 해요.`}
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>수락하면</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={LINE_STYLE}>
                    <Icon name="visibility" size={17} color="var(--accent)" style={{ flex: 'none' }} ariaHidden />
                    <span>이 계좌의 <b style={{ color: 'var(--text-strong)' }}>잔액과 모든 내역</b>이 보여요</span>
                  </div>
                  <div style={LINE_STYLE}>
                    <Icon name={isEditor ? 'edit_note' : 'edit_off'} size={17} color="var(--accent)" style={{ flex: 'none' }} ariaHidden />
                    <span>
                      {isEditor
                        ? <>내가 이 계좌에 적은 수입·지출은 <b style={{ color: 'var(--text-strong)' }}>{share.owner.name}님의 가계부</b>에 기록되고 {share.owner.name}님에게도 보여요</>
                        : <>보기만 할 수 있어요 — <b style={{ color: 'var(--text-strong)' }}>기록은 할 수 없어요</b></>}
                    </span>
                  </div>
                  <div style={LINE_STYLE}>
                    <Icon name="account_balance_wallet" size={17} color="var(--accent)" style={{ flex: 'none' }} ariaHidden />
                    <span>내 <b style={{ color: 'var(--text-strong)' }}>총자산에는 더해지지 않고</b>, 자산 화면의 &lsquo;함께 보는 계좌&rsquo;에서 따로 보여요</span>
                  </div>
                  <div style={LINE_STYLE}>
                    <Icon name="lock" size={17} color="var(--accent)" style={{ flex: 'none' }} ariaHidden />
                    <span>내 다른 계좌와 가계부는 {share.owner.name}님에게 보이지 않아요</span>
                  </div>
                </div>
              </div>
              {errorMessage && <div role="alert" style={{ fontSize: 11.5, color: 'var(--down)' }}>{errorMessage}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="qbtn"
                  disabled={busy}
                  onClick={() => respond('DECLINED')}
                  style={{ flex: 1, padding: 14, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}
                >
                  {busy && patchShare.variables?.body && 'status' in patchShare.variables.body && patchShare.variables.body.status === 'DECLINED' ? '처리 중…' : '거절'}
                </button>
                <button
                  type="button"
                  className="qbtn"
                  disabled={busy}
                  onClick={() => respond('ACCEPTED')}
                  aria-busy={busy}
                  style={{ flex: 2, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1, transition: 'transform .12s' }}
                >
                  {busy && patchShare.variables?.body && 'status' in patchShare.variables.body && patchShare.variables.body.status === 'ACCEPTED' ? '참여하는 중…' : '수락하기'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
