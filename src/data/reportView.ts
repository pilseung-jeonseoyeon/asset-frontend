// 월간 리포트 오버레이(ReportOverlay.tsx)의 뷰모델 — GET /dashboard/reports 응답을 화면이 그릴
// 형태로 바꾼다. 순수 함수만 둔다.
//
// 서버 계약(dashboard.type.ts 주석)의 핵심은 "비율은 모수가 0이면 0이 아니라 null"이라는 점이다.
// 그래서 여기서는 null을 절대 0으로 바꾸지 않고, 화면이 '—'와 사유 문구를 그릴 수 있게 그대로
// 넘긴다. 금액 숨김(amountsHidden) 처리는 여기서 하지 않는다 — 화면이 amountText 대신
// percentText를 고르는 식으로 표시만 바꾼다(값은 둘 다 만들어 둔다).

import { formatNumber } from '../utils/format'
import { assetClassMetaOf } from './assetsView'
import { RAMP_SCALE } from './ledgerView'
import type { MonthlyReportResponse } from '@/services/dashboard'
import type { YearMonth } from '@/services/common.type'

export type ChangeDirection = 'up' | 'down' | 'flat'

export function directionOf(n: number | null): ChangeDirection {
  if (n === null || n === 0) return 'flat'
  return n > 0 ? 'up' : 'down'
}

/** 증감액은 부호를 명시한다(히어로/딥카드 배지 규칙). 0이면 부호 없음. */
export function signedKrwText(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${formatNumber(Math.abs(n))}`
}

/**
 * 서버 증감률(%)을 '+2.3%' 꼴로. 스펙상 정수지만 소수가 와도 한 자리까지 그대로 보여준다
 * (반올림해서 0%로 뭉개면 "변화 없음"으로 오독된다). null이면 null — 모수가 0이라 계산 불가.
 */
export function signedPercentText(n: number | null, amountDirection: ChangeDirection = 'flat'): string | null {
  if (n === null) return null
  // 서버가 정수로 반올림하므로 +178,258원(0.1%)처럼 작은 변화는 percent가 0으로 온다. 금액은 늘었는데
  // "0%"라고 쓰면 변화 없음으로 읽히니, 금액 방향이 있으면 '1% 미만'으로 적는다.
  if (n === 0 && amountDirection !== 'flat') return '1% 미만'
  const abs = Math.abs(n)
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${body}%`
}

/** 저축률처럼 부호 없는 비율. */
export function plainPercentText(n: number | null, amountKrw = 0): string | null {
  if (n === null) return null
  // 지출 비중도 정수라 72,000원/3,300만 원처럼 작은 항목은 0%로 온다 — 금액이 있으면 '1% 미만'.
  if (n === 0 && amountKrw > 0) return '1% 미만'
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`
}

export interface ReportChangeView {
  direction: ChangeDirection
  amountText: string
  /** 모수가 0이라 계산 불가면 null — 화면은 '—'와 함께 사유를 적는다. */
  percentText: string | null
}

export interface ReportExpenseRow {
  name: string
  amountText: string
  /** 총지출 대비 비중(%) — 총지출 0이면 null */
  sharePercentText: string | null
  /** 1위를 100으로 둔 막대 길이(%). 1위가 0원이면 0. */
  barPercent: number
  rampColor: string
}

export interface MonthlyReportView {
  period: YearMonth
  /** '2026년 9월' */
  periodLabel: string
  totalChange: ReportChangeView
  /** 전년 동월 대비 증감률 텍스트. 전년 동월말 총자산이 0이면 null. */
  yoyPercentText: string | null
  yoyDirection: ChangeDirection
  /** 가장 많이 오른 자산군. 비교 가능한 자산군이 없으면 null. */
  topAssetClass: (ReportChangeView & { name: string; icon: string }) | null
  /** 가장 많이 오른 계좌. 비교할 계좌가 없으면 null. */
  topAccount: { name: string; amountText: string; direction: ChangeDirection } | null
  /** 지출 1위 대분류. 지출 기록이 없으면 null. */
  topExpense: { name: string; amountText: string; sharePercentText: string | null } | null
  expenseTop3: ReportExpenseRow[]
  savingsRateText: string | null
  savingsRateAvg6mText: string | null
  /** 0~100으로 클램프한 막대 길이. 계산 불가면 null. */
  savingsRateBar: number | null
  savingsRateAvg6mBar: number | null
}

function clampPercent(n: number | null): number | null {
  if (n === null) return null
  return Math.max(0, Math.min(100, n))
}

export function buildMonthlyReport(res: MonthlyReportResponse): MonthlyReportView {
  const top = res.topGainingAssetClass
  const maxExpense = res.expenseTop3.reduce((m, r) => Math.max(m, r.amountKrw), 0)
  // 서버가 "상위 3개"라고 했지만 순서를 보장한다는 말은 없다 — 금액 내림차순으로 정렬해 1위 막대가
  // 항상 가장 길게 나오도록 한다.
  const expenseTop3 = [...res.expenseTop3]
    .sort((a, b) => b.amountKrw - a.amountKrw)
    .slice(0, 3)
    .map((r, i) => ({
      name: r.categoryName,
      amountText: formatNumber(r.amountKrw),
      sharePercentText: plainPercentText(r.sharePercent, r.amountKrw),
      // 실제로 지출이 있는데 1위에 비해 너무 작아 막대가 0px이 되면 "없는 것"처럼 보인다 — 최소 2%는 남긴다.
      barPercent: maxExpense > 0 && r.amountKrw > 0 ? Math.max(2, Math.round((r.amountKrw / maxExpense) * 100)) : 0,
      rampColor: RAMP_SCALE[Math.min(i, RAMP_SCALE.length - 1)],
    }))

  return {
    period: { year: res.reportYear, month: res.reportMonth },
    periodLabel: `${res.reportYear}년 ${res.reportMonth}월`,
    totalChange: {
      direction: directionOf(res.totalAssetChangeKrw),
      amountText: signedKrwText(res.totalAssetChangeKrw),
      percentText: signedPercentText(res.totalAssetChangePercent, directionOf(res.totalAssetChangeKrw)),
    },
    yoyPercentText: signedPercentText(res.yoyChangePercent),
    yoyDirection: directionOf(res.yoyChangePercent),
    topAssetClass: top
      ? {
          name: top.assetClassName,
          icon: assetClassMetaOf(top.assetClass).icon,
          direction: directionOf(top.changeKrw),
          amountText: signedKrwText(top.changeKrw),
          percentText: signedPercentText(top.changePercent, directionOf(top.changeKrw)),
        }
      : null,
    topAccount:
      res.topGainingAccountName !== null && res.topGainingAmountKrw !== null
        ? {
            name: res.topGainingAccountName,
            amountText: signedKrwText(res.topGainingAmountKrw),
            direction: directionOf(res.topGainingAmountKrw),
          }
        : null,
    topExpense:
      res.topExpenseCategoryName !== null && res.topExpenseAmountKrw !== null
        ? {
            name: res.topExpenseCategoryName,
            amountText: formatNumber(res.topExpenseAmountKrw),
            // 1위의 비중은 expenseTop3에서 찾아 쓴다(응답에 따로 없다). 이름이 같은 항목이 둘 이상이면
            // 금액까지 같은 쪽을 우선한다 — 같은 대분류가 두 번 올 계약은 아니지만 엉뚱한 비중을 붙이지
            // 않기 위한 방어.
            sharePercentText: plainPercentText(
              (
                res.expenseTop3.find((r) => r.categoryName === res.topExpenseCategoryName && r.amountKrw === res.topExpenseAmountKrw) ??
                res.expenseTop3.find((r) => r.categoryName === res.topExpenseCategoryName)
              )?.sharePercent ?? null,
              res.topExpenseAmountKrw,
            ),
          }
        : null,
    expenseTop3,
    savingsRateText: plainPercentText(res.savingsRatePercent),
    savingsRateAvg6mText: plainPercentText(res.savingsRateAvg6m),
    savingsRateBar: clampPercent(res.savingsRatePercent),
    savingsRateAvg6mBar: clampPercent(res.savingsRateAvg6m),
  }
}

/**
 * 마지막 장(요약 카드)의 한 줄 문장. 서버가 '유형 라벨'을 주지 않으므로(분류 근거 없음) 라벨 대신
 * 실제 숫자로 문장을 만든다. 금액 숨김이면 비율만 쓰고, 비율이 없으면 그 절은 뺀다.
 */
export function buildSummarySentence(view: MonthlyReportView, hidden: boolean): string {
  const parts: string[] = []
  if (view.savingsRateText !== null) parts.push(`수입의 ${view.savingsRateText}를 저축했고`)
  const t = view.totalChange
  const verb = t.direction === 'up' ? '늘었어요' : t.direction === 'down' ? '줄었어요' : '그대로예요'
  if (t.percentText !== null) {
    parts.push(`자산은 ${t.percentText.replace(/^[+−]/, '')} ${verb}`)
  } else if (!hidden && t.direction !== 'flat') {
    parts.push(`자산은 ${t.amountText}원 ${verb}`)
  } else {
    parts.push(`자산은 ${verb}`)
  }
  return parts.join(', ').replace('저축했고, 자산은', '저축했고 자산은')
}
