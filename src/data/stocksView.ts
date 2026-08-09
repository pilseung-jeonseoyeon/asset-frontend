// View-model layer for the 주식(Stocks) screen: adapts server responses (GET /indices, GET /stocks,
// GET /stocks/holdings, GET /stocks/holdings/groups, GET /exchanges/summary) into the shapes the screen
// and its modals (QuickStockModal/ExchangeAddModal) render. Ported from the old src/data/mockStocks.ts —
// the pct/sign/color formula (`(pct>=0?'+':'−')+Math.abs(pct).toFixed(1)+'%'`, U+2212, var(--up)/
// var(--down), ds_rules_v2_5.md §10-1) and the ramp color order (§1-6) are transcribed verbatim. What
// changed is the input: values now come from real aggregates instead of hardcoded literals, so every
// division here has an explicit 0-guard (unlike the mock, a real portfolio can legitimately have 0
// holdings, 0 total value, or 0 cost basis).

import { fmt } from '../utils/format'
import type { HoldingGroupResponse, HoldingResponse, StockResponse } from '@/services/stock'
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

/** 신규 종목 등록 시 market에 따른 기본 통화. 이 화면은 KR/US만 다루므로 CRYPTO는 대상이 아니다. */
export function marketToCurrency(market: Market): Currency {
  return market === 'US' ? 'USD' : 'KRW'
}

// ---------- 시장 지표 ----------

export interface MarketIndexView {
  symbol: string
  label: string
  valueFmt: string
  changeFmt: string
  positive: boolean
}

/**
 * 서버가 전일 종가·변동률(%)을 내려주지 않는다(marketIndex.type.ts 참고) — changeFromPreviousClose(절대
 * 증감값)를 대신 표기한다. USDKRW는 서버가 아예 내려주지 않으므로 이 배열에 없으면 화면에서도 렌더하지
 * 않는다(빈 자리를 하드코딩으로 메우지 않음). 부호·색상 규칙(§10-1, U+2212)은 그대로 유지한다.
 */
export function buildMarketIndexViews(indices: MarketIndexResponse[]): MarketIndexView[] {
  return indices.map((idx) => {
    const positive = idx.changeFromPreviousClose >= 0
    return {
      symbol: idx.symbol,
      label: INDEX_SYMBOL_LABELS[idx.symbol] ?? idx.symbol,
      valueFmt: fmt(idx.currentValue),
      changeFmt: (positive ? '+' : '−') + fmt(Math.abs(idx.changeFromPreviousClose)),
      positive,
    }
  })
}

// ---------- 그룹별 수익률 ----------

export interface GroupReturnView {
  key: string
  label: string
  pctFmt: string
  color: string
}

/** by='sector'면 groupKey가 이미 한글 섹터명(또는 '기타')이고, by='market'이면 'KR' 같은 enum 코드다. */
export function buildGroupReturns(groups: HoldingGroupResponse[], by: 'sector' | 'market'): GroupReturnView[] {
  return groups.map((g) => {
    const positive = g.returnRatePercent >= 0
    return {
      key: g.groupKey,
      label: by === 'market' ? (MARKET_LABELS[g.groupKey as Market] ?? g.groupKey) : g.groupKey,
      pctFmt: (positive ? '+' : '−') + Math.abs(g.returnRatePercent).toFixed(1) + '%',
      color: positive ? 'var(--up)' : 'var(--down)',
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
 * ticker와 현재가는 HoldingResponse에 없다(stock.type.ts 참고). ticker는 GET /stocks 전체 목록과
 * stockId로 조인하고, 못 찾으면 빈 문자열로 둔다(가짜 값 금지). 현재가·전일대비는 응답 자체가 없어
 * 그리지 않는다. 수익률 높은 순으로 정렬한다(구 mockStocks.ts 데이터 순서와 동일한 기준).
 */
export function buildHoldingCards(holdings: HoldingResponse[], stocks: StockResponse[]): HoldingCardView[] {
  return holdings
    .map((h) => {
      const costBasis = h.valuationKrw - h.unrealizedPnlKrw
      const returnPct = costBasis !== 0 ? (h.unrealizedPnlKrw / costBasis) * 100 : 0
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
    .sort((a, b) => b.returnPct - a.returnPct)
}

// ---------- 포트폴리오 요약 ----------

export interface PortfolioSummaryView {
  totalValueFmt: string
  totalCostFmt: string
  pnlFmt: string
  pnlPositive: boolean
  returnRateFmt: string
  holdingCount: number
}

/**
 * 전용 요약 API가 없어 보유 종목 배열을 합산해 파생한다. 총 매수금액 = 총평가 − 평가손익인데, 이는
 * 매매 수수료가 포함된 실제 매수 원가와 다를 수 있다(수수료 반영 원가를 내려주는 API가 없음 — 백엔드
 * 확인 필요 항목). "총자산의 N%"는 대시보드 총자산 API가 있어야 계산 가능해 여기서 다루지 않는다.
 */
export function buildPortfolioSummary(holdings: HoldingResponse[]): PortfolioSummaryView {
  const totalValue = holdings.reduce((sum, h) => sum + h.valuationKrw, 0)
  const pnl = holdings.reduce((sum, h) => sum + h.unrealizedPnlKrw, 0)
  const totalCost = totalValue - pnl
  const returnRate = totalCost !== 0 ? (pnl / totalCost) * 100 : 0
  const pnlPositive = pnl >= 0
  const returnRatePositive = returnRate >= 0
  return {
    totalValueFmt: fmt(totalValue),
    totalCostFmt: fmt(totalCost),
    pnlFmt: `${pnlPositive ? '+' : '−'}${fmt(Math.abs(pnl))}`,
    pnlPositive,
    returnRateFmt: `${returnRatePositive ? '+' : '−'}${Math.abs(returnRate).toFixed(1)}%`,
    holdingCount: holdings.length,
  }
}
