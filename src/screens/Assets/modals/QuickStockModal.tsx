// Source: secret/Asset Manager v14.dc.html L1172-1310 (modalQuickStock) — layout transcribed verbatim,
// then wired to GET /stocks(검색)/POST /stocks(신규 등록)/GET /stocks/holdings(매도 대상)/GET /accounts/
// POST /trades (previously uncontrolled/no-op mock inputs — see git history). z-index 80, width 480px,
// maxHeight 86vh (unchanged from source).
//
// Adapted vs. source:
//  - "종목" 검색 input은 이제 실제 검색(GET /stocks?keyword=)이다. 결과가 없으면 "새 종목으로 등록"
//    흐름을 열어 POST /stocks로 먼저 만든 뒤 자동으로 매매 대상으로 선택한다(STOCK_DUPLICATE 409는
//    이 등록 폼 옆에 인라인으로 뜬다).
//  - "섹터" 칩은 CreateTradeRequest에 필드가 없다(섹터는 종목 속성이지 매매 속성이 아니다) — 신규 종목
//    등록 시에만 보이도록 옮겼다.
//  - 두 번째 금액 필드를 "수수료 포함 총 지불액"(총액)에서 "매수/매도 단가"(단가)로 바꿨다 —
//    CreateTradeRequest가 price(단가)를 받지 총액을 받지 않아서다. 참고용으로 수량×단가 예상 총액을
//    캡션으로 보여준다. 수수료는 선택 입력으로 별도로 받는다(API가 지원하는 필드라 노출).
//  - 하드코딩된 "실현 수익 $600/920,000원" 블록은 대응 API가 없어 제거했다.
//  - stockAcct 드롭다운 키는 ExchangeAddModal의 exchangeAcct와 분리했다 — 두 모달이 같은 키를 쓰면
//    dd 상태를 공유해 한쪽에서 고른 계좌가 다른 쪽으로 새는 버그가 된다(과거 useDropdown 기반 구현의
//    실제 버그였음. 지금은 계좌 선택을 로컬 상태로 들고 있어 값 자체는 새지 않지만, 두 모달이 동시에
//    같은 openDropdown 키를 다투지 않도록 키는 여전히 분리한다).

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { fmt, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { buyMarketToMarket, marketToCurrency } from '../../../data/stocksView'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useGetHoldings, useGetStocks, usePostStock } from '@/services/stock'
import { usePostTrade } from '@/services/trade'
import type { CreateStockRequest } from '@/services/stock'
import type { CreateTradeRequest } from '@/services/trade'

function marketTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)', boxShadow: 'none',
  }
}
function sectorBtn(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}
const SECTOR_NAMES = ['반도체', '테크', '자동차', 'IT서비스', '금융', '헬스케어', '기타']
const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

export function QuickStockModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'quickStock'
  const stockModeSell = state.stockTradeMode === 'sell'
  const stockModeBuy = !stockModeSell
  const market = buyMarketToMarket(state.stockBuyMarket)
  const currency = marketToCurrency(market)
  const stockCurrencySymbol = currency === 'USD' ? '$' : '₩'

  // ---- 로컬 폼 상태. 이 모달은 AppShell에 항상 마운트돼 있어 닫아도 언마운트되지 않는다 —
  // resetAndClose에서 전부 초기화한다.
  const [keyword, setKeyword] = useState('')
  const [newStockMode, setNewStockMode] = useState(false)
  const [newTicker, setNewTicker] = useState('')
  const [newName, setNewName] = useState('')
  const [stockId, setStockId] = useState<number | null>(null)
  const [selectedStockLabel, setSelectedStockLabel] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [quantityStr, setQuantityStr] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [feeStr, setFeeStr] = useState('')
  const [stockMissing, setStockMissing] = useState(false)
  const [accountMissing, setAccountMissing] = useState(false)
  const [amountMissing, setAmountMissing] = useState(false)
  const [newStockInvalid, setNewStockInvalid] = useState(false)

  const searchQuery = useGetStocks(keyword, { enabled: isOpen && stockModeBuy && !stockId })
  const searchResults = searchQuery.stocks.filter((s) => s.market === market)
  const holdingsQuery = useGetHoldings(market, { enabled: isOpen && stockModeSell })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const postStock = usePostStock()
  const postTrade = usePostTrade()

  const ddHolding = useEntityDropdown(
    'stockHolding',
    holdingsQuery.holdings,
    (h) => h.stockId,
    (h) => h.stockName,
    stockId,
    (id) => setStockId(id),
  )
  const ddHoldingDisplay = { ...ddHolding, value: ddHolding.value || '종목을 선택하세요' }

  const ddAccount = useEntityDropdown(
    'stockAcct',
    accounts,
    (a) => a.id,
    (a) => a.name,
    accountId,
    (id) => {
      setAccountId(id)
      setAccountMissing(false)
    },
  )
  const ddAccountDisplay = { ...ddAccount, value: ddAccount.value || '계좌를 선택하세요' }

  const todayISO = toISODate(new Date())
  const dpTradeDate = useDatePicker('stockTrade', isoDateToDisplay(todayISO), isoDateToNav(todayISO))

  if (!isOpen) return null

  const stockModalTitle = stockModeSell ? '주식 매도' : '주식 매수'
  const stockModalIcon = stockModeSell ? 'trending_down' : 'show_chart'
  const stockDateLabel = stockModeSell ? '매도일' : '매수일'
  const stockSaveLabel = stockModeSell ? '매도 기록 저장' : '매수 기록 저장'
  const priceLabel = stockModeSell ? '매도 단가' : '매수 단가'

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      dpPicked: { ...st.dpPicked, stockTrade: undefined },
      dpNav: { ...st.dpNav, stockTrade: undefined },
      openDropdown: null,
    }))
    setKeyword('')
    setNewStockMode(false)
    setNewTicker('')
    setNewName('')
    setStockId(null)
    setSelectedStockLabel('')
    setAccountId(null)
    setQuantityStr('')
    setPriceStr('')
    setFeeStr('')
    setStockMissing(false)
    setAccountMissing(false)
    setAmountMissing(false)
    setNewStockInvalid(false)
    postTrade.reset()
    postStock.reset()
  }

  const switchMarket = (next: string) => {
    setState({ stockBuyMarket: next })
    setKeyword('')
    setNewStockMode(false)
    setNewTicker('')
    setNewName('')
    setStockId(null)
    setSelectedStockLabel('')
    setStockMissing(false)
  }

  const pickSearchResult = (id: number, name: string, ticker: string) => {
    setStockId(id)
    setSelectedStockLabel(`${name} (${ticker})`)
    setKeyword('')
    setStockMissing(false)
  }

  const handleRegisterStock = () => {
    if (!newTicker.trim() || !newName.trim()) {
      setNewStockInvalid(true)
      return
    }
    setNewStockInvalid(false)
    const body: CreateStockRequest = {
      ticker: newTicker.trim(),
      name: newName.trim(),
      market,
      currency,
      ...(state.stockSector ? { sector: state.stockSector } : {}),
    }
    postStock.mutate(body, {
      onSuccess: (created) => {
        setStockId(created.id)
        setSelectedStockLabel(`${created.name} (${created.ticker})`)
        setNewStockMode(false)
        setNewTicker('')
        setNewName('')
        setKeyword('')
        setStockMissing(false)
        postStock.reset()
      },
    })
  }

  const handleSave = () => {
    const quantity = Number(quantityStr)
    const price = Number(priceStr)
    const missingStock = !stockId
    const missingAccount = !accountId
    const missingAmount = !quantityStr || !quantity || !priceStr || !price
    setStockMissing(missingStock)
    setAccountMissing(missingAccount)
    setAmountMissing(missingAmount)
    if (missingStock || missingAccount || missingAmount) return

    const picked = state.dpPicked['stockTrade'] as { y: number; m: number; d: number } | undefined
    const tradeDate = picked ? pickedToISODate(picked) : todayISO
    const fee = Number(feeStr)

    const body: CreateTradeRequest = {
      accountId: accountId as number,
      stockId: stockId as number,
      side: stockModeSell ? 'SELL' : 'BUY',
      quantity,
      price,
      tradeDate,
      ...(feeStr && fee ? { fee } : {}),
    }
    postTrade.mutate(body, { onSuccess: resetAndClose })
  }

  const stockDuplicateMessage = postStock.error instanceof ApiError ? postStock.error.message : null
  const insufficientHolding = postTrade.error instanceof ApiError && postTrade.error.code === 'INSUFFICIENT_HOLDING'
  const fxMissing = postTrade.error instanceof ApiError && postTrade.error.code === 'FX_RATE_NOT_FOUND'
  const genericTradeError = postTrade.error && !insufficientHolding && !fxMissing ? postTrade.error.message : null

  const quantityNum = Number(quantityStr) || 0
  const priceNum = Number(priceStr) || 0
  const estimatedTotal = quantityNum * priceNum

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={stockModalIcon} size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>{stockModalTitle}</div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
          <button onClick={() => switchMarket('domestic')} style={marketTabStyle(state.stockBuyMarket !== 'overseas')}>국내 주식</button>
          <button onClick={() => switchMarket('overseas')} style={marketTabStyle(state.stockBuyMarket === 'overseas')}>해외 주식</button>
        </div>

        {stockModeBuy && (
          <div>
            <div style={LABEL_STYLE}>종목</div>
            {stockId ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{selectedStockLabel}</span>
                <button
                  onClick={() => {
                    setStockId(null)
                    setSelectedStockLabel('')
                  }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  변경
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                  <Icon name="search" size={18} color="var(--text-weak)" />
                  <input
                    type="text" placeholder="종목명 또는 티커 검색"
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value)
                      setNewStockMode(false)
                    }}
                    style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                  />
                </div>
                {keyword.trim() && !newStockMode && (
                  <div style={{ marginTop: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: 6 }}>
                    {searchQuery.isPending ? (
                      <div style={{ padding: '9px 10px', fontSize: 12.5, color: 'var(--text-weak)' }} aria-busy>—</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((s) => (
                        <button
                          key={s.id}
                          className="mini-hov"
                          onClick={() => pickSearchResult(s.id, s.name, s.ticker)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {s.name} <span style={{ color: 'var(--text-weak)', fontWeight: 600 }}>{s.ticker}</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-weak)' }}>'{keyword}'와 일치하는 종목이 없어요</div>
                        <button
                          className="mini-hov"
                          onClick={() => {
                            setNewStockMode(true)
                            setNewTicker(keyword.toUpperCase())
                            setNewName(keyword)
                          }}
                          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <Icon name="add" size={14} />
                          새 종목으로 등록
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {stockMissing && !stockId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>종목을 선택해주세요</div>}
          </div>
        )}

        {stockModeBuy && newStockMode && (
          <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>새 종목 등록</div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>티커</div>
                <input
                  type="text" placeholder="예: 005930"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>종목명</div>
                <input
                  type="text" placeholder="예: 삼성전자"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <div style={LABEL_STYLE}>섹터</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SECTOR_NAMES.map((n) => (
                  <button key={n} className="mini-hov" onClick={() => setState({ stockSector: n })} style={sectorBtn(state.stockSector === n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {newStockInvalid && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>티커와 종목명을 입력해주세요</div>}
            {stockDuplicateMessage && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{stockDuplicateMessage}</div>}
            <button
              onClick={handleRegisterStock}
              disabled={postStock.isPending}
              aria-busy={postStock.isPending}
              className="qbtn"
              style={{ padding: 11, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: postStock.isPending ? 'default' : 'pointer', opacity: postStock.isPending ? 0.7 : 1 }}
            >
              {postStock.isPending ? '등록 중…' : '종목 등록'}
            </button>
          </div>
        )}

        {stockModeSell && (
          <div style={{ position: 'relative' }}>
            <div style={LABEL_STYLE}>종목 (보유)</div>
            {holdingsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : holdingsQuery.holdings.length === 0 ? (
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>보유 중인 종목이 없어요</div>
            ) : (
              <Dropdown dd={ddHoldingDisplay} maxHeight={180} />
            )}
            {stockMissing && !stockId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>종목을 선택해주세요</div>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>수량</div>
            <input
              type="text" inputMode="decimal" placeholder="0"
              value={quantityStr}
              onChange={(e) => {
                setQuantityStr(sanitizeDecimalInput(e.target.value, 6))
                setAmountMissing(false)
              }}
              style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
            {insufficientHolding && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>보유 수량보다 많이 팔 수 없어요</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>{priceLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{stockCurrencySymbol}</span>
              <input
                type="text" inputMode="decimal" placeholder="0"
                value={priceStr}
                onChange={(e) => {
                  setPriceStr(sanitizeDecimalInput(e.target.value, 2))
                  setAmountMissing(false)
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>
        {amountMissing && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>수량과 단가를 입력해주세요</div>}
        {!!estimatedTotal && (
          <div style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>
            예상 총액 <b style={{ color: 'var(--text-strong)' }}>{stockCurrencySymbol}{fmt(estimatedTotal)}</b>
          </div>
        )}

        <div>
          <div style={LABEL_STYLE}>수수료 (선택)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{stockCurrencySymbol}</span>
            <input
              type="text" inputMode="decimal" placeholder="0"
              value={feeStr}
              onChange={(e) => setFeeStr(sanitizeDecimalInput(e.target.value, 2))}
              style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>계좌</div>
            {accountsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : accounts.length === 0 ? (
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                등록된 계좌가 없어요
              </div>
            ) : (
              <Dropdown
                dd={ddAccountDisplay}
                maxHeight={180}
                footer={
                  <>
                    <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                    <button
                      className="mini-hov"
                      onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'quickStock' })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Icon name="add" size={15} />
                      계좌 추가
                    </button>
                  </>
                }
              />
            )}
            {accountMissing && !accountId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌를 선택해주세요</div>}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>{stockDateLabel}</div>
            <DatePicker dp={dpTradeDate} />
          </div>
        </div>

        {fxMissing && (
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>
            아직 환율 정보를 가져오지 못했어요. 잠시 후 다시 시도해주세요.
          </div>
        )}
        {genericTradeError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{genericTradeError}</div>}

        <button
          onClick={handleSave}
          disabled={postTrade.isPending}
          aria-busy={postTrade.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postTrade.isPending ? 'default' : 'pointer', opacity: postTrade.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postTrade.isPending ? '저장 중…' : stockSaveLabel}
        </button>
      </div>
    </Modal>
  )
}
