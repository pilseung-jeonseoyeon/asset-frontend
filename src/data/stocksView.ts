// 주식 화면의 뷰모델 레이어 — 서버 응답(GET /indices, GET /stocks, GET /stocks/holdings,
// GET /stocks/holdings/groups, GET /stocks/holdings/closed, GET /exchanges/summary, GET /trades)을
// 화면과 모달(QuickStockModal/ExchangeAddModal/TradeEditModal)이 그릴 형태로 바꾼다.
//
// 증감 표기 규칙(`(percent>=0?'+':'−')+Math.abs(percent).toFixed(1)+'%'`, 빼기 기호는 U+2212,
// var(--up)/var(--down), ds_rules_v2_5.md §10-1)과 램프 색 순서(§1-6)는 디자인 시스템 규칙이다 —
// 임의로 바꾸지 말 것. 값이 전부 서버 집계에서 오므로 나눗셈마다 0 방어가 붙어 있다(실제 포트폴리오는
// 보유 종목 0개, 총 평가액 0, 원가 0이 정상적으로 나올 수 있다).
//
// **시세 미확보 처리가 이 파일의 핵심 함정이다.** HoldingRes의 valuationKrw·unrealizedPnlKrw·
// returnRatePercent·currentPrice·previousClosePrice·dayChangePercent·priceAsOf는 전부 nullable이고,
// 시세를 못 받으면 0이 아니라 null로 온다 — 0으로 접지 말 것. buildHoldingCards/buildPortfolioSummary는
// null을 명시적으로 걸러낸다. 원가는 valuationKrw − unrealizedPnlKrw로 역산하지 말고 서버가 주는
// totalCostKrw를 쓴다.
//
// buildPortfolioSummary의 총 매수금액·총 평가금액·평가손익·평가수익률 네 지표는 같은 모수
// (시세 확보 종목)로 통일돼 있다(사유는 함수 docstring). buildHoldingCards의 gainText는 손익 금액과
// 수익률 표시를 분리해, 원가가 0이라 수익률만 계산 불가(returnRatePercent === null)여도 실제 손익
// 금액(unrealizedPnlKrw)은 계속 보여준다.
// 금액 표기는 통화별 소수 자릿수를 고정하는 utils/format.ts의 formatCurrencyAmount를 쓴다.
// buildMarketIndexViews의 valueText도 자릿수를 항상 2자리로 고정한다 — 서버가 지수마다 소수점
// 자릿수를 다르게 내려보낸다(KOSPI/S&P는 2자리인데 NASDAQ만 3자리로 온 적이 있음).

import type { StockBuyMarket, StockMarketTab } from '../state/types'
import { formatNumber, formatKrw, formatCurrencyAmount } from '../utils/format'
import { isoDateToDisplay } from '../utils/date'
import { findBankInstitution } from '../design/bank-institutions'
import type { ClosedHoldingResponse, HoldingGroupResponse, HoldingResponse } from '@/services/stock'
import type { MarketIndexResponse } from '@/services/marketIndex'
import type { TradeResponse } from '@/services/trade'
import type { AccountResponse } from '@/services/account'
import type { InstitutionResponse } from '@/services/institution'
import type { AccountType, Currency, Market } from '@/services/common.type'

// ---------- 시장/심볼 ↔ 한글 라벨 ----------

export const MARKET_LABELS: Record<Market, string> = {
  KR: '국내',
  US: '해외',
  CRYPTO: '가상자산',
}

const INDEX_SYMBOL_LABELS: Record<string, string> = {
  KOSPI: 'KOSPI',
  SPX: 'S&P 500',
  IXIC: 'NASDAQ',
  USDKRW: 'USD/KRW',
}

/**
 * 시장 지표 카드 표시 순서(KOSPI → S&P 500 → NASDAQ → USD/KRW). 일부 심볼
 * 조회가 실패하면 배열에서 통째로 빠질 수 있으므로(marketIndex.type.ts) 이 목록에 없는 심볼은
 * 버리지 않고 뒤에 붙인다.
 */
const MARKET_INDEX_ORDER = ['KOSPI', 'SPX', 'IXIC', 'USDKRW']

/** 로딩 중 스켈레톤을 몇 칸 그릴지 — 실제로 도착할 지표 개수와 같은 칸 수라야 레이아웃이 튀지 않는다.
 * (일부 심볼 조회가 실패하면 실제 칸 수가 줄어들 수는 있다.) */
export const MARKET_INDEX_COUNT = MARKET_INDEX_ORDER.length

function marketIndexOrderIndex(symbol: string): number {
  const index = MARKET_INDEX_ORDER.indexOf(symbol)
  return index === -1 ? MARKET_INDEX_ORDER.length : index
}

/** 주식 화면의 시장 탭을 GET /stocks/holdings의 market 파라미터로 바꾼다("전체"는 필터 없음). */
export function stockMarketTabToMarket(tab: StockMarketTab): Market | undefined {
  if (tab === 'domestic') return 'KR'
  if (tab === 'foreign') return 'US'
  return undefined
}

/** 주식 화면 시장 탭의 표시 문구(빈 상태 문장 등에서 쓴다). */
export const STOCK_MARKET_TAB_LABELS: Record<StockMarketTab, string> = { all: '전체', domestic: '국내', foreign: '해외' }

/** QuickStockModal의 stockBuyMarket('domestic'/'overseas')을 서버 Market으로 변환한다. */
export function buyMarketToMarket(stockBuyMarket: StockBuyMarket): Market {
  return stockBuyMarket === 'overseas' ? 'US' : 'KR'
}

/**
 * 신규 종목 등록 시 market에 따른 기본 통화. 이 화면은 KR/US만 다루므로 CRYPTO는 대상이 아니다.
 *
 * CRYPTO 종목은 서버 시세 수집이 업비트 KRW 마켓에 고정되어 있어, 등록 시 currency를 반드시
 * KRW로 넣어야 한다(USD로 등록하면 환율이 이중으로 곱해진다 — 백엔드 확정). 이후
 * CRYPTO 등록 UI를 만들 때는 통화를 선택하게 하지 말고 KRW로 고정해서 구현할 것.
 */
export function marketToCurrency(market: Market): Currency {
  return market === 'US' ? 'USD' : 'KRW'
}

// ---------- 시장 지표 ----------

export interface MarketIndexView {
  symbol: string
  label: string
  valueText: string
  /** null이면 변동률 배지를 그리지 말 것(USDKRW는 전일 종가 개념이 없어 항상 null). */
  changePercentText: string | null
  positive: boolean
}

/**
 * 서버는 전일 종가가 아니라 전일 대비 절대 증감(`changeFromPreviousClose`)만 내려준다. 변동률(%)은
 * `previousClose = currentValue − changeFromPreviousClose`로 전일 종가를 역산한 뒤
 * `changeFromPreviousClose / previousClose × 100`으로 정확히 계산한다(추정 아님). `changeFromPreviousClose`가
 * `null`이거나(USDKRW) `previousClose`가 0이면 나눌 수 없으므로 배지를 숨긴다.
 */
export function buildMarketIndexViews(indices: MarketIndexResponse[]): MarketIndexView[] {
  return [...indices]
    .sort((a, b) => marketIndexOrderIndex(a.symbol) - marketIndexOrderIndex(b.symbol))
    .map((marketIndex) => {
      const change = marketIndex.changeFromPreviousClose
      const previousClose = change === null ? null : marketIndex.currentValue - change
      const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null
      const positive = changePercent !== null ? changePercent >= 0 : true
      return {
        symbol: marketIndex.symbol,
        label: INDEX_SYMBOL_LABELS[marketIndex.symbol] ?? marketIndex.symbol,
        // 소수점 자릿수를 지수마다 서버가 다르게 내려준다(NASDAQ만 3자리로 온 적 있음, 실행 화면
        // 확인) — formatNumber()는 자릿수를 고정하지 않으므로 여기서 항상 2자리로 고정한다.
        valueText: marketIndex.currentValue.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        changePercentText: changePercent !== null ? (positive ? '+' : '−') + Math.abs(changePercent).toFixed(2) + '%' : null,
        positive,
      }
    })
}

// ---------- 그룹별 수익률 ----------

export interface GroupReturnView {
  key: string
  label: string
  /** 원가가 0이라 수익률을 계산할 수 없는 그룹은 null — 호출부에서 '—'로 폴백한다. */
  percentText: string | null
  color: string
}

/**
 * by='sector'면 groupKey가 이미 한글 섹터명(또는 '기타')이고, by='market'이면 'KR' 같은 enum 코드다.
 *
 * 원가(평가액 − 손익)가 0인 그룹은 서버가 returnRatePercent를 null로 준다.
 * null을 그대로 계산에 넣으면 `null >= 0`이 true라 `+0.0%`가 찍혀, 실제로는 "계산 불가"인 그룹이
 * "손익 0"인 것처럼 보인다 — 조용히 틀린 값을 보여주게 되므로 반드시 걸러낸다.
 */
export function buildGroupReturns(groups: HoldingGroupResponse[], by: 'sector' | 'market'): GroupReturnView[] {
  return [...groups]
    // 수익률 내림차순, 계산 불가(null)는 맨 뒤로.
    .sort((a, b) => {
      if (a.returnRatePercent === null) return b.returnRatePercent === null ? 0 : 1
      if (b.returnRatePercent === null) return -1
      return b.returnRatePercent - a.returnRatePercent
    })
    .map((g) => {
      const rate = g.returnRatePercent
      const positive = rate !== null && rate >= 0
      return {
        key: g.groupKey,
        label: by === 'market' ? (MARKET_LABELS[g.groupKey as Market] ?? g.groupKey) : g.groupKey,
        percentText: rate === null ? null : (positive ? '+' : '−') + Math.abs(rate).toFixed(1) + '%',
        // 계산 불가(null)를 "상승 아님 = 하락"으로 접으면 안 된다. 호출부가 색을 한 번 더
        // 덮어쓰고 있더라도, 뷰모델 자체가 틀린 색을 들고 있으면 이 값을 쓰는 다른 UI가
        // 생기는 순간 계산 불가 항목이 빨간색(손실)으로 보인다.
        color: rate === null ? 'var(--text-weak)' : positive ? 'var(--up)' : 'var(--down)',
      }
    })
}

// ---------- 섹터 비중 도넛 ----------

export interface SectorSegmentView {
  label: string
  percent: number
  color: string
}

const RAMP = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

/** 비중 큰 순으로 램프를 배정한다(§1-6). 합계가 0이면 빈 배열 — 호출부가 카드 전체를 빈 상태로 치환할 것. */
export function buildSectorComposition(groups: HoldingGroupResponse[]): SectorSegmentView[] {
  const total = groups.reduce((sum, g) => sum + g.totalValuationKrw, 0)
  if (total <= 0) return []
  return [...groups]
    .sort((a, b) => b.totalValuationKrw - a.totalValuationKrw)
    .map((g, i) => ({
      label: g.groupKey,
      percent: Math.round((g.totalValuationKrw / total) * 100),
      color: RAMP[Math.min(i, RAMP.length - 1)],
    }))
}

// ---------- 보유 종목 카드 ----------

export interface HoldingCardView {
  stockId: number
  name: string
  marketLabel: string
  sector: string
  ticker: string
  /** true면 시세를 아직 확보하지 못한 상태(priceAsOf === null) — 평가금액·손익·현재가 대신 안내
   * 문구를 보여줄 것. */
  priceMissing: boolean
  /** priceMissing이면 null. */
  valueText: string | null
  /** 총 매수금액(원화) — 시세와 무관하게 항상 채워진다. priceMissing 카드의 대체 표시용. */
  costText: string
  quantityText: string
  /** priceMissing이면 null. */
  gainText: string | null
  /** priceMissing이면 의미 없음(항상 false) — 반드시 priceMissing을 먼저 분기할 것. */
  positive: boolean
  /** priceMissing이거나 원가가 0이면 null. */
  returnPercent: number | null
  /** 종목 통화 기준 현재가 포맷("77,000원" / "$77.00"). priceMissing이면 null. */
  currentPriceText: string | null
  /** 전 영업일 대비 등락률. priceMissing이거나 직전 종가가 없으면 null. */
  dayChangePercentText: string | null
  dayChangePositive: boolean
}

/**
 * 보유 종목 정렬·매도 드롭다운이 공유하는 수익률 기준. 서버가 이미 계산한 returnRatePercent를
 * 그대로 쓴다(원가 역산 금지 — docs/frontend-todo.md B-5). 시세 미확보(null)는 맨 뒤로 보낸다
 * (buildGroupReturns와 동일 기준 — "계산 불가"를 "0%"로 접지 않는다).
 */
export function sortHoldingsByReturn(holdings: HoldingResponse[]): HoldingResponse[] {
  return [...holdings].sort((a, b) => {
    if (a.returnRatePercent === null) return b.returnRatePercent === null ? 0 : 1
    if (b.returnRatePercent === null) return -1
    return b.returnRatePercent - a.returnRatePercent
  })
}

function currencySymbolOf(currency: HoldingResponse['currency']): string {
  return currency === 'USD' ? '$' : ''
}

/** 수익률 높은 순으로 정렬한다. ticker·현재가·전
 * 영업일 대비는 이제 HoldingResponse에 직접 포함돼 있다(stock.type.ts 참고 —
 * 과거엔 없어 별도 조인이 필요했다). */
export function buildHoldingCards(holdings: HoldingResponse[]): HoldingCardView[] {
  return sortHoldingsByReturn(holdings).map((h) => {
    const symbol = currencySymbolOf(h.currency)
    const dayChangePositive = h.dayChangePercent !== null && h.dayChangePercent >= 0
    const currentPriceText =
      h.currentPrice === null ? null : `${symbol}${formatCurrencyAmount(h.currentPrice, h.currency)}${symbol ? '' : '원'}`
    const dayChangePercentText =
      h.dayChangePercent === null ? null : `${dayChangePositive ? '+' : '−'}${Math.abs(h.dayChangePercent).toFixed(1)}%`
    const base = {
      stockId: h.stockId,
      name: h.stockName,
      marketLabel: MARKET_LABELS[h.market],
      sector: h.sector ?? '기타',
      ticker: h.ticker,
      costText: formatKrw(h.totalCostKrw),
      quantityText: formatNumber(h.quantity),
      currentPriceText,
      dayChangePercentText,
      dayChangePositive,
    }

    // priceAsOf가 null이면 valuationKrw·unrealizedPnlKrw·returnRatePercent가 함께 null이다(HoldingRes
    // 계약) — 이 분기 자체로 아래 필드들의 null 가능성을 없애 타입 단언 없이 안전하게 좁힌다.
    if (h.priceAsOf === null || h.valuationKrw === null || h.unrealizedPnlKrw === null) {
      return { ...base, priceMissing: true, valueText: null, gainText: null, positive: false, returnPercent: null }
    }

    const positive = h.unrealizedPnlKrw >= 0
    const sign = positive ? '+' : '−'
    // 손익 금액(unrealizedPnlKrw)과 수익률(returnRatePercent)은 서로 다른 이유로 null이 될 수
    // 있다 — 원가가 0인 종목(증정주 등)은 수익률만 계산 불가(returnRatePercent === null)일 뿐
    // 손익 금액 자체는 항상 있으므로, 수익률이 없다고 손익 금액까지 통째로 숨기지 않는다.
    const percentPart = h.returnRatePercent === null ? '' : ` (${sign}${Math.abs(h.returnRatePercent).toFixed(1)}%)`
    return {
      ...base,
      priceMissing: false,
      valueText: formatKrw(h.valuationKrw),
      gainText: `${sign}${formatKrw(Math.abs(h.unrealizedPnlKrw))}원${percentPart}`,
      positive,
      returnPercent: h.returnRatePercent,
    }
  })
}

// ---------- 포트폴리오 요약 ----------

export interface PortfolioSummaryView {
  /** 억/만 축약 캡션(§4-2) 계산용 원본 금액. 화면에는 항상 totalValueText(콤마 포맷)를 그린다. 시세
   * 미확보 종목은 제외한 합계다(hasMissingPrice가 true면 실제보다 적을 수 있음). */
  totalValueKrw: number
  /** 평가손익을 계산할 수 있는 종목이 하나도 없으면(전 종목 시세 미확보) null — '—'로 폴백할 것. */
  totalValueText: string | null
  /** 총 매수금액 — 시세 확보 종목(priced)만의 totalCostKrw 합계(수수료 포함). 시세 미확보 종목이
   * 하나도 없으면 null — 위와 동일 사유. */
  totalCostText: string | null
  /** 시세 미확보 종목이 하나라도 있으면 true — "총 매수금액·평가금액·손익 계산에서 일부 종목을
   * 제외했다" 캡션용. */
  hasMissingPrice: boolean
  /** 평가손익을 계산할 수 있는 종목이 하나도 없으면 null. */
  profitLossText: string | null
  pnlPositive: boolean
  /** 위와 동일 사유로 null 가능. */
  returnRateText: string | null
  holdingCount: number
  /** 총자산 대비 비중. totalAssetKrw를 안 넘겼거나 0이면(스냅샷 이력 없는 신규 사용자) null — 캡션을 숨길 것. */
  sharePercentText: string | null
}

/**
 * 전용 요약 API가 없어 보유 종목 배열을 합산해 파생한다.
 *
 * 총 매수금액·총 평가금액·평가손익·평가수익률 네 지표는 모두 시세 확보 종목(priced)만으로
 * 합산해 같은 모수를 쓴다. 총 매수금액만 전체 보유종목(totalCostKrw 전량)의 합으로 잡으면
 * 시세 확보분만 더한 평가금액·손익과 모수가 달라진다 — 예를 들어 A(원가 100만, 시세 미확보) +
 * B(원가 200만, 평가 250만)면 "평가금액 250만 / 매수금액 300만인데 손익은 +50만"으로 보여
 * 사용자가 250만−300만=−50만으로 암산한 값과 어긋난다. 네 숫자를 모두 시세 확보분 기준으로
 * 통일해야 "평가금액 − 매수금액 = 손익"이 화면에서도 항상 맞는다. 그 대가로 시세
 * 미확보 종목이 있으면 총 매수금액이 실제 투입액보다 작게 보일 수 있는데, 이는
 * hasMissingPrice 캡션(Stocks.tsx)이 "총 매수금액·평가금액·손익"을 함께 언급해 안내한다.
 *
 * 시세 미확보(valuationKrw/unrealizedPnlKrw === null) 종목은 그대로 전부 제외한다 — 섞어서
 * 더하면 NaN이 화면에 나간다(docs/frontend-todo.md A-7). "총자산의 N%"는 GET /dashboard/summary의
 * totalAssetKrw를 함께 넘겨야 계산된다.
 */
export function buildPortfolioSummary(holdings: HoldingResponse[], totalAssetKrw?: number): PortfolioSummaryView {
  const priced = holdings.filter(
    (h): h is HoldingResponse & { valuationKrw: number; unrealizedPnlKrw: number } =>
      h.valuationKrw !== null && h.unrealizedPnlKrw !== null,
  )
  const hasMissingPrice = priced.length < holdings.length
  const totalValue = priced.reduce((sum, h) => sum + h.valuationKrw, 0)
  const pnl = priced.reduce((sum, h) => sum + h.unrealizedPnlKrw, 0)
  const pricedCost = priced.reduce((sum, h) => sum + h.totalCostKrw, 0)
  const returnRateAvailable = priced.length > 0 && pricedCost !== 0
  const returnRate = returnRateAvailable ? (pnl / pricedCost) * 100 : 0
  const pnlPositive = pnl >= 0
  const returnRatePositive = returnRate >= 0
  const sharePercent = totalAssetKrw ? (totalValue / totalAssetKrw) * 100 : null
  return {
    totalValueKrw: totalValue,
    totalValueText: priced.length === 0 ? null : formatKrw(totalValue),
    totalCostText: priced.length === 0 ? null : formatKrw(pricedCost),
    hasMissingPrice,
    profitLossText: priced.length === 0 ? null : `${pnlPositive ? '+' : '−'}${formatKrw(Math.abs(pnl))}`,
    pnlPositive,
    returnRateText: returnRateAvailable ? `${returnRatePositive ? '+' : '−'}${Math.abs(returnRate).toFixed(1)}%` : null,
    holdingCount: holdings.length,
    sharePercentText: sharePercent !== null ? `${sharePercent.toFixed(1)}%` : null,
  }
}

// ---------- 청산 종목(전량 매도) ----------

export interface ClosedHoldingCardView {
  stockId: number
  name: string
  marketLabel: string
  sector: string
  ticker: string
  principalText: string
  proceedsText: string
  gainText: string
  positive: boolean
  closedAtText: string
}

/**
 * GET /stocks/holdings/closed는 이미 closedAt 내림차순으로 정렬돼 온다 — 여기서 다시 정렬하지 않는다.
 * returnRatePercent는 원금이 0이면 null이라 percentPart를 '—'로 대체한다(10.6, 원금 0인 극단 케이스).
 */
export function buildClosedHoldingCards(closedHoldings: ClosedHoldingResponse[]): ClosedHoldingCardView[] {
  return closedHoldings.map((h) => {
    const positive = h.realizedPnlKrw >= 0
    const sign = positive ? '+' : '−'
    const percentPart = h.returnRatePercent === null ? '—' : `${sign}${Math.abs(h.returnRatePercent).toFixed(1)}%`
    return {
      stockId: h.stockId,
      name: h.stockName,
      marketLabel: MARKET_LABELS[h.market],
      sector: h.sector ?? '기타',
      ticker: h.ticker,
      principalText: formatKrw(h.principalKrw),
      proceedsText: formatKrw(h.proceedsKrw),
      gainText: `${sign}${formatKrw(Math.abs(h.realizedPnlKrw))}원 (${percentPart})`,
      positive,
      closedAtText: isoDateToDisplay(h.closedAt),
    }
  })
}

// ---------- 매매 계좌 필터 ----------

/**
 * 시장별로 매매에 쓸 수 있는 계좌 타입. 서버가 계좌 타입을 검증하지 않아 현금 계좌로도 매매가 그대로
 * 등록되던 문제를 프론트에서 좁혀 막는다.
 *
 * 계약 변경으로 DOMESTIC_STOCK/FOREIGN_STOCK이 STOCK 하나가 되면서 **KR과 US가 같은
 * 계좌 타입을 본다** — 실제 증권계좌 하나가 삼성전자와 애플을 함께 담기 때문이다. 잠깐 유지됐던
 * "국내 종목은 국내주식 계좌만" 규칙은 서버에서 사라졌으니 되살리지 말 것. 그래도 이 표가 남아 있는
 * 이유는 그대로다: 현금·예적금·연금 계좌로 매매가 잡히는 것은 계속 막는다.
 */
const TRADE_ACCOUNT_TYPES_BY_MARKET: Record<Market, AccountType[]> = {
  KR: ['STOCK'],
  US: ['STOCK'],
  CRYPTO: ['CRYPTO'],
}

/**
 * 매매(QuickStockModal) 계좌 드롭다운에 노출할 계좌 타입. 서버가 계좌 타입을 검증하지 않아
 * (docs/backend-request.md B-1-3) 현금 계좌로도 매매가 그대로 등록되던 문제(0-4-7)를 프론트에서
 * 좁혀 막는다. 선택된 시장에 맞는 계좌 타입만 남긴다(위 TRADE_ACCOUNT_TYPES_BY_MARKET 참고).
 */
export function filterTradeAccounts(accounts: AccountResponse[], market: Market): AccountResponse[] {
  const allowed = TRADE_ACCOUNT_TYPES_BY_MARKET[market]
  return accounts.filter((a) => allowed.includes(a.type))
}

/**
 * 계좌 유형 → 그 계좌가 담을 수 있는 시장 **목록**. 위 TRADE_ACCOUNT_TYPES_BY_MARKET의 역방향이며,
 * 매매 대상이 아닌 유형(현금·예적금·연금기타)은 빈 배열이다.
 *
 * 이전에는 계좌 유형과 시장이 1:1이라 Market 하나를 돌려줬지만, STOCK 계좌가 KR과 US를
 * 함께 담게 되면서 배열이 됐다 — 이 계좌에 담긴 종목의 시장은 계좌가 아니라 **고른 종목**이 정한다
 * (AccountHoldingsField가 줄마다 StockRes.market을 들고 있다).
 *
 * 보유 종목 추가(AddHoldingsModal)는 시장이 아니라 계좌를 먼저 고르는 순서라 이 방향이 필요하다 —
 * 고른 계좌가 종목 검색 결과의 범위를 정한다.
 */
export function marketsOfAccountType(type: AccountType): Market[] {
  return (Object.keys(TRADE_ACCOUNT_TYPES_BY_MARKET) as Market[]).filter((m) =>
    TRADE_ACCOUNT_TYPES_BY_MARKET[m].includes(type),
  )
}

/** 종목·코인을 담을 수 있는 계좌만(주식·가상자산) — 시장 구분 없이 전부. */
export function filterHoldingAccounts(accounts: AccountResponse[]): AccountResponse[] {
  return accounts.filter((a) => marketsOfAccountType(a.type).length > 0)
}

export interface AccountInstitutionMeta {
  tokenKey: string
  institutionName: string
}

/**
 * QuickStockModal 계좌 드롭다운에 "이 계좌가 어느 기관 것인지"를 함께 보여주기 위한 조인.
 * AccountResponse.institutionId로 GET /institutions 응답을 찾아 그 기관의
 * icon(tokenKey)이 BANK_INSTITUTIONS 마스터(design/bank-institutions.ts)에 실제로 등록된 값일 때만
 * 매칭으로 본다 — institutionName은 있는데 기관에 아이콘을 아직 안 골랐거나(icon: null) BankIcon이
 * 모르는 값이면, 어설프게 기본 아이콘(pillar)으로 채우지 않고 계좌명만 보여준다(호출부 결정). null을
 * 돌려주면 호출부는 아이콘·보조줄 없이 이름만 렌더한다.
 */
export function accountInstitutionMeta(
  account: AccountResponse,
  institutions: InstitutionResponse[],
): AccountInstitutionMeta | null {
  if (!account.institutionName || account.institutionId === null) return null
  const institution = institutions.find((i) => i.id === account.institutionId)
  if (!institution?.icon || !findBankInstitution(institution.icon)) return null
  return { tokenKey: institution.icon, institutionName: account.institutionName }
}

// ---------- 매매 내역 ----------

export interface TradeRowView {
  id: number
  /**
   * 원본 체결일('YYYY-MM-DD'). dateLabel은 'MM.DD'로 잘려 연도가 없어 정렬·병합에 쓸 수 없다 —
   * 계좌 상세가 가계부 거래와 한 목록으로 섞을 때 이 값으로 날짜를 비교한다(assetsView
   * buildAccountActivity).
   */
  isoDate: string
  dateLabel: string
  stockName: string
  tag: string
  amountText: string
}

/** getTrades가 size를 생략해 호출하므로 GET /trades는 조건에 맞는 전 건을 한 번에 내려준다
 * (trade.type.ts 참고) — 화면에는 그중 최근 N건만 보여준다. */
export const TRADE_HISTORY_LIMIT = 10

function shortTradeDateLabel(isoDate: string): string {
  return isoDate.slice(5).replace('-', '.')
}

/**
 * 매매 내역 섹션(Stocks.tsx)이 쓰는 뷰모델. 최신 체결일 순(동일 일자는 id 내림차순, 안정적인
 * tie-break)으로 정렬하고 상위 limit건만 남긴다 — 조용히 자르지 않도록 호출부가 그 사실을 캡션으로
 * 밝힐 것.
 *
 * 투자 거래(매수·매도)는 ds_rules_v2_5.md §10-4에 따라 "이체"로 취급한다 — 수입/지출 파스텔이나
 * 등락색이 아니라 무채색(text-strong)으로, 부호 없이 총액만 보여준다.
 */
export function buildTradeRows(trades: TradeResponse[], market?: Market, limit: number = TRADE_HISTORY_LIMIT): TradeRowView[] {
  return [...trades]
    .filter((t) => !market || t.market === market)
    .sort((a, b) => (a.tradeDate === b.tradeDate ? b.id - a.id : b.tradeDate.localeCompare(a.tradeDate)))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      isoDate: t.tradeDate,
      dateLabel: shortTradeDateLabel(t.tradeDate),
      stockName: t.stockName,
      tag: t.side === 'BUY' ? '매수' : '매도',
      amountText:
        marketToCurrency(t.market) === 'USD'
          ? `$${formatCurrencyAmount(t.quantity * t.price, 'USD')}`
          : `${formatKrw(t.quantity * t.price)}원`,
    }))
}
