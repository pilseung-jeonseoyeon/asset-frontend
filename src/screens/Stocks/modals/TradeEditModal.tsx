// Source: no dc.html equivalent — 원본 프로토타입에는 매매 내역 화면 자체가 없었다. GET/PUT/DELETE
// /trades 훅(src/services/trade)은 이미 구현돼 있었는데 호출부가 0건이라(docs/backend-request.md
// 4-1) 매수·매도를 잘못 입력하면 수정도 삭제도 못 했다 — 이 모달이 그 진입점이다. 가계부
// LedgerEntryModal의 "수정 + 인라인 삭제 확인" 패턴을 그대로 옮겨왔다. z-index 80, width 440px,
// maxHeight 86vh(LedgerEntryModal/ExchangeAddModal과 같은 톤).
//
// UpdateTradeRequest는 accountId/stockId를 받지 않는다(trade.type.ts) — LedgerEntryModal의
// LockedAccountField와 같은 이유로 종목·계좌를 읽기 전용으로 보여준다. side(매수/매도)는 API상으로는
// 수정 가능한 필드지만, 매수↔매도 전환은 이 거래가 나타내는 경제적 사건 자체를 바꾸는 것이라(보유
// 수량·평단가 계산에 미치는 영향이 크다) 이 모달의 편집 범위(수량·단가·수수료·일자)에서 일부러 뺐다.
//
// GET /trades/{id} 단건 조회가 없어(가계부와 같은 제약), Stocks.tsx의 매매 내역 섹션이 쓰는 것과
// 같은 캐시(qk.trade.list({}))에서 editingTradeId로 찾는다 — 별도 네트워크 요청이 없다.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { MARKET_LABELS, marketToCurrency } from '../../../data/stocksView'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useDeleteTrade, useGetTrades, usePutTrade } from '@/services/trade'
import type { UpdateTradeRequest } from '@/services/trade'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const LOCKED_FIELD_STYLE: CSSProperties = { ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, color: 'var(--text-weak)' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

export function TradeEditModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const editingTradeId = state.editingTradeId
  const isOpen = state.modalOpen === 'tradeEdit' && editingTradeId !== null
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  // Stocks.tsx의 매매 내역 섹션과 같은 쿼리키(qk.trade.list({}))를 공유한다 — 별도 요청이 나가지 않는다.
  const tradesQuery = useGetTrades({}, { enabled: isOpen })
  const trade = tradesQuery.trades.find((t) => t.id === editingTradeId) ?? null
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accountName = accountsQuery.data?.find((a) => a.id === trade?.accountId)?.name ?? '—'

  const putTrade = usePutTrade()
  const deleteTrade = useDeleteTrade()

  const [quantityStr, setQuantityStr] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [feeStr, setFeeStr] = useState('')
  const [amountInvalid, setAmountInvalid] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [syncedId, setSyncedId] = useState<number | null>(null)

  const todayISO = toISODate(new Date())
  const dpTradeDate = useDatePicker(
    'tradeEditDate',
    isoDateToDisplay(trade?.tradeDate ?? todayISO),
    isoDateToNav(trade?.tradeDate ?? null),
    todayISO,
  )

  const putReset = putTrade.reset
  const deleteReset = deleteTrade.reset

  // 폼 초기값 채우기(예외적으로 허용 — docs/state-management.md "서버 데이터를 AppState로 복사하지
  // 말 것. 단, 폼 초기값을 채우는 것은 예외"). 렌더 중 setState를 부르면 안 되므로 커밋 후 useEffect에서.
  useEffect(() => {
    if (!isOpen || !trade || syncedId === trade.id) return
    setQuantityStr(String(trade.quantity))
    setPriceStr(String(trade.price))
    setFeeStr(trade.fee ? String(trade.fee) : '')
    setSyncedId(trade.id)
    setAmountInvalid(false)
    setDeleteConfirmOpen(false)
    setState((st) => ({
      dpPicked: { ...st.dpPicked, tradeEditDate: undefined },
      dpNav: { ...st.dpNav, tradeEditDate: undefined },
    }))
    putReset()
    deleteReset()
  }, [isOpen, trade, syncedId, setState, putReset, deleteReset])

  if (!isOpen) return null

  const isFormReady = !!trade && syncedId === trade.id

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      editingTradeId: null,
      dpPicked: { ...st.dpPicked, tradeEditDate: undefined },
      dpNav: { ...st.dpNav, tradeEditDate: undefined },
      openDropdown: null,
    }))
    setQuantityStr('')
    setPriceStr('')
    setFeeStr('')
    setAmountInvalid(false)
    setDeleteConfirmOpen(false)
    setSyncedId(null)
    putTrade.reset()
    deleteTrade.reset()
  }

  const currencySymbol = trade && marketToCurrency(trade.market) === 'USD' ? '$' : '₩'

  const handleSave = () => {
    if (!trade) return
    const quantity = Number(quantityStr)
    const price = Number(priceStr)
    const missingAmount = !quantityStr || !quantity || !priceStr || !price
    setAmountInvalid(missingAmount)
    if (missingAmount) return

    const picked = state.dpPicked['tradeEditDate'] as { y: number; m: number; d: number } | undefined
    const tradeDate = picked ? pickedToISODate(picked) : trade.tradeDate
    const fee = Number(feeStr)

    // PUT은 전체 교체다. 이 모달이 편집하지 않는 필드(환율·메모)를 다시 실어 보내지 않으면 저장할
    // 때마다 원래 값이 지워진다(과거 일자 해외 매매에 오늘 환율이 다시 적용되는 등) — 값이 있던
    // 필드만 그대로 되돌려 보낸다.
    const body: UpdateTradeRequest = {
      side: trade.side,
      quantity,
      price,
      tradeDate,
      ...(feeStr && fee ? { fee } : {}),
      ...(trade.exchangeRate !== null ? { exchangeRate: trade.exchangeRate } : {}),
      ...(trade.memo !== null ? { memo: trade.memo } : {}),
    }
    putTrade.mutate({ id: trade.id, body }, { onSuccess: resetAndClose })
  }

  const handleDelete = () => {
    if (!trade) return
    deleteTrade.mutate(trade.id, { onSuccess: resetAndClose })
  }

  const isBusy = putTrade.isPending || deleteTrade.isPending
  const insufficientHolding = putTrade.error instanceof ApiError && putTrade.error.code === 'INSUFFICIENT_HOLDING'
  const fxMissing = putTrade.error instanceof ApiError && putTrade.error.code === 'FX_RATE_NOT_FOUND'
  const genericError = putTrade.error && !insufficientHolding && !fxMissing ? putTrade.error.message : null
  const deleteErrorMessage = deleteTrade.error?.message ?? null

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <ModalHeader icon={trade?.side === 'SELL' ? 'trending_down' : 'show_chart'} title="매매 내역 수정" onClose={resetAndClose} />
      {!isFormReady || !trade ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={fieldRowStyle}>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>종목</div>
              <div style={LOCKED_FIELD_STYLE}>
                {trade.stockName}
                {trade.ticker && ` (${trade.ticker})`}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>거래 유형</div>
              <div style={LOCKED_FIELD_STYLE}>
                {trade.side === 'BUY' ? '매수' : '매도'} · {MARKET_LABELS[trade.market]}
              </div>
            </div>
          </div>
          <div>
            <div style={LABEL_STYLE}>계좌</div>
            <div style={LOCKED_FIELD_STYLE}>{accountName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
              종목·거래유형·계좌는 수정할 수 없어요. 바꾸려면 삭제 후 다시 등록해주세요.
            </div>
          </div>
          <div style={fieldRowStyle}>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>수량</div>
              <input
                type="text" inputMode="decimal" placeholder="0"
                value={quantityStr}
                onChange={(e) => {
                  setQuantityStr(sanitizeDecimalInput(e.target.value, 6))
                  setAmountInvalid(false)
                }}
                style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
              />
              {insufficientHolding && <div style={ERROR_STYLE}>보유 수량보다 많이 팔 수 없어요</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>단가</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{currencySymbol}</span>
                <input
                  type="text" inputMode="decimal" placeholder="0"
                  value={priceStr}
                  onChange={(e) => {
                    setPriceStr(sanitizeDecimalInput(e.target.value, 2))
                    setAmountInvalid(false)
                  }}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              </div>
            </div>
          </div>
          {amountInvalid && <div style={ERROR_STYLE}>수량과 단가를 입력해주세요</div>}

          <div>
            <div style={LABEL_STYLE}>수수료 (선택)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{currencySymbol}</span>
              <input
                type="text" inputMode="decimal" placeholder="0"
                value={feeStr}
                onChange={(e) => setFeeStr(sanitizeDecimalInput(e.target.value, 2))}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>{trade.side === 'SELL' ? '매도일' : '매수일'}</div>
            <DatePicker dp={dpTradeDate} />
          </div>

          {fxMissing && (
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
              아직 환율 정보를 가져오지 못했어요. 잠시 후 다시 시도해주세요.
            </div>
          )}
          {genericError && <div style={ERROR_STYLE}>{genericError}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={isBusy}
              aria-busy={putTrade.isPending}
              className="qbtn"
              style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1, transition: 'transform .12s' }}
            >
              {putTrade.isPending ? '저장 중…' : '변경사항 저장'}
            </button>
            {!deleteConfirmOpen && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isBusy}
                className="qbtn"
                style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
              >
                삭제
              </button>
            )}
          </div>

          {deleteConfirmOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>정말 삭제할까요?</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>
                삭제한 매매 기록은 되돌릴 수 없고, 보유 수량·평단가가 다시 계산돼요.
              </div>
              {deleteErrorMessage && <div style={ERROR_STYLE}>{deleteErrorMessage}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDelete}
                  disabled={isBusy}
                  aria-busy={deleteTrade.isPending}
                  className="qbtn"
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
                >
                  {deleteTrade.isPending ? '삭제 중…' : '삭제할게요'}
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isBusy}
                  className="qbtn"
                  style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
