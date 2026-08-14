// View-model layer for the 주식(Stocks) screen: adapts server responses (GET /indices, GET /stocks,
// GET /stocks/holdings, GET /stocks/holdings/groups, GET /stocks/holdings/closed, GET /exchanges/summary)
// into the shapes the screen and its modals (QuickStockModal/ExchangeAddModal) render. Ported from the
// old src/data/mockStocks.ts — the pct/sign/color formula (`(pct>=0?'+':'−')+Math.abs(pct).toFixed(1)+'%'`,
// U+2212, var(--up)/var(--down), ds_rules_v2_5.md §10-1) and the ramp color order (§1-6) are transcribed
// verbatim. What changed is the input: values now come from real aggregates instead of hardcoded
// literals, so every division here has an explicit 0-guard (unlike the mock, a real portfolio can
// legitimately have 0 holdings, 0 total value, or 0 cost basis).

import { fmt } from '../utils/format'
import { isoDateToDisplay } from '../utils/date'
import type { ClosedHoldingResponse, HoldingGroupResponse, HoldingResponse, StockResponse } from '@/services/stock'
import type { MarketIndexResponse } from '@/services/marketIndex'
import type { Currency, Market } from '@/services/common.type'

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
        valueFmt: fmt(idx.currentValue),
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
  valueFmt: string
  qtyFmt: string
  gainFmt: string
  positive: boolean
  returnPct: number
}

/**
 * 원가(평가액 − 평가손익)가 0이면 수익률을 계산할 수 없으니 0으로 둔다(신규 매수 직후 등 극단치).
 * buildHoldingCards와 QuickStockModal의 매도 종목 드롭다운이 같은 기준으로 정렬하도록 공유한다.
 */
function holdingReturnPct(h: HoldingResponse): number {
  const costBasis = h.valuationKrw - h.unrealizedPnlKrw
  return costBasis !== 0 ? (h.unrealizedPnlKrw / costBasis) * 100 : 0
}

/** 보유 종목을 수익률 내림차순으로 정렬한다(구 mockStocks.ts 데이터 순서와 동일한 기준). */
export function sortHoldingsByReturn(holdings: HoldingResponse[]): HoldingResponse[] {
  return [...holdings].sort((a, b) => holdingReturnPct(b) - holdingReturnPct(a))
}

/**
 * ticker와 현재가는 HoldingResponse에 없다(stock.type.ts 참고). ticker는 GET /stocks 전체 목록과
 * stockId로 조인하고, 못 찾으면 빈 문자열로 둔다(가짜 값 금지). 현재가·전일대비는 응답 자체가 없어
 * 그리지 않는다. 수익률 높은 순으로 정렬한다(구 mockStocks.ts 데이터 순서와 동일한 기준).
 */
export function buildHoldingCards(holdings: HoldingResponse[], stocks: StockResponse[]): HoldingCardView[] {
  return sortHoldingsByReturn(holdings).map((h) => {
    const returnPct = holdingReturnPct(h)
    const positive = h.unrealizedPnlKrw >= 0
    const sign = positive ? '+' : '−'
    return {
      stockId: h.stockId,
      name: h.stockName,
      marketLabel: MARKET_LABELS[h.market],
      sector: h.sector ?? '기타',
      ticker: stocks.find((s) => s.id === h.stockId)?.ticker ?? '',
      valueFmt: fmt(h.valuationKrw),
      qtyFmt: fmt(h.quantity),
      gainFmt: `${sign}${fmt(Math.abs(h.unrealizedPnlKrw))}원 (${sign}${Math.abs(returnPct).toFixed(1)}%)`,
      positive,
      returnPct,
    }
  })
}

// ---------- 포트폴리오 요약 ----------

export interface PortfolioSummaryView {
  totalValueFmt: string
  totalCostFmt: string
  pnlFmt: string
  pnlPositive: boolean
  returnRateFmt: string
  holdingCount: number
  /** 총자산 대비 비중. totalAssetKrw를 안 넘겼거나 0이면(스냅샷 이력 없는 신규 사용자) null — 캡션을 숨길 것. */
  sharePctFmt: string | null
}

/**
 * 전용 요약 API가 없어 보유 종목 배열을 합산해 파생한다. 총 매수금액 = 총평가 − 평가손익인데, 이는
 * 매매 수수료가 포함된 실제 매수 원가와 다를 수 있다(수수료 반영 원가를 내려주는 API가 없음 — 백엔드
 * 확인 필요 항목). "총자산의 N%"는 GET /dashboard/summary의 totalAssetKrw를 함께 넘겨야 계산된다.
 */
export function buildPortfolioSummary(holdings: HoldingResponse[], totalAssetKrw?: number): PortfolioSummaryView {
  const totalValue = holdings.reduce((sum, h) => sum + h.valuationKrw, 0)
  const pnl = holdings.reduce((sum, h) => sum + h.unrealizedPnlKrw, 0)
  const totalCost = totalValue - pnl
  const returnRate = totalCost !== 0 ? (pnl / totalCost) * 100 : 0
  const pnlPositive = pnl >= 0
  const returnRatePositive = returnRate >= 0
  const sharePct = totalAssetKrw ? (totalValue / totalAssetKrw) * 100 : null
  return {
    totalValueFmt: fmt(totalValue),
    totalCostFmt: fmt(totalCost),
    pnlFmt: `${pnlPositive ? '+' : '−'}${fmt(Math.abs(pnl))}`,
    pnlPositive,
    returnRateFmt: `${returnRatePositive ? '+' : '−'}${Math.abs(returnRate).toFixed(1)}%`,
    holdingCount: holdings.length,
    sharePctFmt: sharePct !== null ? `${sharePct.toFixed(1)}%` : null,
  }
}

// ---------- 외화 보유액의 원화 환산 ----------

/**
 * GET /exchanges/summary는 heldForeignAmount만 주고 원화 환산액이 없다. 여기서 GET /indices의
 * USDKRW.currentValue를 곱해 계산한다. 이 환율은 서버가 unrealizedGainKrw를 계산할 때 쓴 내부
 * 환율과 소스가 달라 소수점 단위로 어긋날 수 있으므로, 호출부는 반드시 "현재 환율 기준"이라는 취지를
 * 캡션으로 병기해 서버 확정값처럼 보이지 않게 해야 한다. usdKrwRate가 없으면(응답에 없거나 조회 실패)
 * null — 이 줄 자체를 그리지 말 것(가짜 값 금지).
 */
export function buildForeignHoldingKrwFmt(heldForeignAmount: number, usdKrwRate: number | undefined): string | null {
  if (usdKrwRate === undefined) return null
  return fmt(Math.round(heldForeignAmount * usdKrwRate))
}

// ---------- 청산 종목(전량 매도) ----------

export interface ClosedHoldingCardView {
  stockId: number
  name: string
  marketLabel: string
  sector: string
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
      principalFmt: fmt(h.principalKrw),
      proceedsFmt: fmt(h.proceedsKrw),
      gainFmt: `${sign}${fmt(Math.abs(h.realizedPnlKrw))}원 (${pctPart})`,
      positive,
      closedAtFmt: isoDateToDisplay(h.closedAt),
    }
  })
}
