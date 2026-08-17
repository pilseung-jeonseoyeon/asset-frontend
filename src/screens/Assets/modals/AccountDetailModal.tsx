// Source: secret/Asset Manager v14.dc.html L2307-2366 (계좌 상세 드릴다운 모달, hasSelectedAccount) —
// layout transcribed verbatim, then wired to real data. Gated by `state.accountDetail !== null` (a
// dedicated state field), NOT `state.modalOpen` — same non-modalXxx pattern as AssetCategoryModal.
// Opened from AssetCategoryModal's account rows, which sit at z-index 80 (§7-1 1단 모달) — this is a
// 2단 모달 (z-index 90), same as EditAccountModal/AddAccountModal opened from the same parent.
//
// Data: GET /accounts/{id}(계좌 정보·현재 잔액) + GET /accounts/{id}/snapshots(최근 6개월 추이) +
// GET /transactions?accountId=(최근 거래내역). "원금 대비 +N%" 배지는 AccountResponse에 원금이 없어
// 제거했다 — docs/backend-requests.md 참고.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { recentMonthsRange } from '../../../utils/date'
import { fmt } from '../../../utils/format'
import { buildAccountDetailHeader, buildAccountTrendPath, formatBigAmountCaption } from '../../../data/assetsView'
import { buildLedgerTx, describeQueryError } from '../../../data/ledgerView'
import { useGetAccount, useGetAccounts, useGetAccountSnapshots } from '@/services/account'
import { useGetTransactions } from '@/services/transaction'

const TREND_RANGE_MONTHS = 6
const RECENT_TX_SIZE = 5

export function AccountDetailModal() {
  const { state, setState } = useAppState()
  const accountId = state.accountDetail
  const isOpen = accountId !== null

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const snapshotsQuery = useGetAccountSnapshots(isOpen ? accountId : null, recentMonthsRange(TREND_RANGE_MONTHS))
  const txQuery = useGetTransactions(
    { accountId: accountId ?? undefined, page: 1, size: RECENT_TX_SIZE },
    { enabled: isOpen },
  )
  // TRANSFER 거래의 상대 계좌명 조인용(ledgerView.buildLedgerTx가 요구하는 인자) — API-SPEC 참고.
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })

  if (!isOpen) return null

  const closeAccount = () => setState({ accountDetail: null })

  const account = accountQuery.data
  const err = describeQueryError(accountQuery.error)
  const header = account ? buildAccountDetailHeader(account) : null
  const bigAmountCaption = account ? formatBigAmountCaption(account.balanceKrw) : null
  const trendPath = snapshotsQuery.data ? buildAccountTrendPath(snapshotsQuery.data) : null
  const txRows = buildLedgerTx(txQuery.data?.content ?? [], accountsQuery.data ?? [])

  return (
    <Modal onClose={closeAccount} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {accountQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : err || !account || !header ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={closeAccount}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: err?.muted ? 'var(--text-weak)' : 'var(--down)' }}>
            {err?.message ?? '계좌 정보를 불러오지 못했어요.'}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="account_balance" size={20} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
                  {header.subtitle}
                  {header.maturityLabel ? ` · ${header.maturityLabel}` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={closeAccount}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 4 }}>현재 잔액</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{fmt(account.balanceKrw)}원</div>
            {bigAmountCaption && (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }}>{bigAmountCaption}</div>
            )}
          </div>

          <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 8 }}>최근 {TREND_RANGE_MONTHS}개월 추이</div>
            {snapshotsQuery.isPending ? (
              <div aria-busy style={{ fontSize: 12, color: 'var(--text-weak)', height: 56, display: 'flex', alignItems: 'center' }}>—</div>
            ) : snapshotsQuery.error ? (
              <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{snapshotsQuery.error.message}</div>
            ) : trendPath ? (
              <svg viewBox="0 0 100 44" style={{ width: '100%', height: 56, display: 'block' }} preserveAspectRatio="none">
                <path d={trendPath} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-weak)', padding: '10px 0' }}>추이를 표시할 데이터가 아직 없어요.</div>
            )}
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>최근 거래내역</div>
          {txQuery.isPending ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : txQuery.error ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{txQuery.error.message}</div>
          ) : txRows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '13px 0' }}>
              이 계좌의 거래내역이 아직 없어요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {txRows.map((t) => (
                <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--track)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</div>
                  </div>
                  {t.tag && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)' }}>
                      {t.tag}
                    </span>
                  )}
                  <div style={{ fontSize: 13.5, fontWeight: 700, width: 110, textAlign: 'right', color: t.amountColor }}>{t.amount}원</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
