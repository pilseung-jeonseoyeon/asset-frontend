// View-model layer for the 주식(Stocks) screen: adapts server responses (GET /indices, GET /stocks,
// GET /stocks/holdings, GET /stocks/holdings/groups, GET /stocks/holdings/closed, GET /exchanges/summary,
// GET /trades) into the shapes the screen and its modals (QuickStockModal/ExchangeAddModal/
// TradeEditModal) render. Ported from the old src/data/mockStocks.ts — the pct/sign/color formula
// (`(pct>=0?'+':'−')+Math.abs(pct).toFixed(1)+'%'`, U+2212, var(--up)/var(--down), ds_rules_v2_5.md
// §10-1) and the ramp color order (§1-6) are transcribed verbatim. What changed is the input: values
// now come from real aggregates instead of hardcoded literals, so every division here has an explicit
// 0-guard (unlike the mock, a real portfolio can legitimately have 0 holdings, 0 total value, or 0 cost
// basis).
//
// 2026-08-17 추가: filterTradeAccounts(매매 계좌를 증권/가상자산 타입으로 좁힘), buildTradeRows(매매
// 내역 섹션 뷰모델, 투자 거래를 §10-4의 "이체"로 렌더). buildMarketIndexViews의 valueFmt도 자릿수를
// 항상 2자리로 고정하도록 고쳤다(서버가 지수마다 소수점 자릿수를 다르게 내려보내 KOSPI/S&P는 2자리인데
// NASDAQ만 3자리로 온 적이 있음, 실행 화면 확인).
//
// 2026-08-17 재수정(docs/frontend-todo.md A-7 · B-5): HoldingRes.valuationKrw·unrealizedPnlKrw·
// returnRatePercent·currentPrice·previousClosePrice·dayChangePercent·priceAsOf가 nullable로
// 확인됐다(시세 미확보 시 전부 null, 0이 아님). buildHoldingCards/buildPortfolioSummary가 null을
// 명시적으로 걸러내도록 다시 썼고, 원가 역산(valuationKrw − unrealizedPnlKrw)은 서버가 주는
// totalCostKrw로 교체했다. ticker·currentPrice·dayChangePercent가 이제 HoldingRes/ClosedHoldingRes에
// 직접 포함돼 있어(과거엔 없었다) GET /stocks 전체 목록 조인이 더 이상 필요 없다.
//
// 2026-08-17 리뷰 반영: buildPortfolioSummary의 총 매수금액·총 평가금액·평가손익·평가수익률
// 네 지표를 같은 모수(시세 확보 종목)로 통일했고(사유는 함수 docstring), totalValueFmt도
// pnlFmt/returnRateFmt와 같은 null 폴백 패턴을 따르게 했다. buildHoldingCards의 gainFmt는 손익
// 금액과 수익률 표시를 분리해, 원가가 0이라 수익률만 계산 불가(returnRatePercent === null)여도
// 실제 손익 금액(unrealizedPnlKrw)은 계속 보여준다. currentPriceFmt/buildTradeRows.amountFmt는
// 통화별 소수 자릿수를 고정하는 utils/format.ts의 formatCurrencyAmount로 교체했다.

import { fmt, formatCurrencyAmount } from '../utils/format'
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
 * 시장 지표 카드 표시 순서(dc.html 마크업 순서: KOSPI → S&P 500 → NASDAQ → USD/KRW). 일부 심볼
 * 조회가 실패하면 배열에서 통째로 빠질 수 있으므로(marketIndex.type.ts) 이 목록에 없는 심볼은
 * 버리지 않고 뒤에 붙인다.
 */
const MARKET_INDEX_ORDER = ['KOSPI', 'SPX', 'IXIC', 'USDKRW']

/** 로딩 중 스켈레톤을 몇 칸 그릴지 — 실제로 도착할 지표 개수와 같은 칸 수라야 레이아웃이 튀지 않는다.
 *  (일부 심볼 조회가 실패하면 실제 칸 수가 줄어들 수는 있다.) */
export const MARKET_INDEX_COUNT = MARKET_INDEX_ORDER.length

function marketIndexOrderIndex(symbol: string): number {
  const idx = MARKET_INDEX_ORDER.indexOf(symbol)
  return idx === -1 ? MARKET_INDEX_ORDER.length : idx
}

/** 화면의 stockTab('전체'/'국내'/'해외')을 GET /stocks/holdings의 market 파라미터로 변환한다. */
export function stockTabToMarket(stockTab: string): Market | undefined {
  if (stockTab === '국내') return 'KR'
  if (stockTab === '해외') return 'US'
  return undefined
}

/** QuickStockModal의 stockBuyMarket('domestic'/'overseas')을 서버 Market으로 변환한다. */
export function buyMarketToMarket(stockBuyMarket: string): Market {
  return stockBuyMarket === 'overseas' ? 'US' : 'KR'
}

/**
 * 신규 종목 등록 시 market에 따른 기본 통화. 이 화면은 KR/US만 다루므로 CRYPTO는 대상이 아니다.
 *
 * CRYPTO 종목은 서버 시세 수집이 업비트 KRW 마켓에 고정되어 있어, 등록 시 currency를 반드시
 * KRW로 넣어야 한다(USD로 등록하면 환율이 이중으로 곱해진다 — 2026-08-15 백엔드 확정). 이후
 * CRYPTO 등록 UI를 만들 때는 통화를 선택하게 하지 말고 KRW로 고정해서 구현할 것.
 */
export function marketToCurrency(market: Market): Currency {
  return market === 'US' ? 'USD' : 'KRW'
}

// ---------- 시장 지표 ----------

export interface MarketIndexView {
  symbol: string
  label: string
  valueFmt: string
  /** null이면 변동률 배지를 그리지 말 것(USDKRW는 전일 종가 개념이 없어 항상 null). */
  changePctFmt: string | null
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
    .map((idx) => {
      const change = idx.changeFromPreviousClose
      const previousClose = change === null ? null : idx.currentValue - change
      const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null
      const positive = changePercent !== null ? changePercent >= 0 : true
      return {
        symbol: idx.symbol,
        label: INDEX_SYMBOL_LABELS[idx.symbol] ?? idx.symbol,
        // 소수점 자릿수를 지수마다 서버가 다르게 내려준다(NASDAQ만 3자리로 온 적 있음, 실행 화면
        // 확인) — fmt()는 자릿수를 고정하지 않으므로, 원본대로 항상 2자리로 고정한다.
        valueFmt: idx.currentValue.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        changePctFmt: changePercent !== null ? (positive ? '+' : '−') + Math.abs(changePercent).toFixed(2) + '%' : null,
        positive,
      }
    })
}

// ---------- 그룹별 수익률 ----------

export interface GroupReturnView {
  key: string
  label: string
  /** 원가가 0이라 수익률을 계산할 수 없는 그룹은 null — 호출부에서 '—'로 폴백한다. */
  pctFmt: string | null
  color: string
}

/**
 * by='sector'면 groupKey가 이미 한글 섹터명(또는 '기타')이고, by='market'이면 'KR' 같은 enum 코드다.
 *
 * 원가(평가액 − 손익)가 0인 그룹은 서버가 returnRatePercent를 null로 준다(API-SPEC §10.5).
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
        pctFmt: rate === null ? null : (positive ? '+' : '−') + Math.abs(rate).toFixed(1) + '%',
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
  pct: number
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
      pct: Math.round((g.totalValuationKrw / total) * 100),
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
  valueFmt: string | null
  /** 총 매수금액(원화) — 시세와 무관하게 항상 채워진다. priceMissing 카드의 대체 표시용. */
  costFmt: string
  qtyFmt: string
  /** priceMissing이면 null. */
  gainFmt: string | null
  /** priceMissing이면 의미 없음(항상 false) — 반드시 priceMissing을 먼저 분기할 것. */
  positive: boolean
  /** priceMissing이거나 원가가 0이면 null. */
  returnPct: number | null
  /** 종목 통화 기준 현재가 포맷("77,000원" / "$77.00"). priceMissing이면 null. */
  currentPriceFmt: string | null
  /** 전 영업일 대비 등락률. priceMissing이거나 직전 종가가 없으면 null. */
  dayChangePctFmt: string | null
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

/** 수익률 높은 순으로 정렬한다(구 mockStocks.ts 데이터 순서와 동일한 기준). ticker·현재가·전
 * 영업일 대비는 이제 HoldingResponse에 직접 포함돼 있다(2026-08-17, stock.type.ts 참고 —
 * 과거엔 없어 별도 조인이 필요했다). */
export function buildHoldingCards(holdings: HoldingResponse[]): HoldingCardView[] {
  return sortHoldingsByReturn(holdings).map((h) => {
    const symbol = currencySymbolOf(h.currency)
    const dayChangePositive = h.dayChangePercent !== null && h.dayChangePercent >= 0
    const currentPriceFmt =
      h.currentPrice === null ? null : `${symbol}${formatCurrencyAmount(h.currentPrice, h.currency)}${symbol ? '' : '원'}`
    const dayChangePctFmt =
      h.dayChangePercent === null ? null : `${dayChangePositive ? '+' : '−'}${Math.abs(h.dayChangePercent).toFixed(1)}%`
    const base = {
      stockId: h.stockId,
      name: h.stockName,
      marketLabel: MARKET_LABELS[h.market],
      sector: h.sector ?? '기타',
      ticker: h.ticker,
      costFmt: fmt(h.totalCostKrw),
      qtyFmt: fmt(h.quantity),
      currentPriceFmt,
      dayChangePctFmt,
      dayChangePositive,
    }

    // priceAsOf가 null이면 valuationKrw·unrealizedPnlKrw·returnRatePercent가 함께 null이다(HoldingRes
    // 계약) — 이 분기 자체로 아래 필드들의 null 가능성을 없애 타입 단언 없이 안전하게 좁힌다.
    if (h.priceAsOf === null || h.valuationKrw === null || h.unrealizedPnlKrw === null) {
      return { ...base, priceMissing: true, valueFmt: null, gainFmt: null, positive: false, returnPct: null }
    }

    const positive = h.unrealizedPnlKrw >= 0
    const sign = positive ? '+' : '−'
    // 손익 금액(unrealizedPnlKrw)과 수익률(returnRatePercent)은 서로 다른 이유로 null이 될 수
    // 있다 — 원가가 0인 종목(증정주 등)은 수익률만 계산 불가(returnRatePercent === null)일 뿐
    // 손익 금액 자체는 항상 있으므로, 수익률이 없다고 손익 금액까지 통째로 숨기지 않는다.
    const pctPart = h.returnRatePercent === null ? '' : ` (${sign}${Math.abs(h.returnRatePercent).toFixed(1)}%)`
    return {
      ...base,
      priceMissing: false,
      valueFmt: fmt(h.valuationKrw),
      gainFmt: `${sign}${fmt(Math.abs(h.unrealizedPnlKrw))}원${pctPart}`,
      positive,
      returnPct: h.returnRatePercent,
    }
  })
}

// ---------- 포트폴리오 요약 ----------

export interface PortfolioSummaryView {
  /** 억/만 축약 캡션(§4-2) 계산용 원본 금액. 화면에는 항상 totalValueFmt(콤마 포맷)를 그린다. 시세
   * 미확보 종목은 제외한 합계다(hasMissingPrice가 true면 실제보다 적을 수 있음). */
  totalValueKrw: number
  /** 평가손익을 계산할 수 있는 종목이 하나도 없으면(전 종목 시세 미확보) null — '—'로 폴백할 것. */
  totalValueFmt: string | null
  /** 총 매수금액 — 시세 확보 종목(priced)만의 totalCostKrw 합계(수수료 포함). 시세 미확보 종목이
   * 하나도 없으면 null — 위와 동일 사유. */
  totalCostFmt: string | null
  /** 시세 미확보 종목이 하나라도 있으면 true — "총 매수금액·평가금액·손익 계산에서 일부 종목을
   * 제외했다" 캡션용. */
  hasMissingPrice: boolean
  /** 평가손익을 계산할 수 있는 종목이 하나도 없으면 null. */
  pnlFmt: string | null
  pnlPositive: boolean
  /** 위와 동일 사유로 null 가능. */
  returnRateFmt: string | null
  holdingCount: number
  /** 총자산 대비 비중. totalAssetKrw를 안 넘겼거나 0이면(스냅샷 이력 없는 신규 사용자) null — 캡션을 숨길 것. */
  sharePctFmt: string | null
}

/**
 * 전용 요약 API가 없어 보유 종목 배열을 합산해 파생한다.
 *
 * 총 매수금액·총 평가금액·평가손익·평가수익률 네 지표는 모두 시세 확보 종목(priced)만으로
 * 합산해 같은 모수를 쓴다. 예전에는 총 매수금액만 전체 보유종목(totalCostKrw 전량)의 합이라
 * 시세 확보분만 더한 평가금액·손익과 모수가 달랐다 — 예를 들어 A(원가 100만, 시세 미확보) +
 * B(원가 200만, 평가 250만)면 "평가금액 250만 / 매수금액 300만인데 손익은 +50만"으로 보여
 * 사용자가 250만−300만=−50만로 암산한 값과 어긋났다(리뷰 지적). 네 숫자를 모두 시세 확보분
 * 기준으로 통일해 "평가금액 − 매수금액 = 손익"이 화면에서도 항상 맞게 했다. 그 대가로 시세
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
  const sharePct = totalAssetKrw ? (totalValue / totalAssetKrw) * 100 : null
  return {
    totalValueKrw: totalValue,
    totalValueFmt: priced.length === 0 ? null : fmt(totalValue),
    totalCostFmt: priced.length === 0 ? null : fmt(pricedCost),
    hasMissingPrice,
    pnlFmt: priced.length === 0 ? null : `${pnlPositive ? '+' : '−'}${fmt(Math.abs(pnl))}`,
    pnlPositive,
    returnRateFmt: returnRateAvailable ? `${returnRatePositive ? '+' : '−'}${Math.abs(returnRate).toFixed(1)}%` : null,
    holdingCount: holdings.length,
    sharePctFmt: sharePct !== null ? `${sharePct.toFixed(1)}%` : null,
  }
}

// ---------- 청산 종목(전량 매도) ----------

export interface ClosedHoldingCardView {
  stockId: number
  name: string
  marketLabel: string
  sector: string
  ticker: string
  principalFmt: string
  proceedsFmt: string
  gainFmt: string
  positive: boolean
  closedAtFmt: string
}

/**
 * GET /stocks/holdings/closed는 이미 closedAt 내림차순으로 정렬돼 온다 — 여기서 다시 정렬하지 않는다.
 * returnRatePercent는 원금이 0이면 null이라 pctPart를 '—'로 대체한다(10.6, 원금 0인 극단 케이스).
 */
export function buildClosedHoldingCards(closedHoldings: ClosedHoldingResponse[]): ClosedHoldingCardView[] {
  return closedHoldings.map((h) => {
    const positive = h.realizedPnlKrw >= 0
    const sign = positive ? '+' : '−'
    const pctPart = h.returnRatePercent === null ? '—' : `${sign}${Math.abs(h.returnRatePercent).toFixed(1)}%`
    return {
      stockId: h.stockId,
      name: h.stockName,
      marketLabel: MARKET_LABELS[h.market],
      sector: h.sector ?? '기타',
      ticker: h.ticker,
      principalFmt: fmt(h.principalKrw),
      proceedsFmt: fmt(h.proceedsKrw),
      gainFmt: `${sign}${fmt(Math.abs(h.realizedPnlKrw))}원 (${pctPart})`,
      positive,
      closedAtFmt: isoDateToDisplay(h.closedAt),
    }
  })
}

// ---------- 매매 계좌 필터 ----------

/**
 * 시장별로 매매에 쓸 수 있는 계좌 타입. 서버가 계좌 타입을 검증하지 않아 현금 계좌로도 매매가 그대로
 * 등록되던 문제를 프론트에서 좁혀 막는다.
 *
 * 2026-08-20 백엔드 계약 변경으로 계좌 유형이 6종이 되면서 국내/해외 증권 계좌가 타입 자체로 갈리게
 * 됐다 — 예전에는 둘 다 BROKERAGE라 KR·US 모두 같은 목록을 봤지만, 이제 국내 종목은 국내주식 계좌,
 * 해외 종목은 해외주식 계좌만 고를 수 있다. 통화가 맞지 않는 계좌로 매매가 잡히던 여지가 사라진다.
 */
const TRADE_ACCOUNT_TYPES_BY_MARKET: Record<Market, AccountType[]> = {
  KR: ['DOMESTIC_STOCK'],
  US: ['FOREIGN_STOCK'],
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

export interface AccountInstitutionMeta {
  tokenKey: string
  institutionName: string
}

/**
 * QuickStockModal 계좌 드롭다운에 "이 계좌가 어느 기관 것인지"를 함께 보여주기 위한 조인
 * (2026-08-18 추가). AccountResponse.institutionId로 GET /institutions 응답을 찾아 그 기관의
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
  dateLabel: string
  stockName: string
  tag: string
  amountFmt: string
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
      dateLabel: shortTradeDateLabel(t.tradeDate),
      stockName: t.stockName,
      tag: t.side === 'BUY' ? '매수' : '매도',
      amountFmt:
        marketToCurrency(t.market) === 'USD'
          ? `$${formatCurrencyAmount(t.quantity * t.price, 'USD')}`
          : `${fmt(t.quantity * t.price)}원`,
    }))
}
