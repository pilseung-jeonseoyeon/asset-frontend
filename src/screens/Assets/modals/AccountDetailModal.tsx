// 계좌 상세 모달. `state.modalOpen`이 아니라 전용 필드 `state.accountDetail !== null`로 열림을
// 판단한다(AssetCategoryModal과 같은 패턴). AssetCategoryModal의 계좌 행(z-index 80, §7-1 1단 모달)
// 에서 열리므로 이 모달은 2단(z-index 90)이다 — 같은 부모에서 열리는
// EditAccountModal/AddAccountModal과 같다.
//
// 데이터: GET /accounts/{id}(계좌 정보·통화별 예수금·보유 종목 평가액) + GET /transactions?accountId=
// (가계부 거래) + GET /trades?accountId=(주식·가상자산 계좌의 매수·매도).
// '원금 대비 +N%' 배지는 AccountResponse에 원금이 없어 그리지 않는다.
//
// **대표 금액은 총 평가액(totalValueKrw)이다.** 그 아래에 원화 예수금 · 달러 예수금 · 보유 종목으로
// 쪼갠 줄을 붙인다(assetsView의 buildAccountBalanceView). balanceKrw(예수금만)를 '현재 잔액'으로
// 보여주면 주식 계좌에서 보유 종목 평가액이 통째로 빠져 실제보다 작게 보인다.
//
// **GET /accounts/{id}만 응답이 한 겹 감싸져 있다**(AccountDetailResponse) — accountQuery.data는 계좌
// 자체가 아니라 { account, holdingValueKrw, totalValueKrw }다. 목록·생성·수정·잔액정정 API는 여전히
// 계좌를 그대로 돌려주므로 여기서만 .account를 꺼낸다.
//
// **'최근 거래내역'은 두 리소스를 합친 목록이다.** 서버에 둘을 함께 주는 API가 없어 프론트가
// 날짜순으로 병합한다(assetsView의 buildAccountActivity). 매매는 가계부 거래를 따로 만들지 않으므로
// 같은 건이 두 번 뜨지 않는다. GET /trades는 매매가 있을 수 있는 유형(주식·가상자산)에서만 부른다 —
// 현금 계좌까지 부르면 언제나 빈 응답인 요청을 계좌를 열 때마다 한 번씩 더 보내게 된다.
//
// **'최근 6개월 추이' 칸은 없다**(사용자 결정). 채울 수 없는 빈 상자가 잔액과 거래내역 사이를
// 가로막고 있을 이유가 없다.
// **GET /dashboard/trend?type=으로 되살리지 말 것**: 그 API에는 계좌를 지정하는 파라미터가 없어 그
// 유형 계좌 **전부의 합계**를 돌려준다 — 증권 계좌가 8개면 8개 합계가 나오므로 계좌 하나의 추이인
// 척 그리면 틀린 숫자가 된다. 자산군 단위 그래프는 AssetCategoryModal이 쓴다.
// 백엔드에 계좌별 추이(accountId 필터)가 생기면 그때 이 자리에 선 그래프를 만든다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { buildAccountActivity, buildAccountBalanceView, buildAccountDetailHeader } from '../../../data/assetsView'
import { buildLedgerTx, describeQueryError } from '../../../data/ledgerView'
import { buildTradeRows, marketsOfAccountType } from '../../../data/stocksView'
import { useGetAccount, useGetAccounts } from '@/services/account'
import { useGetTransactions } from '@/services/transaction'
import { useGetTrades } from '@/services/trade'

const RECENT_TX_SIZE = 5

export function AccountDetailModal() {
  const { state, setState } = useAppState()
  const accountId = state.accountDetail
  const isOpen = accountId !== null

  const accountQuery = useGetAccount(isOpen ? accountId : null)
  const txQuery = useGetTransactions(
    { accountId: accountId ?? undefined, page: 1, size: RECENT_TX_SIZE },
    { enabled: isOpen },
  )
  // 매매가 있을 수 있는 유형인지는 계좌 응답이 와야 알 수 있다 — 그전까지는 요청을 보내지 않는다.
  const hasTrades = accountQuery.data
    ? marketsOfAccountType(accountQuery.data.account.type).length > 0
    : false
  const tradesQuery = useGetTrades(
    { accountId: accountId ?? undefined },
    { enabled: isOpen && hasTrades },
  )
  // TRANSFER 거래의 상대 계좌명 조인용(ledgerView.buildLedgerTx가 요구하는 인자).
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })

  if (!isOpen) return null

  const closeAccount = () => setState({ accountDetail: null })

  const detail = accountQuery.data
  const account = detail?.account
  const err = describeQueryError(accountQuery.error)
  const header = account ? buildAccountDetailHeader(account) : null
  const balanceView = detail ? buildAccountBalanceView(detail) : null
  // 두 목록을 각자의 규칙으로 최신순으로 만든 뒤 날짜로 병합해 상위 RECENT_TX_SIZE건만 남긴다.
  // 매매는 여기서 limit을 걸지 않고(buildTradeRows 기본값 10건) 병합 후에 자른다 — 매매가 몰린
  // 날이 있으면 가계부 거래가 밀려날 수 있는데, 그건 "최근에 일어난 일"이라는 기준상 맞는 동작이다.
  const txRows = buildLedgerTx(txQuery.data?.content ?? [], accountsQuery.data ?? [])
  const tradeRows = buildTradeRows(tradesQuery.trades)
  const activityRows = buildAccountActivity(txRows, tradeRows, RECENT_TX_SIZE)
  // 둘 중 하나만 실패해도 나머지는 보여준다 — 매매를 못 불러왔다고 가계부 거래까지 감출 이유가 없다.
  const activityError = txQuery.error ?? tradesQuery.error

  return (
    <Modal onClose={closeAccount} zIndex={90} width={560} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {accountQuery.isPending ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={closeAccount}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
        </>
      ) : err || !account || !header || !balanceView ? (
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
            <div style={{ fontSize: 12, color: 'var(--text-weak)', marginBottom: 4 }}>{balanceView.totalLabel}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{balanceView.totalText}원</div>
            {balanceView.totalCaption && (
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 4 }}>{balanceView.totalCaption}</div>
            )}
            {/* 총액을 무엇으로 쪼갠 것인지 — 쪼갤 것이 없는 계좌(원화 예수금뿐)에서는 rows가 비어 있어
                이 블록 자체가 그려지지 않는다(같은 숫자를 두 번 보여주지 않기 위해, buildAccountBalanceView). */}
            {balanceView.rows.length > 0 && (
              <div style={{ marginTop: 14, borderTop: '0.5px solid var(--track)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {balanceView.rows.map((row) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-weak)', flex: 1, minWidth: 0 }}>{row.label}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-mid)' }}>{row.valueText}</div>
                      {/* 달러 줄의 원화 환산액 — 서버가 준 cashUsdKrw 그대로다(프론트 환산 아님). */}
                      {row.note && (
                        <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{row.note}</div>
                      )}
                    </div>
                  </div>
                ))}
                {/* 환율 안내는 목록의 한 줄이 아니라 달러 줄에 대한 각주다 — 위 줄들과 살짝 띄워 구분한다. */}
                {balanceView.rateNote && (
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{balanceView.rateNote}</div>
                )}
              </div>
            )}
          </div>

          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>최근 거래내역</div>
          {txQuery.isPending || (hasTrades && tradesQuery.isPending) ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : activityRows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '13px 0' }}>
              {activityError ? activityError.message : '이 계좌의 거래내역이 아직 없어요.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activityRows.map((t) => (
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
                  {/* amountText에 '원'·'$'가 이미 들어 있다 — 여기서 '원'을 덧붙이면 해외 종목
                      매매($1,101.75)가 원화로 잘못 읽힌다. */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, width: 110, textAlign: 'right', color: t.amountColor }}>{t.amountText}</div>
                </div>
              ))}
              {/* 한쪽만 실패했을 때: 보이는 목록이 전부가 아니라는 사실을 조용히 넘기지 않는다. */}
              {activityError && (
                <div style={{ fontSize: 11.5, color: 'var(--down)', paddingTop: 10 }}>
                  일부 내역을 불러오지 못했어요: {activityError.message}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
