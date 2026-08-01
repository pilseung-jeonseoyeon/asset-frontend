// Source: secret/Asset Manager v14.dc.html L3652-3696 (natureBlocks/instBlocks/buildMapTiers),
// L3699-3719 (assetGoals — re-exported from mockDashboard, goals), L3786-3826 (assetCatsRaw/assetCats,
// activity), L4568 (liquidPct/lockedPct) — transcribed verbatim. mapSort toggle UI does not actually
// exist anywhere in the rendered markup (isAssetOverview/isAssetAccounts/isAssetGoals and
// mapTabNature/mapTabInstitution are computed but never referenced — confirmed dead code via grep), so
// mapBlocks is always built from natureBlocks here, matching what actually renders.

import { fmt } from '../utils/format'
import type { TreemapBlock } from '../components/primitives/Treemap/Treemap'

interface RawBlock {
  id: string
  label: string
  icon: string
  amt: number
  pct: number
  subs: string[]
  perf: string
  perfAmt: string
}

const natureBlocks: RawBlock[] = [
  { id: 'c5', label: '연금·기타', icon: 'account_balance', amt: 296525000, pct: 23, subs: ['국민연금', '개인연금', '연금저축펀드'], perf: '연 2.9%', perfAmt: '+6,410,000원' },
  { id: 'c2', label: '국내주식', icon: 'trending_up', amt: 282590000, pct: 22, subs: ['삼성전자', 'SK하이닉스', 'NAVER'], perf: '+6.2%', perfAmt: '+16,400,000원' },
  { id: 'c1', label: '예적금', icon: 'savings', amt: 245280000, pct: 19, subs: ['신한은행 정기예금', '카카오뱅크 적금'], perf: '연 3.9%', perfAmt: '+1,120,000원 (이자)' },
  { id: 'c3', label: '해외주식', icon: 'public', amt: 231210000, pct: 18, subs: ['NVIDIA', 'Apple', 'Tesla'], perf: '+11.4%', perfAmt: '+23,650,000원' },
  { id: 'c4', label: '가상자산', icon: 'currency_bitcoin', amt: 141295000, pct: 11, subs: ['업비트 BTC', '업비트 ETH'], perf: '−2.8%', perfAmt: '−4,070,000원' },
  { id: 'c0', label: '현금', icon: 'wallet', amt: 87600000, pct: 7, subs: ['파킹통장'], perf: '연 2.6%', perfAmt: '+230,000원' },
]

const RAMP = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

function buildMapTiers(raw: RawBlock[], onOpen: (id: string) => void): TreemapBlock[] {
  const main = raw.filter((b) => b.pct >= 5)
  const etcRaw = raw.filter((b) => b.pct < 5)
  const blocks: (RawBlock & { isEtc?: boolean })[] = main.map((b) => ({ ...b }))
  if (etcRaw.length) {
    const etcPct = etcRaw.reduce((sum, b) => sum + b.pct, 0)
    const etcAmt = etcRaw.reduce((sum, b) => sum + b.amt, 0)
    blocks.push({ id: 'etc', label: '기타', icon: 'more_horiz', amt: etcAmt, pct: etcPct, isEtc: true, subs: etcRaw.map((x) => x.label), perf: '−', perfAmt: '개별 항목 참고' })
  }
  blocks.sort((a, b) => b.pct - a.pct)
  return blocks.map((b, bi) => {
    const tier = b.pct >= 15 ? 'full' : b.pct >= 6 ? 'medium' : 'icon'
    return {
      id: b.id, label: b.label, icon: b.icon, amtFmt: fmt(b.amt), pct: b.pct, widthPct: b.pct,
      tint: RAMP[Math.min(bi, RAMP.length - 1)], fg: bi < 3 ? '#FFFFFF' : 'var(--text-strong)', accent: 'var(--text-strong)',
      showHeader: tier !== 'icon', showIconOnly: tier === 'icon',
      cursor: b.isEtc ? 'default' : 'pointer',
      isEtc: b.isEtc, subs: b.subs, perf: b.perf, perfAmt: b.perfAmt,
      open: b.isEtc ? undefined : () => onOpen(b.id),
    }
  })
}

export function getMapBlocks(onOpen: (id: string) => void): TreemapBlock[] {
  return buildMapTiers(natureBlocks, onOpen)
}

// ---------- 유동성 뷰 (L4568, hardcoded) ----------
export const liquidPct = 18
export const lockedPct = 82
export const liquidAmtFmt = fmt(232000000)
export const lockedAmtFmt = fmt(1052500000)

// ---------- 자산 구성 카테고리 (L3786-3816) ----------
interface AssetCatAccountRaw {
  name: string
  inst: string
  amt: number
}
interface AssetCatRaw {
  id: string
  name: string
  icon: string
  color: string
  accounts: AssetCatAccountRaw[]
}

const assetCatsRaw: AssetCatRaw[] = [
  { id: 'c0', name: '현금', icon: 'wallet', color: 'var(--accent)', accounts: [{ name: '파킹통장', inst: '카카오뱅크', amt: 87600000 }] },
  { id: 'c1', name: '예적금', icon: 'savings', color: 'var(--accent)', accounts: [
    { name: '정기예금', inst: '신한은행', amt: 157080000 },
    { name: '자유적금', inst: '카카오뱅크', amt: 88200000 },
  ] },
  { id: 'c2', name: '국내주식', icon: 'trending_up', color: 'var(--accent)', accounts: [
    { name: '위탁계좌 (국내)', inst: '미래에셋증권', amt: 209590000 },
    { name: '위탁계좌', inst: '키움증권', amt: 58000000 },
    { name: '위탁계좌', inst: '토스증권', amt: 15000000 },
  ] },
  { id: 'c3', name: '해외주식', icon: 'public', color: 'var(--accent)', accounts: [{ name: '위탁계좌 (해외)', inst: '미래에셋증권', amt: 231210000 }] },
  { id: 'c4', name: '가상자산', icon: 'currency_bitcoin', color: 'var(--accent)', accounts: [
    { name: 'BTC 지갑', inst: '업비트', amt: 98400000 },
    { name: 'ETH 지갑', inst: '업비트', amt: 42895000 },
  ] },
  { id: 'c5', name: '연금·기타', icon: 'account_balance', color: 'var(--accent)', accounts: [
    { name: '국민연금', inst: '국민연금공단', amt: 112300000 },
    { name: '개인연금', inst: '미래에셋증권', amt: 58225000 },
    { name: '연금저축펀드', inst: '미래에셋증권', amt: 51500000 },
    { name: '소액 P2P', inst: '기타', amt: 12000000 },
  ] },
]

export interface AssetCatAccount extends AssetCatAccountRaw {
  amtFmt: string
}
export interface AssetCat {
  id: string
  name: string
  icon: string
  color: string
  count: number
  totalFmt: string
  accounts: AssetCatAccount[]
}

export const assetCats: AssetCat[] = assetCatsRaw.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  color: c.color,
  count: c.accounts.length,
  totalFmt: fmt(c.accounts.reduce((sum, a) => sum + a.amt, 0)),
  accounts: c.accounts.map((a) => ({ ...a, amtFmt: fmt(a.amt) })),
}))

// Note: the source also defines `activity` (L3819-3826) and a 5-item `goals`/`goalPct` list
// (L3712-3719) — confirmed via whole-file grep that neither is referenced by ANY markup anywhere in
// dc.html (unlike the 2-item `assetGoals`, which does render — see mockDashboard.ts). Dead code in the
// source, same category as dashA/B/C and the assetTab sub-tabs; not ported since nothing renders it.
