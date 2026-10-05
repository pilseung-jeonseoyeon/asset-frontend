// 주식·코인 매매(매수/매도) 등록 모달. GET /stocks(검색) / POST /stocks(신규 등록) /
// GET /stocks/holdings(매도 대상) / GET /accounts / POST /trades에 연결돼 있다.
// z-index 80, 너비 480px, maxHeight 86vh.
//
// 입력 규칙과 주의점:
// - '종목' 검색은 실제 검색(GET /stocks?keyword=)이다. 결과가 없으면 '새 종목으로 등록' 흐름을 열어
// POST /stocks로 먼저 만든 뒤 자동으로 매매 대상으로 선택한다(STOCK_DUPLICATE 409는 등록 폼 옆에
// 인라인으로 뜬다).
// - '섹터' 칩은 신규 종목 등록 시에만 보인다 — 섹터는 종목 속성이지 매매 속성이 아니라서
// CreateTradeRequest에 필드가 없다. 칩 목록은 서버 섹터 마스터(GET /stocks/sectors)다 — 마스터 밖
// 값은 400 INVALID_SECTOR라, 예전처럼 하드코딩하면 서버에 없는 이름('테크'·'IT서비스')이 끼어 등록이
// 무조건 실패했다(2026-09-26 통합테스트).
// - '새 종목으로 등록'을 누르면 검색어를 티커나 종목명 중 **어울리는 칸 하나에만** 채운다 — 영문·숫자
// 검색어('AAPL', '005930')는 티커로, 한글이 섞인 검색어('삼성전자')는 종목명으로.
// - '예수금에서 차감'(매도는 '예수금에 입금') 스위치는 기본으로 켠다 — CreateTradeRequest.settleCash. 서버 기본값은
// false라 안 보내면 매수해도 예수금이 그대로라, 대부분의 사용자가 기대하는 "사면 예수금이 준다"와 어긋났다
// (2026-09-26 통합테스트, 사용자 결정). 예수금을 이미 따로 맞춰 둔 경우만 끈다. 수정(PUT)에는 없는 필드다.
// - 두 번째 금액 필드는 총액이 아니라 **단가**다(CreateTradeRequest가 price를 받는다). 참고용으로
// 수량×단가 예상 총액을 캡션으로 보여준다. 수수료는 선택 입력으로 별도로 받는다.
// - stockAcct 드롭다운 키는 ExchangeAddModal의 exchangeAcct와 분리한다 — 같은 키를 쓰면 두 모달이
// 같은 openDropdown 키를 다툰다.
// - 계좌 드롭다운은 GET /accounts 전체가 아니라 filterTradeAccounts(선택된 시장에 맞는 타입만 —
// KR·US는 STOCK, CRYPTO는 CRYPTO)로 좁힌다. 서버도 맞지 않는 계좌를 400 INVALID_ACCOUNT_TYPE으로 거절하지만,
// 고를 수 없는 계좌를 아예 보여주지 않는 편이 낫다.
// 적합한 계좌가 0개면 빈 드롭다운 대신 '증권계좌를 먼저 추가해주세요' + 계좌 추가 버튼으로 보낸다.
// - state.stockSector는 기본값을 갖지 않는다(빈 문자열 = 미선택). 기본값을 채우면 사용자가 섹터를
// 한 번도 고르지 않아도 그 값이 조용히 전송돼 신규 종목이 전부 그 섹터로 오염된다 — 모달을 닫거나
// 종목 등록에 성공하면 매번 비운다.
// - 매도 모드에서는 선택한 종목의 보유 수량을 '보유 N주'로 보여주고, 수량 입력이 그 값을 넘지 못하게
// 타이핑 중에 잘라낸다. 서버 409(INSUFFICIENT_HOLDING)는 경합에 대비한 최종 방어선으로 유지한다.
// - 계좌 드롭다운은 계좌 이름만으로는 어느 은행/증권사인지 알 수 없어 소속 기관을 함께 보여준다 —
// 옵션은 BankIcon + 계좌명 + 보조줄 기관명(accountInstitutionMeta가 GET /accounts의 institutionId를
// GET /institutions와 조인), 트리거는 '계좌명 · 기관명' 한 줄이라 높이가 다른 필드와 같다.
// 기관을 못 찾거나 기관에 아이콘이 없으면 계좌명만 보여준다.

import { useDebouncedValue } from '../../../utils/useDebouncedValue'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Switch } from '../../../components/primitives/Switch/Switch'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { assetClassFormPreset } from '../../../data/assetsView'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { formatNumber, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToViewingMonth, pickedToISODate, toISODate } from '../../../utils/date'
import { accountInstitutionLabel, accountInstitutionMeta } from '../../../data/accountView'
import { buyMarketToMarket, filterTradeAccounts, marketToCurrency, quantityUnitOf, sortHoldingsByReturn } from '../../../data/stocksView'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useGetInstitutions } from '@/services/institution'
import { useGetHoldings, useGetStockSectors, useGetStocks, usePostStock } from '@/services/stock'
import { usePostTrade } from '@/services/trade'
import type { CreateStockRequest } from '@/services/stock'
import type { CreateTradeRequest } from '@/services/trade'
import type { StockBuyMarket } from '../../../state/types'

function marketTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)', boxShadow: 'none',
  }
}
function sectorButton(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}
// 한글이 하나라도 있으면 종목명으로 본다 — 티커는 영문·숫자·기호뿐이다.
const HANGUL_PATTERN = /[ㄱ-ㅎㅏ-ㅣ가-힣]/
const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

export function QuickStockModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.openModal === 'quickStock'
  // 좁은 폭에서 Dropdown/DatePicker 팝오버가 옆 칼럼 밖으로 잘리는 것을 막기 위해 세로로 쌓는다.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }
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
  // 증권거래세 — 매도에만 붙는다. 서버 CreateTradeReq.tax(선택, 생략 시 0).
  const [taxStr, setTaxStr] = useState('')
  const [settleCash, setSettleCash] = useState(true)
  const [stockMissing, setStockMissing] = useState(false)
  const [accountMissing, setAccountMissing] = useState(false)
  const [amountMissing, setAmountMissing] = useState(false)
  const [newStockInvalid, setNewStockInvalid] = useState(false)

  // 글자마다 검색 요청이 나가고 응답 순서가 뒤섞이지 않게, 타이핑이 잠시 멈춘 뒤의 값으로만 조회한다.
  const debouncedKeyword = useDebouncedValue(keyword.trim())
  const isKeywordSettling = keyword.trim() !== debouncedKeyword
  const searchQuery = useGetStocks(debouncedKeyword, { enabled: isOpen && stockModeBuy && !stockId })
  const searchResults = searchQuery.stocks.filter((s) => s.market === market)
  const holdingsQuery = useGetHoldings(market, { enabled: isOpen && stockModeSell })
  // 매도 수량 상한은 전 계좌 합계가 아니라 **고른 계좌의** 보유량이다 — 합계로 잡으면 그 종목이 없거나 적은
  // 계좌를 골랐을 때 서버가 409 INSUFFICIENT_HOLDING으로 거절했다(2026-09-26 통합테스트).
  const accountHoldingsQuery = useGetHoldings(market, { enabled: isOpen && stockModeSell && accountId !== null, accountId })
  // 보유 종목 카드(buildHoldingCards)와 같은 기준(수익률 내림차순)으로 정렬해 화면 간 순서를 맞춘다.
  const sortedHoldings = sortHoldingsByReturn(holdingsQuery.holdings)
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  // 서버가 400 INVALID_ACCOUNT_TYPE으로 거절할 계좌는 처음부터 고르지 못하게 — 선택된 시장(KR/US)에 맞는 증권 계좌만 드롭다운에 노출한다.
  const accounts = filterTradeAccounts(accountsQuery.data ?? [], market)
  // 계좌 드롭다운에 소속 기관(아이콘 + 기관명)을 함께 보여주기 위한 조인 대상 — accountInstitutionMeta
  // 참고. 기관 목록은 계좌보다 훨씬 자주 재사용되는 마스터 데이터라 staleTime이 길다(institution.hook.ts).
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postStock = usePostStock()
  const sectorsQuery = useGetStockSectors({ enabled: isOpen && newStockMode })
  const postTrade = usePostTrade()

  const holdingDropdown = useEntityDropdown(
    'stockHolding',
    sortedHoldings,
    (h) => h.stockId,
    (h) => h.stockName,
    stockId,
    (id) => setStockId(id),
  )
  const holdingDisplayDropdown = { ...holdingDropdown, value: holdingDropdown.value || '종목을 선택하세요' }

  const accountDropdown = useEntityDropdown(
    'stockAcct',
    accounts,
    (a) => a.id,
    (a) => a.name,
    accountId,
    (id) => {
      setAccountId(id)
      setAccountMissing(false)
    },
    (a) => accountInstitutionMeta(a, institutions)?.institutionName,
    (a) => {
      const meta = accountInstitutionMeta(a, institutions)
      return meta ? <BankIcon tokenKey={meta.tokenKey} size={28} /> : undefined
    },
  )
  // 트리거에도 소속 기관을 함께 보여준다 — 계좌명은 좁은 열에서 ellipsis로 잘리지만 기관명은
  // 아래 보조 줄에 따로 있어 "어느 기관 계좌를 골랐는지"는 항상 확인된다(Dropdown.tsx selectedMeta).
  // 기관을 매칭하지 못한 계좌도 accountInstitutionLabel이 '기관 없음'을 돌려주므로 선택에 따라
  // 트리거 높이가 흔들리지 않는다.
  const selectedAccount = accountId !== null ? accounts.find((a) => a.id === accountId) : undefined
  const selectedAccountMeta = selectedAccount ? accountInstitutionMeta(selectedAccount, institutions) : null
  const accountDisplayDropdown = { ...accountDropdown, value: accountDropdown.value || '계좌를 선택하세요' }
  const selectedAccountLabel = accountInstitutionLabel(selectedAccount, institutions)
  const selectedAccountIcon = selectedAccountMeta ? <BankIcon tokenKey={selectedAccountMeta.tokenKey} size={24} /> : undefined

  const todayISO = toISODate(new Date())
  // 미래 매매는 성립하지 않는다 — 서버도 400 TRADE_DATE_IN_FUTURE로 막지만 입력 단계에서 먼저 막는다.
  const dpTradeDate = useDatePicker('stockTrade', isoDateToDisplay(todayISO), isoDateToViewingMonth(todayISO), todayISO)

  if (!isOpen) return null

  const isCrypto = state.stockBuyMarket === 'crypto'
  const assetNoun = isCrypto ? '가상자산' : '주식'
  const unitLabel = quantityUnitOf(market)
  const stockModalTitle = `${assetNoun} ${stockModeSell ? '매도' : '매수'}`
  const stockModalIcon = stockModeSell ? 'trending_down' : 'show_chart'
  const stockDateLabel = stockModeSell ? '매도일' : '매수일'
  const stockSaveLabel = stockModeSell ? '매도 기록 저장' : '매수 기록 저장'
  const priceLabel = stockModeSell ? '매도 단가' : '매수 단가'

  const resetAndClose = () => {
    setState((prev) => ({
      openModal: null,
      stockSector: '',
      datePickerPicked: { ...prev.datePickerPicked, stockTrade: undefined },
      datePickerViewingMonth: { ...prev.datePickerViewingMonth, stockTrade: undefined },
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
    setTaxStr('')
    setSettleCash(true)
    setStockMissing(false)
    setAccountMissing(false)
    setAmountMissing(false)
    setNewStockInvalid(false)
    postTrade.reset()
    postStock.reset()
  }

  const switchMarket = (next: StockBuyMarket) => {
    setState({ stockBuyMarket: next, stockSector: '' })
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
      ...(state.stockSector && !isCrypto ? { sector: state.stockSector } : {}),
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
        // 등록이 끝나면 섹터 선택도 비운다 — 남겨두면 "변경"으로 검색을 다시 열어 또 다른 신규
        // 종목을 등록할 때 이전 선택이 조용히 이어붙는다.
        setState({ stockSector: '' })
        postStock.reset()
      },
      // 칩 목록이 오래된 사이 서버 마스터가 바뀌었으면 다시 받아 없는 섹터가 화면에서 사라지게 한다.
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'INVALID_SECTOR') void sectorsQuery.refetch()
      },
    })
  }

  const handleSave = () => {
    const quantity = Number(quantityStr)
    const price = Number(priceStr)
    const missingStock = !stockId
    const missingAccount = !accountId
    // 단가 0도 허용(서버 price ≥ 0 — 증정주 등). 수량만 0보다 커야 한다.
    const missingAmount = !quantityStr || !quantity || !priceStr || price < 0
    setStockMissing(missingStock)
    setAccountMissing(missingAccount)
    setAmountMissing(missingAmount)
    if (missingStock || missingAccount || missingAmount) return

    const picked = state.datePickerPicked['stockTrade'] as { y: number; m: number; d: number } | undefined
    const tradeDate = picked ? pickedToISODate(picked) : todayISO
    const fee = Number(feeStr)
    const tax = Number(taxStr)

    const body: CreateTradeRequest = {
      accountId: accountId as number,
      stockId: stockId as number,
      side: stockModeSell ? 'SELL' : 'BUY',
      quantity,
      price,
      tradeDate,
      ...(feeStr && fee ? { fee } : {}),
      ...(stockModeSell && taxStr && tax ? { tax } : {}),
      settleCash,
    }
    postTrade.mutate(body, { onSuccess: resetAndClose })
  }

  const stockDuplicateMessage = postStock.error instanceof ApiError ? postStock.error.message : null
  const insufficientHolding = postTrade.error instanceof ApiError && postTrade.error.code === 'INSUFFICIENT_HOLDING'
  const exchangeRateMissing = postTrade.error instanceof ApiError && postTrade.error.code === 'FX_RATE_NOT_FOUND'
  const genericTradeError = postTrade.error && !insufficientHolding && !exchangeRateMissing ? postTrade.error.message : null

  // 매도 폼의 사전 검증: 서버 409(INSUFFICIENT_HOLDING)까지 왕복하지 않고도 보유 수량을 넘겨 입력할
  // 수 없게 막는다(경합 등으로 서버가 그래도 거부하면 위 insufficientHolding 메시지가 최종 방어선).
  const quantityMax = !stockModeSell
    ? null
    : accountId !== null
      ? accountHoldingsQuery.isSuccess ? (accountHoldingsQuery.holdings.find((h) => h.stockId === stockId)?.quantity ?? 0) : null
      : (sortedHoldings.find((h) => h.stockId === stockId)?.quantity ?? null)

  const quantityNum = Number(quantityStr) || 0
  const priceNum = Number(priceStr) || 0
  const estimatedTotal = quantityNum * priceNum

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, ...sheetStickyHeaderStyle(isMobile) }}>
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
          <button onClick={() => switchMarket('domestic')} style={marketTabStyle(state.stockBuyMarket === 'domestic')}>국내 주식</button>
          <button onClick={() => switchMarket('overseas')} style={marketTabStyle(state.stockBuyMarket === 'overseas')}>해외 주식</button>
          {/* 가상자산(업비트 KRW 마켓 기준, 원화 단가)도 같은 흐름으로 사고판다 — 계좌는 가상자산 계좌만 뜬다. */}
          <button onClick={() => switchMarket('crypto')} style={marketTabStyle(state.stockBuyMarket === 'crypto')}>가상자산</button>
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
                    {(searchQuery.isPending || isKeywordSettling) ? (
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
                            const term = keyword.trim()
                            const looksLikeName = HANGUL_PATTERN.test(term)
                            setNewTicker(looksLikeName ? '' : term.toUpperCase())
                            setNewName(looksLikeName ? term : '')
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
            <div style={fieldRowStyle}>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>티커</div>
                <input
                  type="text" placeholder={isCrypto ? '예: BTC' : state.stockBuyMarket === 'overseas' ? '예: AAPL' : '예: 005930'}
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={LABEL_STYLE}>종목명</div>
                <input
                  type="text" placeholder={isCrypto ? '예: 비트코인' : state.stockBuyMarket === 'overseas' ? '예: 애플' : '예: 삼성전자'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            {/* 섹터는 주식 산업군 분류라 가상자산에는 없다 — 가상자산 등록에서는 칸을 숨기고 보내지 않는다. */}
            {!isCrypto && <div>
              <div style={LABEL_STYLE}>섹터</div>
              {sectorsQuery.isPending ? (
                <div aria-busy style={{ fontSize: 12, color: 'var(--text-weak)' }}>—</div>
              ) : sectorsQuery.error ? (
                <div style={{ fontSize: 11.5, color: 'var(--down)' }}>섹터 목록을 불러오지 못했어요. 섹터 없이 등록하면 '기타'로 분류돼요.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sectorsQuery.sectors.map((s) => (
                    <button
                      key={s.code}
                      className="mini-hov"
                      aria-pressed={state.stockSector === s.name}
                      // 한 번 더 누르면 선택을 푼다 — 섹터는 선택 항목이라 고른 뒤에도 '없음'으로 되돌릴 수 있어야 한다.
                      onClick={() => setState((prev) => ({ stockSector: prev.stockSector === s.name ? '' : s.name }))}
                      style={sectorButton(state.stockSector === s.name)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>}
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
              <Dropdown dropdown={holdingDisplayDropdown} maxHeight={180} />
            )}
            {quantityMax !== null && (
              <div style={{ fontSize: 11.5, color: quantityMax === 0 ? 'var(--down)' : 'var(--text-weak)', marginTop: 6 }}>
                {quantityMax === 0
                  ? '고른 계좌에는 이 종목이 없어요 — 계좌를 확인해주세요'
                  : `${accountId !== null ? '이 계좌 보유' : '전체 보유'} ${formatNumber(quantityMax)}${unitLabel}`}
              </div>
            )}
            {stockMissing && !stockId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>종목을 선택해주세요</div>}
          </div>
        )}

        <div style={fieldRowStyle}>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>수량</div>
            <input
              type="text" inputMode="decimal" placeholder="0"
              value={quantityStr}
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value, 6)
                // 보유 수량을 넘겨 입력할 수 없게 타이핑 중에 바로 잘라낸다(quantityMax는 매도 모드에서만
                // 값을 가진다).
                const clamped = quantityMax !== null && Number(sanitized) > quantityMax ? String(quantityMax) : sanitized
                setQuantityStr(clamped)
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
            예상 총액 <b style={{ color: 'var(--text-strong)' }}>{stockCurrencySymbol}{formatNumber(estimatedTotal)}</b>
          </div>
        )}

        <div style={fieldRowStyle}>
          <div style={{ flex: 1 }}>
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
          {/* 매도에는 증권거래세가 붙는다 — 실현손익에서 빠지는 금액이라 따로 받는다(서버 tax, 종목 표시 통화). */}
          {stockModeSell && (
            <div style={{ flex: 1 }}>
              <div style={LABEL_STYLE}>증권거래세 (선택)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{stockCurrencySymbol}</span>
                <input
                  type="text" inputMode="decimal" placeholder="0"
                  value={taxStr}
                  onChange={(e) => setTaxStr(sanitizeDecimalInput(e.target.value, 2))}
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={fieldRowStyle}>
          {/* minWidth:0 — 이 열의 계좌 드롭다운 트리거가 "기관명 · 계좌명"으로 길어질 수 있는데,
              flex:1인 이 wrapper에 minWidth:0이 없으면 기본 min-width:auto 때문에 내용 크기 밑으로
              줄어들지 않아 옆 매수일 열을 밀어내며 트리거가 두 줄로 꺾인다(Dropdown.tsx의
              트리거 ellipsis가 실제로 발동하려면 이 체인이 끝까지 열려 있어야 한다). */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <div style={LABEL_STYLE}>계좌</div>
            {accountsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : accounts.length === 0 ? (
              // 증권/가상자산 계좌가 하나도 없으면 빈 드롭다운으로 막다른 길을 만들지 않고 바로 계좌
              // 추가로 보낸다.
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                  {isCrypto ? '가상자산 계좌를 먼저 추가해주세요' : '증권계좌를 먼저 추가해주세요'}
                </div>
                <button
                  // 지금 탭에 맞는 유형(주식/가상자산)을 골라 둔 채로 계좌 추가를 연다.
                  onClick={() => setState({ openModal: 'addAccount', addAccountReturnTo: 'quickStock', openDropdown: null, accountForm: { ...BLANK_ACCOUNT_FORM, ...assetClassFormPreset(isCrypto ? 'CRYPTO' : 'STOCK') } })}
                  className="mini-hov"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Icon name="add" size={15} />
                  계좌 추가
                </button>
              </div>
            ) : (
              <Dropdown
                dropdown={accountDisplayDropdown}
                maxHeight={180}
                selectedMeta={selectedAccountLabel}
                selectedLeading={selectedAccountIcon}
                footer={
                  <>
                    <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                    <button
                      className="mini-hov"
                      onClick={() => setState({ openModal: 'addAccount', addAccountReturnTo: 'quickStock', openDropdown: null })}
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
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={LABEL_STYLE}>{stockDateLabel}</div>
            <DatePicker dp={dpTradeDate} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)' }}>
              {stockModeSell ? '예수금에 입금' : '예수금에서 차감'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3, lineHeight: 1.5 }}>
              {settleCash
                ? `${stockModeSell ? '매도' : '매수'} 금액만큼 계좌의 ${currency === 'USD' ? '달러' : '원화'} 예수금이 ${stockModeSell ? '늘어요' : '줄어요'}`
                : '예수금은 그대로 두고 보유 종목만 바꿔요'}
            </div>
          </div>
          <Switch label={stockModeSell ? '예수금에 입금' : '예수금에서 차감'} checked={settleCash} onChange={setSettleCash} disabled={postTrade.isPending} />
        </div>

        {exchangeRateMissing && (
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
