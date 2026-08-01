// Source: secret/Asset Manager v14.dc.html L3695-3710 (assetGoals + totalAssetsNow/annualGoalTarget/
// monthlyGoalTarget/monthlyGoalCurrent), L3660-3667 (instBlocks, reused for the "주요 자산 보관처" row
// literal 4-item list at L999-1034), L950-987 (donut composition + legend, incl. the unlabeled 7%
// rank-6 segment — no legend dot, per ds_rules §1-5 "receded value" rule, transcribed as-is not "fixed").

import { fmt } from '../utils/format'

export const totalAssetsNow = 1284500000
const annualGoalTarget = 1302500000
const monthlyGoalTarget = 3000000
const monthlyGoalCurrent = 3240000
const annualPctReal = Math.round((totalAssetsNow / annualGoalTarget) * 100)
const monthlyPctReal = Math.round((monthlyGoalCurrent / monthlyGoalTarget) * 100)

export interface AssetGoal {
  id: string
  name: string
  current: number
  target: number
  color: string
  pct: number
  barPct: number
  currentFmt: string
  targetFmt: string
  subCaption: string
}

export const assetGoals: AssetGoal[] = [
  {
    id: 'annual',
    name: '연간 · 총자산',
    current: totalAssetsNow,
    target: annualGoalTarget,
    color: 'var(--accent)',
    pct: annualPctReal,
    barPct: Math.min(100, annualPctReal),
    currentFmt: fmt(totalAssetsNow),
    targetFmt: fmt(annualGoalTarget),
    subCaption: 'D−186 · 월 3,000,000원 필요',
  },
  {
    id: 'monthly',
    name: '월간 · 필요 저축',
    current: monthlyGoalCurrent,
    target: monthlyGoalTarget,
    color: 'var(--accent)',
    pct: monthlyPctReal,
    barPct: Math.min(100, monthlyPctReal),
    currentFmt: fmt(monthlyGoalCurrent),
    targetFmt: fmt(monthlyGoalTarget),
    subCaption: '+240,000원 초과',
  },
]

export interface DashboardInstitution {
  tokenKey: string
  name: string
  amount: number
}

export const dashboardInstitutions: DashboardInstitution[] = [
  { tokenKey: 'mirae', name: '미래에셋증권', amount: 411210000 },
  { tokenKey: 'kakaobank', name: '카카오뱅크', amount: 175800000 },
  { tokenKey: 'shinhan', name: '신한은행', amount: 157080000 },
  { tokenKey: 'upbit', name: '업비트', amount: 141295000 },
]

export interface DonutLegendItem {
  label: string
  pct: number
  color: string
  showLegend: boolean
}

// 6 chart segments (23/22/19/18/11/7 = 100), but the rank-6 "7%" segment has no legend row in the
// source markup — ds_rules_v2_5.md §1-5 "receded value" (no legend dot for the lowest-rank slice).
export const assetCompositionSegments: DonutLegendItem[] = [
  { label: '연금·기타', pct: 23, color: 'var(--ramp-1)', showLegend: true },
  { label: '국내주식', pct: 22, color: 'var(--ramp-2)', showLegend: true },
  { label: '예적금', pct: 19, color: 'var(--ramp-3)', showLegend: true },
  { label: '해외주식', pct: 18, color: 'var(--ramp-4)', showLegend: true },
  { label: '가상자산', pct: 11, color: 'var(--ramp-5)', showLegend: true },
  { label: '', pct: 7, color: 'var(--ramp-6)', showLegend: false },
]
