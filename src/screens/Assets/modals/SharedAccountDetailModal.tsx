// 공유받은 계좌의 상세(시안 4번 — 참여한 사람이 보는 계좌 상세). `state.sharedAccountDetailId`로
// 열림을 판단한다. AccountDetailModal과 다른 모달인 이유: 데이터 출처가 전부 다르다 —
// GET /accounts/{id}는 남의 계좌라 404이고, 거래는 GET /shares/accounts/{id}/transactions, 매매·연동·
// 계좌 수정·잔액 정정·삭제는 없다(멤버는 계좌 자체를 못 고친다). 공통인 것은 잔액 뷰모델
// (buildAccountBalanceView)과 거래 행 모양뿐이라 그 둘만 재사용한다.
//
// 데이터: GET /shares/accounts(이 목록에서 계좌를 찾는다 — 단건 API가 없다), GET /shares/accounts/{id}/
// transactions(10건씩 '더 보기'). 잔액·거래는 소유자가 자기 상세에서 보는 것과 같은 숫자다(서버가 소유자
// userId로 계산한다).
//
// 멤버에게 가리는 것: 소유자의 다른 계좌 이름(이체·저축 태그 → '다른 계좌', data/shareView.ts).
// EDITOR면 [수입·지출 기록]이 가계부 입력 모달(z-index 80)을 연다 — 이 모달(90)보다 아래 층이라 상세를
// 닫고 열고, 입력 모달이 닫히면 entryReturnSharedAccountId로 여기로 되돌아온다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { AvatarStack } from '../../../components/primitives/AvatarStack/AvatarStack'
import { ShareBadge } from '../../../components/primitives/ShareBadge/ShareBadge'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'
import { isoDateToDisplay } from '../../../utils/date'
import { ACCOUNT_TYPE_LABELS, buildAccountBalanceView } from '../../../data/assetsView'
import { TRANSACTION_TYPE_TO_ENTRY_TYPE } from '../../../data/ledgerView'
import { SHARE_ROLE_LABELS, buildSharedAccountActivity, describeShareError, formatShareDate } from '../../../data/shareView'
import type { SharedActivityRow } from '../../../data/shareView'
import { ApiError } from '@/services/api'
import { useDeleteShare, useGetSharedAccountTransactions, useGetSharedAccounts } from '@/services/share'
import { useGetMe } from '@/services/user'

const ICON_BUTTON_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
}
const HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }
const SMALL_BTN_STYLE: CSSProperties = {
  border: '0.5px solid var(--border)', background: 'var(--surface)', borderRadius: 8,
  padding: '8px 12px', minHeight: 36, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)',
  cursor: 'pointer', fontFamily: 'inherit', flex: 'none', whiteSpace: 'nowrap',
}
const AUTHOR_BADGE_STYLE: CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--inc-text)', background: 'var(--up-chip)', borderRadius: 6,
  padding: '2px 7px', flex: 'none', lineHeight: 1.4, whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis',
}

function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeShareError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

export function SharedAccountDetailModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const accountId = state.sharedAccountDetailId
  const isOpen = accountId !== null

  const sharedQuery = useGetSharedAccounts({ enabled: isOpen })
  const transactionsQuery = useGetSharedAccountTransactions(isOpen ? accountId : null, {}, { enabled: isOpen })
  const meQuery = useGetMe()
  const deleteShare = useDeleteShare()
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)

  if (!isOpen) return null

  const shared = sharedQuery.sharedAccounts.find((s) => s.account.id === accountId) ?? null
  const myUserId = meQuery.data?.id ?? null

  const closeModal = () => {
    setLeaveConfirmOpen(false)
    deleteShare.reset()
    setState({ sharedAccountDetailId: null, openDropdown: null })
  }

  const leave = () => {
    if (!shared) return
    deleteShare.mutate(shared.shareId, { onSuccess: closeModal })
  }

  /** EDITOR의 새 수입·지출. 상세를 닫고 입력 모달을 연 뒤, 닫히면 여기로 돌아온다(파일 상단 주석). */
  const openEntry = () => {
    setLeaveConfirmOpen(false)
    setState((prev) => ({
      sharedAccountDetailId: null,
      entryReturnSharedAccountId: accountId,
      openModal: 'ledgerEntry',
      entryType: 'expense',
      entryTabsVisible: true,
      editingTransactionId: null,
      entryAccountId: accountId,
      entryWithdrawAccountId: null,
      entrySubcategoryId: null,
      entryAmount: 0,
      entryDescription: '',
      entryMemo: '',
      entryDateOverride: null,
      entryDraftRestored: false,
      openDropdown: null,
      datePickerPicked: { ...prev.datePickerPicked, entry: undefined },
      datePickerViewingMonth: { ...prev.datePickerViewingMonth, entry: undefined },
    }))
  }

  /** 내가 적은 거래 수정 — 가계부 화면의 행 클릭과 같은 프리필 규칙. 계좌는 이 공유 계좌로 고정된다. */
  const openEdit = (row: SharedActivityRow) => {
    if (!row.mine || (row.raw.type !== 'INCOME' && row.raw.type !== 'EXPENSE')) return
    setLeaveConfirmOpen(false)
    setState((prev) => ({
      sharedAccountDetailId: null,
      entryReturnSharedAccountId: accountId,
      openModal: 'ledgerEntry',
      entryType: TRANSACTION_TYPE_TO_ENTRY_TYPE[row.raw.type as 'INCOME' | 'EXPENSE'],
      entryTabsVisible: true,
      editingTransactionId: row.id,
      entryAccountId: accountId,
      entryWithdrawAccountId: null,
      entrySubcategoryId: row.raw.subcategoryId,
      entryAmount: row.raw.amount,
      entryDescription: row.raw.description,
      entryMemo: row.raw.memo ?? '',
      entryDateOverride: isoDateToDisplay(row.isoDate),
      entryDraftRestored: false,
      openDropdown: null,
      datePickerPicked: { ...prev.datePickerPicked, entry: undefined },
      datePickerViewingMonth: { ...prev.datePickerViewingMonth, entry: undefined },
    }))
  }

  const closeButton = (
    <button type="button" onClick={closeModal} aria-label="닫기" style={ICON_BUTTON_STYLE}>
      <Icon name="close" size={19} color="var(--text-mid)" />
    </button>
  )

  if (sharedQuery.isPending) {
    return (
      <Modal onClose={closeModal} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>{closeButton}</div>
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      </Modal>
    )
  }

  if (sharedQuery.error || !shared) {
    return (
      <Modal onClose={closeModal} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>{closeButton}</div>
        <div style={{ fontSize: 12.5, color: sharedQuery.error ? 'var(--down)' : 'var(--text-weak)', lineHeight: 1.6 }}>
          {sharedQuery.error ? sharedQuery.error.message : '이 계좌는 더 이상 함께 보지 않아요. 공유가 끝났거나 계좌 주인이 계좌를 해지했을 수 있어요.'}
        </div>
      </Modal>
    )
  }

  const { account, owner, role } = shared
  const balanceView = buildAccountBalanceView(shared)
  const subtitle = [account.institutionName, `${owner.name}님의 계좌`].filter((p): p is string => !!p).join(' · ')
  const rows = buildSharedAccountActivity(transactionsQuery.transactions, accountId, myUserId, owner)
  const isEditor = role === 'EDITOR'
  const activityError = transactionsQuery.error ? messageOf(transactionsQuery.error, '거래내역을 불러오지 못했어요.') : null

  return (
    <Modal onClose={closeModal} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12, ...sheetStickyHeaderStyle(isMobile) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="account_balance" size={20} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name}</div>
              <ShareBadge title={`${owner.name}님과 함께 보는 중`} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle} · {ACCOUNT_TYPE_LABELS[account.type]}
            </div>
          </div>
        </div>
        {/* 멤버는 계좌를 고칠 수 없다 — 연필 버튼이 없다(시안 4번). */}
        {closeButton}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 4 }}>{balanceView.totalLabel}</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{balanceView.totalText}원</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }}>
          {balanceView.totalCaption ? `${balanceView.totalCaption} · ` : ''}{owner.name}님이 관리해요
        </div>
        {balanceView.rows.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '0.5px solid var(--track)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {balanceView.rows.map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-weak)', flex: 1, minWidth: 0 }}>{row.label}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>{row.valueText}</div>
                  {row.note && <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{row.note}</div>}
                </div>
              </div>
            ))}
            {balanceView.rateNote && <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{balanceView.rateNote}</div>}
          </div>
        )}
      </div>

      {/* 함께 보기 칸 — 누구와 보는지, 내 권한, 나가기 */}
      <div style={{ marginBottom: 18, padding: 13, borderRadius: 10, background: 'var(--fill-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <AvatarStack names={[owner.name, meQuery.data?.name ?? '']} />
          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{owner.name}님과 함께 보는 중</div>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>
              {isEditor
                ? `내가 적은 수입·지출은 ${owner.name}님의 가계부에 기록되고 ${owner.name}님에게도 보여요. `
                : '잔액과 내역을 볼 수 있어요(보기만). '}
              {formatShareDate(shared.acceptedAt)}부터 · {SHARE_ROLE_LABELS[role]}
            </div>
          </div>
          <button
            type="button"
            className="qbtn"
            disabled={deleteShare.isPending}
            onClick={() => setLeaveConfirmOpen((v) => !v)}
            style={{ ...SMALL_BTN_STYLE, color: 'var(--down)' }}
          >
            나가기
          </button>
        </div>
        {leaveConfirmOpen && (
          // 되돌릴 수 없는 동작이라 그 자리에서 확인(연동 해제와 같은 패턴). 내가 적은 거래가 남는다는 것과
          // 총자산에는 원래 안 들어가 있었다는 것을 함께 적는다 — 빠질 돈이 있다고 오해하지 않게.
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>&lsquo;{account.name}&rsquo;에서 나갈까요?</div>
            <div style={HINT_STYLE}>
              내가 적은 거래는 계좌에 남지만, 내 화면에서는 더 보이지 않아요. {owner.name}님에게 &lsquo;나갔어요&rsquo; 알림이 가요.
              다시 보려면 {owner.name}님이 새로 초대해야 해요.
            </div>
            {deleteShare.error && <div role="alert" style={{ fontSize: 11.5, color: 'var(--down)' }}>{messageOf(deleteShare.error, '나가지 못했어요.')}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="qbtn" disabled={deleteShare.isPending} onClick={leave} aria-busy={deleteShare.isPending} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteShare.isPending ? 0.6 : 1 }}>
                {deleteShare.isPending ? '나가는 중…' : '나갈게요'}
              </button>
              <button type="button" className="qbtn" onClick={() => setLeaveConfirmOpen(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>거래내역</div>
        {isEditor && (
          <button
            type="button"
            className="qbtn"
            onClick={openEntry}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', minHeight: 36, borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Icon name="edit_note" size={16} />
            수입·지출 기록
          </button>
        )}
      </div>
      {transactionsQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: activityError ? 'var(--down)' : 'var(--text-weak)', padding: '13px 0', lineHeight: 1.6 }}>
          {activityError ?? '이 계좌의 거래내역이 아직 없어요. 등록할 때 넣은 잔액과 잔액 정정은 내역에 표시되지 않아요.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((t) => {
            const editable = isEditor && t.mine && (t.raw.type === 'INCOME' || t.raw.type === 'EXPENSE')
            return (
              <div
                key={t.key}
                className={editable ? 'mini-hov' : undefined}
                role={editable ? 'button' : undefined}
                tabIndex={editable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (editable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    openEdit(t)
                  }
                }}
                onClick={editable ? () => openEdit(t) : undefined}
                title={editable ? '눌러서 고치기' : t.authorLabel ? `${t.authorLabel}님이 적은 거래예요 — 읽기 전용` : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)', borderRadius: 8, cursor: editable ? 'pointer' : 'default' }}
              >
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  {/* 남이 적은 거래에만 이름 배지(시안 3번). 내 거래에는 없다. */}
                  {t.authorLabel && <span style={AUTHOR_BADGE_STYLE}>{t.authorLabel}</span>}
                </div>
                {t.tag && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)', flex: 'none', maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.tag}
                  </span>
                )}
                <div style={{ fontSize: 13.5, fontWeight: 700, width: 110, textAlign: 'right', color: t.amountColor, flex: 'none' }}>{t.amountText}</div>
              </div>
            )
          })}
          {activityError && <div style={{ fontSize: 11.5, color: 'var(--down)', paddingTop: 10 }}>일부 내역을 불러오지 못했어요: {activityError}</div>}
          {transactionsQuery.hasNextPage && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <button
                type="button"
                className="tap-44"
                onClick={() => void transactionsQuery.fetchNextPage()}
                disabled={transactionsQuery.isFetchingNextPage}
                style={{ border: 'none', background: 'transparent', padding: '6px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2 }}
              >
                {transactionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                {!transactionsQuery.isFetchingNextPage && <Icon name="expand_more" size={18} ariaHidden />}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
