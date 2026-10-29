// '우리집'(가족·커플 공유 v17)에서 연 상대 계좌의 상세 — 보기만 한다(수정·잔액 정정·해지·거래 등록 없음).
// 열기: AppState.partnerAccountDetailId(자산 화면 '우리집'의 상대 계좌 줄). 내 계좌는 AccountDetailModal이 연다.
//
// 데이터: GET /accounts/{id}(서버가 '우리집'에 공유된 계좌만 허용) + GET /transactions?accountId=&scope=SHARED.
// 상대가 '이전 내역 공유'를 껐으면 공유 시작일 이후 거래만 온다(서버가 거른다). 상대의 비공유 계좌 이름은
// 서버가 가려 '다른 계좌'로 그린다(ledgerView). 공유 계좌는 현금·예적금뿐이라 매매·보유 종목 칸은 없다.

import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'
import { buildAccountActivity, buildAccountBalanceView, buildAccountDetailHeader } from '../../../data/assetsView'
import { buildLedgerTransactions, describeQueryError } from '../../../data/ledgerView'
import { shareHistoryLabel } from '../../../data/shareView'
import { useViewScope } from '../../../utils/viewScope'
import { useGetAccount, useGetAccounts } from '@/services/account'
import { useGetTransactions } from '@/services/transaction'

const RECENT_TX_SIZE = 10

const ROUND_BTN_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none',
}

export function PartnerAccountDetailModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const accountId = state.partnerAccountDetailId
  const isOpen = accountId !== null
  const { partnerName, spaceName } = useViewScope()

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const transactionsQuery = useGetTransactions(
    { accountId: accountId ?? undefined, page: 1, size: RECENT_TX_SIZE, scope: 'SHARED' },
    { enabled: isOpen },
  )
  // 이체 상대 계좌가 '우리집'에 공유된 계좌면 이름을 붙인다(서버가 가린 계좌는 '다른 계좌')
  const sharedAccountsQuery = useGetAccounts({ scope: 'SHARED' }, { enabled: isOpen })

  if (!isOpen) return null
  const close = () => setState({ partnerAccountDetailId: null })

  const detail = accountQuery.data
  const account = detail?.account
  const err = describeQueryError(accountQuery.error)
  const header = account ? buildAccountDetailHeader(account) : null
  const balanceView = detail ? buildAccountBalanceView(detail) : null
  const shared = (sharedAccountsQuery.data ?? []).find((a) => a.id === accountId)
  const rows = buildAccountActivity(
    buildLedgerTransactions(transactionsQuery.data?.content ?? [], sharedAccountsQuery.data ?? []),
    [],
    RECENT_TX_SIZE,
    accountId,
    sharedAccountsQuery.data ?? [],
  )

  return (
    <Modal onClose={close} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {accountQuery.isPending ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button type="button" onClick={close} aria-label="닫기" style={ROUND_BTN_STYLE}>
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
        </>
      ) : err || !account || !header || !balanceView ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button type="button" onClick={close} aria-label="닫기" style={ROUND_BTN_STYLE}>
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: err?.muted ? 'var(--text-weak)' : 'var(--down)' }}>
            {err?.message ?? '공유가 끝났거나 계좌를 불러오지 못했어요.'}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12, ...sheetStickyHeaderStyle(isMobile) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="account_balance" size={20} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
                  {header.subtitle} · {partnerName ?? '상대'}
                  {header.maturityLabel ? ` · ${header.maturityLabel}` : ''}
                </div>
              </div>
            </div>
            <button type="button" onClick={close} aria-label="닫기" style={ROUND_BTN_STYLE}>
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 4 }}>{balanceView.totalLabel}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{balanceView.totalText}원</div>
            {balanceView.totalCaption && <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }}>{balanceView.totalCaption}</div>}
          </div>

          <div style={{ marginBottom: 18, padding: 13, borderRadius: 10, background: 'var(--fill-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name="visibility" size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{partnerName ?? '상대'}님이 '{spaceName}'에 공유한 계좌</div>
              <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>
                보기만 할 수 있어요{shared?.share ? ` · ${shareHistoryLabel(shared.share.includeHistory)}` : ''}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>최근 거래내역</div>
          {transactionsQuery.isPending ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '13px 0' }}>
              {transactionsQuery.error ? transactionsQuery.error.message : '함께 볼 수 있는 거래내역이 아직 없어요.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  {t.tag && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)' }}>{t.tag}</span>
                  )}
                  <div style={{ fontSize: 13.5, fontWeight: 700, width: 110, textAlign: 'right', color: t.amountColor }}>{t.amountText}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
