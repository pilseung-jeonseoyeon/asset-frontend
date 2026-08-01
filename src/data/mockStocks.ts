// Source: secret/Asset Manager v14.dc.html L2371-2632 (Stock screen literal markup) — transcribed
// verbatim. The 6 holding cards and market indices are hardcoded HTML in the source (no sc-for loop),
// ported here as literal arrays for idiomatic React while producing identical output. groupReturns
// computation (L4431-4434) is reproduced as a function of stockGroupTab, matching source exactly.

export interface MarketIndex {
  name: string
  value: string
  change: string
  positive: boolean
}

export const marketIndices: MarketIndex[] = [
  { name: 'KOSPI', value: '2,841.32', change: '+0.62%', positive: true },
  { name: 'S&P 500', value: '5,634.61', change: '+0.31%', positive: true },
  { name: 'NASDAQ', value: '18,472.57', change: '−0.18%', positive: false },
  { name: 'USD/KRW', value: '1,378.50', change: '+0.24%', positive: true },
]

export interface StockHolding {
  name: string
  market: '국내' | '해외'
  sector: string
  value: string
  qty: string
  gain: string
  positive: boolean
}

// Source order (수익률 높은 순) preserved exactly.
export const stockHoldings: StockHolding[] = [
  { name: 'NVIDIA', market: '해외', sector: '반도체', value: '118,400,000', qty: '400주', gain: '+69,000,000 (+139.7%)', positive: true },
  { name: 'SK하이닉스', market: '국내', sector: '반도체', value: '91,500,000', qty: '500주', gain: '+26,700,000 (+41.2%)', positive: true },
  { name: 'Apple', market: '해외', sector: '테크', value: '78,210,000', qty: '300주', gain: '+17,310,000 (+28.4%)', positive: true },
  { name: '삼성전자', market: '국내', sector: '반도체', value: '148,200,000', qty: '1,900주', gain: '+19,700,000 (+15.3%)', positive: true },
  { name: 'NAVER', market: '국내', sector: 'IT서비스', value: '42,890,000', qty: '220주', gain: '−5,250,000 (−10.9%)', positive: false },
  { name: 'Tesla', market: '해외', sector: '자동차', value: '34,600,000', qty: '100주', gain: '−7,340,000 (−17.5%)', positive: false },
]

export interface GroupReturn {
  name: string
  pct: number
  pctFmt: string
  color: string
}

const GROUP_RETURNS_SECTOR: { name: string; pct: number }[] = [
  { name: '반도체', pct: 47.5 },
  { name: '테크', pct: 28.4 },
  { name: 'IT서비스', pct: -10.9 },
  { name: '자동차', pct: -17.5 },
]

const GROUP_RETURNS_COUNTRY: { name: string; pct: number }[] = [
  { name: '해외', pct: 51.9 },
  { name: '국내', pct: 17.0 },
]

// Source: L4431-4434 `groupReturns` computed prop — transcribed exactly, incl. U+2212 minus sign (§10-1).
export function getGroupReturns(stockGroupTab: 'sector' | 'country'): GroupReturn[] {
  const raw = stockGroupTab === 'sector' ? GROUP_RETURNS_SECTOR : GROUP_RETURNS_COUNTRY
  return raw.map((g) => ({
    ...g,
    pctFmt: (g.pct >= 0 ? '+' : '−') + Math.abs(g.pct).toFixed(1) + '%',
    color: g.pct >= 0 ? 'var(--up)' : 'var(--down)',
  }))
}

export function getGroupReturnCaption(stockGroupTab: 'sector' | 'country'): string {
  return stockGroupTab === 'sector' ? '보유 섹터별 평가 수익률' : '국내·해외 평가 수익률'
}

export interface SectorSegment {
  label: string
  pct: number
  color: string
}

// Source: L2605-2612 (섹터 비중 donut) — 4 segments summing to 100, all shown in legend (no rank-6
// receded segment here, unlike Dashboard's composition donut).
export const sectorComposition: SectorSegment[] = [
  { label: '반도체', pct: 70, color: 'var(--ramp-1)' },
  { label: '테크', pct: 15, color: 'var(--ramp-2)' },
  { label: 'IT서비스', pct: 8, color: 'var(--ramp-3)' },
  { label: '자동차', pct: 7, color: 'var(--ramp-4)' },
]
