// 자산 화면의 뷰모델 레이어 — 서버 응답(GET /assets/distribution, GET /assets/liquidity)을
// 화면·모달이 그릴 형태로 바꾼다.
//
// 아래 buildMapTiers의 병합/티어/램프 규칙(5% '기타' 병합, 15%/6% 티어 경계, 램프 색 순서,
// 상위 3개 흰 글자)은 디자인 시스템 규칙이다(ds_rules_v2_5 §1-6) — 임의로 바꾸지 말 것.
// `pct`는 서버가 주지 않아 여기서 totalValueKrw / 합계로 계산하며 0으로 나누는 경우를 막는다.
// 자산군별 수익률은 어떤 API도 주지 않으므로 다루지 않는다.

import type { TreemapBlock } from '../components/primitives/Treemap/Treemap'
import { formatNumber, formatCurrencyAmount } from '../utils/format'
import { isoDateToDisplay } from '../utils/date'
import { toPercentages } from './dashboardView'
import type { LedgerTxRow } from './ledgerView'
import type { TradeRowView } from './stocksView'
import type { AccountDetailResponse, AccountResponse } from '@/services/account'
import type { AssetClassGroup, LockedAccount } from '@/services/asset'
import type { AccountType, AssetClass, InstitutionType } from '@/services/common.type'

// ---------- 계좌/기관 유형 ↔ 한글 라벨 ----------
// 서버 AccountType/InstitutionType은 영문 코드값만 내려준다(common.type.ts 주석 참고). 한글 라벨은
// 백엔드 확정값이 아니라 이 화면(AddAccountModal/EditAccountModal/InstitutionsModal)에서 붙이는
// 프론트 전용 표기이므로, 실제 서비스 오픈 전 백엔드와 라벨 문구를 맞춰야 한다.

// AccountType이 자산군과 1:1로 통합되면서() 계좌 유형 라벨은 자산군 라벨과
// 같은 문구가 됐다(ASSET_CLASS_META 참고) — 두 목록이 갈라지지 않도록 라벨은 자산군 쪽을 정본으로
// 삼고 여기서는 그대로 가져다 쓴다.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: '현금',
  DEPOSIT: '예적금',
  STOCK: '주식',
  CRYPTO: '가상자산',
  PENSION_ETC: '연금·기타',
}

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  BANK: '은행',
  SAVINGS_BANK: '저축은행',
  BROKERAGE: '증권사',
  EXCHANGE: '거래소',
  PENSION: '연금',
  CARD: '카드사',
  LIFE_INSURANCE: '생명보험',
  NON_LIFE_INSURANCE: '손해보험',
  FINTECH: '핀테크',
  OTHER: '기타',
}

export const INSTITUTION_TYPE_ORDER: InstitutionType[] = [
  'BANK',
  'SAVINGS_BANK',
  'BROKERAGE',
  'EXCHANGE',
  'CARD',
  'LIFE_INSURANCE',
  'NON_LIFE_INSURANCE',
  'FINTECH',
  'PENSION',
  'OTHER',
]

/**
 * 자산군(AssetClass) → 계좌 유형(AccountType). **두 enum이 1:1로 대응**한다 — 여러 세부 타입이
 * 하나의 자산군으로 접히는 구조가 아니므로 "대표 타입을 고른다"는 개념도 "접힌 세부 타입"도 없다.
 * 이름만 ETC ↔ PENSION_ETC로 다르다.
 */
export const ASSET_CLASS_ACCOUNT_TYPE_PRESET: Record<AssetClass, AccountType> = {
  CASH: 'CASH',
  DEPOSIT: 'DEPOSIT',
  STOCK: 'STOCK',
  CRYPTO: 'CRYPTO',
  ETC: 'PENSION_ETC',
}

/**
 * 자산군 칩을 고를 때 함께 반영할 계좌 폼 필드 — 계좌 유형 하나뿐이다.
 *
 * **칩은 통화(currency)를 건드리지 않는다.** 증권계좌 하나가 원화 예수금과 달러 예수금을
 * **동시에** 갖고(initialBalanceKrw / initialBalanceUsd 두 필드로 따로 전송한다), 서버 계약상
 * currency는 금액 필드의 단위가 아니라 표기용이기 때문이다(AccountRes.currency 설명). 폼 기본값
 * (BLANK_ACCOUNT_FORM.currency === 'KRW')을 그대로 두므로, 사용자가 골라둔 통화를 칩을 눌렀다고
 * 조용히 되돌리는 일도 없다.
 */
export function assetClassFormPreset(assetClass: AssetClass): { type: AccountType } {
  return { type: ASSET_CLASS_ACCOUNT_TYPE_PRESET[assetClass] }
}

/**
 * AccountType → 자산군(칩) 역방향 판정. 위 프리셋의 정확한 역이다(1:1) — 서버가 계좌 유형 자체를
 * 자산군과 같은 5종으로 주므로 통화를 볼 필요가 없다.
 */
export function assetClassOfAccountType(type: AccountType): AssetClass {
  switch (type) {
    case 'CASH':
      return 'CASH'
    case 'DEPOSIT':
      return 'DEPOSIT'
    case 'STOCK':
      return 'STOCK'
    case 'CRYPTO':
      return 'CRYPTO'
    case 'PENSION_ETC':
      return 'ETC'
    default: {
      // 서버가 새 AccountType을 추가하고 프론트가 아직 그 값을 모르면 여기로 떨어진다(배포 시차 시 실제
      // 가능). 아래 never 대입은 유니언에 값이 늘어난 순간 빌드를 깨서 이 함수를 갱신하게 만들고, 런타임
      // 에는 ETC로 접어 칩이 하나도 선택되지 않는 상태(undefined)를 막는다 — assetClassMetaOf와 같은 톤.
      const unhandled: never = type
      void unhandled
      return 'ETC'
    }
  }
}

// ---------- 자산군(AssetClass) ↔ 아이콘/색 매핑 ----------
// 라벨은 서버 assetClassName을 쓰지 않고 항상 이 프론트 고정 표기를 쓴다 — 서버 한글 라벨이
// 제품 자산 분류 문구와 어긋나므로(docs/backend-requests.md #22) 화면 표기는 프론트가 소유한다.
// color는 모든 자산군이 'var(--accent)'를 공유한다(포인트 아이콘 배경 위 accent 색상 규칙).

interface AssetClassMeta {
  icon: string
  color: string
  label: string
}

export const ASSET_CLASS_META: Record<AssetClass, AssetClassMeta> = {
  CASH: { icon: 'wallet', color: 'var(--accent)', label: '현금' },
  DEPOSIT: { icon: 'savings', color: 'var(--accent)', label: '예적금' },
  // 아이콘은 합쳐지기 전 국내주식 것(trending_up)을 승계한다 — 해외주식이 쓰던 'public'(지구본)은
  // 국내 종목까지 담는 칸의 표기로는 어긋난다.
  STOCK: { icon: 'trending_up', color: 'var(--accent)', label: '주식' },
  CRYPTO: { icon: 'currency_bitcoin', color: 'var(--accent)', label: '가상자산' },
  ETC: { icon: 'account_balance', color: 'var(--accent)', label: '연금·기타' },
}

/**
 * 서버가 6종 밖의 새 AssetClass를 내려주면(런타임 스키마 검증 없음, 서버 enum 확장과 프론트 배포
 * 시차 시 실제 가능) `ASSET_CLASS_META[assetClass]`가 undefined가 되어 화면이 통째로 죽는다 —
 * 매핑에 없는 값은 라벨만 코드값 그대로 두고, icon/color는 ETC 항목으로 폴백한다.
 */
export function assetClassMetaOf(assetClass: AssetClass): AssetClassMeta {
  return ASSET_CLASS_META[assetClass] ?? { ...ASSET_CLASS_META.ETC, label: assetClass }
}

/**
 * 자산 카드 표시 순서(현금 → 예적금 → 주식 → 가상자산 → 연금·기타). `AssetClass` 유니언 선언
 * 순서(common.type.ts)와는 다르므로 반드시 이 상수로 정렬해야 한다 — 서버 응답 순서나 유니언 선언
 * 순서를 그대로 쓰면 카드가 뒤섞인다. 화면의 '부동산' 칸은 서버 자산군이 아니라 여기 없다
 * (Assets.tsx가 이 목록 뒤에 "준비 중" 카드를 따로 붙인다).
 */
export const ASSET_CLASS_ORDER: AssetClass[] = [
  'CASH',
  'DEPOSIT',
  'STOCK',
  'CRYPTO',
  'ETC',
]

/** 목록에 없는 값(서버가 새 AssetClass를 추가한 경우)은 버리지 않고 맨 뒤로 보낸다. */
function assetClassOrderIndex(assetClass: AssetClass): number {
  const idx = ASSET_CLASS_ORDER.indexOf(assetClass)
  return idx === -1 ? ASSET_CLASS_ORDER.length : idx
}

const RAMP = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)', 'var(--ramp-6)']

function assetClassLabel(g: AssetClassGroup): string {
  return assetClassMetaOf(g.assetClass).label
}

// ---------- 자산 구성 카테고리 카드 ----------

export interface AssetCatAccount {
  accountId: number
  name: string
  inst: string
  amt: number
  amtFmt: string
}

export interface AssetCat {
  id: AssetClass
  name: string
  icon: string
  color: string
  count: number
  totalFmt: string
  accounts: AssetCatAccount[]
}

/** accountId → institutionName 조인. 계좌를 못 찾으면 빈 문자열(가짜 값 금지). */
function institutionNameOf(accountId: number, accounts: AccountResponse[]): string {
  return accounts.find((a) => a.id === accountId)?.institutionName ?? ''
}

export function buildAssetCats(groups: AssetClassGroup[], accounts: AccountResponse[]): AssetCat[] {
  return [...groups]
    .sort((a, b) => assetClassOrderIndex(a.assetClass) - assetClassOrderIndex(b.assetClass))
    .map((g) => {
      const meta = assetClassMetaOf(g.assetClass)
      return {
        id: g.assetClass,
        name: assetClassLabel(g),
        icon: meta.icon,
        color: meta.color,
        count: g.accounts.length,
        totalFmt: formatNumber(g.totalValueKrw),
        // 카테고리 내부 계좌는 금액 내림차순 — ①의 카테고리 순서 규칙과는 별개다.
        accounts: [...g.accounts]
          .sort((a, b) => b.valueKrw - a.valueKrw)
          .map((a) => ({
            accountId: a.accountId,
            name: a.accountName,
            inst: institutionNameOf(a.accountId, accounts),
            amt: a.valueKrw,
            amtFmt: formatNumber(a.valueKrw),
          })),
      }
    })
}

// ---------- 자산 분포 트리맵 ----------

interface MapBlockSeed {
  id: string
  assetClass?: AssetClass
  label: string
  icon: string
  amt: number
  pct: number
  isEtc?: boolean
  subs?: string[]
}

export function buildMapTiers(
  groups: AssetClassGroup[],
  onOpen: (assetClass: AssetClass) => void,
): TreemapBlock[] {
  const total = groups.reduce((sum, g) => sum + g.totalValueKrw, 0)
  const withPct = groups.map((g) => ({
    assetClass: g.assetClass,
    label: assetClassLabel(g),
    icon: assetClassMetaOf(g.assetClass).icon,
    amt: g.totalValueKrw,
    // 서버가 pct를 내려주지 않아 여기서 계산한다. 전체 합이 0이면 0으로 나누기 방어.
    pct: total > 0 ? (g.totalValueKrw / total) * 100 : 0,
  }))

  // 서버는 6분류를 값이 0인 것까지 항상 내려준다(카드는 "0원 · 계좌 0개"를 보여줘야 하므로 그게 맞다).
  // 하지만 맵에서는 0원 블록이 그릴 넓이가 없어, '기타'로 묶이면 툴팁 목록만 의미 없이 길어진다
  // (실기에서 "국내주식·해외주식·예적금·연금·기타"가 전부 0원인 채로 나열됐다). 맵에서만 걷어낸다.
  const drawable = withPct.filter((b) => b.amt > 0)
  const small = drawable.filter((b) => b.pct < 5)
  // 5% 미만이 하나뿐이면 '기타'로 묶지 않는다 — 묶어봐야 한 항목짜리 익명 블록이 될 뿐이고,
  // 이름을 그대로 보여주는 편이 정확하다(묶음의 목적은 자잘한 여러 개를 합치는 것이다).
  const mergeSmall = small.length > 1
  const main = mergeSmall ? drawable.filter((b) => b.pct >= 5) : drawable
  const etcRaw = mergeSmall ? small : []

  const seeds: MapBlockSeed[] = main.map((b) => ({
    id: b.assetClass,
    assetClass: b.assetClass,
    label: b.label,
    icon: b.icon,
    amt: b.amt,
    pct: b.pct,
  }))
  if (etcRaw.length) {
    seeds.push({
      id: 'etc',
      label: '기타',
      icon: 'more_horiz',
      amt: etcRaw.reduce((sum, b) => sum + b.amt, 0),
      pct: etcRaw.reduce((sum, b) => sum + b.pct, 0),
      isEtc: true,
      subs: etcRaw.map((b) => b.label),
    })
  }

  seeds.sort((a, b) => b.pct - a.pct)

  return seeds.map((b, bi) => {
    const tier = b.pct >= 15 ? 'full' : b.pct >= 6 ? 'medium' : 'icon'
    return {
      id: b.id,
      label: b.label,
      icon: b.icon,
      amtFmt: formatNumber(b.amt),
      pct: Math.round(b.pct),
      widthPct: b.pct,
      tint: RAMP[Math.min(bi, RAMP.length - 1)],
      fg: bi < 3 ? '#FFFFFF' : 'var(--text-strong)',
      accent: 'var(--text-strong)',
      showHeader: tier !== 'icon',
      showIconOnly: tier === 'icon',
      cursor: b.isEtc ? 'default' : 'pointer',
      isEtc: b.isEtc,
      subs: b.subs,
      open: b.isEtc ? undefined : () => onOpen(b.assetClass as AssetClass),
    }
  })
}

// ---------- 유동성 뷰 ----------

export interface LiquidityView {
  liquidPct: number
  lockedPct: number
  /** 원 단위 그대로 — liquidityMonthsOfExpense 등 추가 계산이 필요한 호출부용. */
  liquidAmt: number
  liquidAmtFmt: string
  lockedAmtFmt: string
}

/**
 * 두 비율을 각각 `Math.round`하면 합이 99%/101%가 되어 막대에 틈/오버플로가 생긴다 —
 * dashboardView.ts의 도넛이 쓰는 최대잔여법(toPercentages)을 그대로 재사용해 합을 100으로 보정한다.
 */
export function buildLiquidityView(liquidAccounts: { balance: number }[], lockedAccounts: { balance: number }[]): LiquidityView {
  const liquidSum = liquidAccounts.reduce((sum, a) => sum + a.balance, 0)
  const lockedSum = lockedAccounts.reduce((sum, a) => sum + a.balance, 0)
  const [liquidPct, lockedPct] = toPercentages([liquidSum, lockedSum])
  return {
    liquidPct,
    lockedPct,
    liquidAmt: liquidSum,
    liquidAmtFmt: formatNumber(liquidSum),
    lockedAmtFmt: formatNumber(lockedSum),
  }
}

/**
 * 즉시 현금화 가능 자산이 월 지출 기준 약 몇 개월치인지. 월 지출이 0이거나
 * 아직 모르면(조회 실패·로딩) null — 호출부는 캡션의 이 절반을 렌더하지 말 것.
 */
export function liquidityMonthsOfExpense(liquidAmt: number, monthlyExpense: number | null): number | null {
  if (!monthlyExpense || monthlyExpense <= 0) return null
  return Math.round(liquidAmt / monthlyExpense)
}

/**
 * 캡션에 보여줄 "가장 신경 써야 할" 락업 계좌 하나를 고른다: 아직 만기가 남은 계좌 중 가장 임박한 것을
 * 우선하고, 전부 만기가 지났으면 그중 가장 최근에 지난 것을 보여준다. dDay < 0이면 "만기 경과"로 렌더할 것.
 */
export function pickNearestMaturity(lockedAccounts: LockedAccount[]): LockedAccount | null {
  // lockedAccounts의 기준은 isLiquid=false이지 만기 유무가 아니라, 만기가 없는 계좌도 섞여 온다.
  // 그때 서버는 dDay를 0으로 내려주므로 걸러내지 않으면 그 계좌가 "가장 임박한 만기"
  // 1순위로 뽑혀 "만기까지 D−0"이라는 없는 사실을 표시하게 된다.
  const withMaturity = lockedAccounts.filter((a) => a.maturityDate !== null)
  if (withMaturity.length === 0) return null
  const upcoming = withMaturity.filter((a) => a.dDay >= 0).sort((a, b) => a.dDay - b.dDay)
  if (upcoming.length > 0) return upcoming[0]
  return [...withMaturity].sort((a, b) => b.dDay - a.dDay)[0]
}

// ---------- 계좌 상세 모달 ----------

export interface AccountDetailHeader {
  name: string
  /** "기관명 · 계좌종류[ · 통화]" — 값이 없는 조각은 건너뛴다. */
  subtitle: string
  /** '만기 2026.12.14' 형태. 만기일이 없으면 null. */
  maturityLabel: string | null
}

export function buildAccountDetailHeader(account: AccountResponse): AccountDetailHeader {
  const parts = [account.institutionName, ACCOUNT_TYPE_LABELS[account.type]]
  if (account.currency !== 'KRW') parts.push(account.currency)
  return {
    name: account.name,
    subtitle: parts.filter((p): p is string => !!p).join(' · '),
    maturityLabel: account.maturityDate ? `만기 ${isoDateToDisplay(account.maturityDate)}` : null,
  }
}

/**
 * 1억 원 이상 금액을 카드 대표 금액 아래 캡션으로 축약한다(ds_rules_v2_5 §4-2, 만 원 단위 반올림).
 * 1억 미만이면 null — 호출부는 이 값이 있을 때만 캡션을 렌더한다.
 */
export function formatBigAmountCaption(n: number): string | null {
  if (n < 100_000_000) return null
  // 억과 만을 따로 계산하면 만 단위 반올림이 10,000이 될 때 억으로 올라가지 못한다
  // (199,999,999 → "1억 10,000만 원"). 만 원 단위로 먼저 반올림한 뒤 억/만으로 쪼갠다.
  const manTotal = Math.round(n / 10_000)
  const eok = Math.floor(manTotal / 10_000)
  const man = manTotal % 10_000
  return man === 0 ? `약 ${eok}억 원` : `약 ${eok}억 ${man.toLocaleString('ko-KR')}만 원`
}


// ---------- 계좌 상세: 대표 금액과 그 구성(원화 예수금 · 달러 예수금 · 보유 종목) ----------
//
// 사용자 요청 — "주식 계좌 볼 때 달러 예수금, 원화 예수금 총 원화로 보이게".
//
// 대표 금액은 balanceKrw(예수금만)가 아니라 **totalValueKrw**(예수금 + 보유 종목 평가액)다. 주식
// 계좌에서 balanceKrw만 보여주면 종목 평가액이 통째로 빠져 실제보다 작게 보인다.
//
// 구성 줄은 **쪼갤 것이 있을 때만** 만든다. 원화 예수금밖에 없는 현금·예적금 계좌에서는 총액과
// 구성 줄이 같은 숫자를 두 번 보여주게 되므로 아예 그리지 않는다.
//
// 달러의 원화 환산액은 서버가 준 cashUsdKrw를 그대로 쓴다 — cashUsd × usdKrwRate로 다시 계산하면
// 서버 반올림과 어긋나 구성 줄의 합이 총액과 1원씩 안 맞을 수 있다(환율은 프론트가 다루지 않는다는
// 계약이기도 하다). usdKrwRate는 "어떤 환율로 환산했는지" 알려주는 표기용으로만 쓴다.

export interface AccountBalanceRow {
  label: string
  /** 통화 기호·단위까지 붙인 표시 문자열 — 호출부가 '원'이나 '$'를 덧붙이지 않는다. */
  valueText: string
  /** 달러 줄의 원화 환산액 같은 보조 표기. 없으면 null. */
  note: string | null
}

export interface AccountBalanceView {
  /** 대표 금액에 붙일 라벨. 쪼갤 것이 없으면 '현재 잔액', 있으면 '총 평가액'(아래 함수 주석 참고). */
  totalLabel: string
  /** 대표 금액(총 평가액). formatNumber와 같은 규칙으로 통화 기호를 포함하지 않는다 — '원'은 호출부 JSX가 붙인다. */
  totalText: string
  /** 1억 원 이상일 때만 붙는 축약 캡션(형식은 formatBigAmountCaption). */
  totalCaption: string | null
  /** 총액을 무엇으로 쪼갠 것인지 보여주는 줄들. 쪼갤 것이 없으면 빈 배열. */
  rows: AccountBalanceRow[]
  /** 달러 예수금이 있을 때만: 환산에 쓴 환율 안내. */
  rateNote: string | null
}

export function buildAccountBalanceView(detail: AccountDetailResponse): AccountBalanceView {
  const { account, holdingValueKrw, totalValueKrw } = detail
  // 0달러는 "달러 예수금 없음"과 같게 취급한다 — "$0.00" 한 줄은 정보가 아니라 잡음이다.
  const usdCash = account.cashUsd ?? 0
  const hasUsdCash = usdCash !== 0
  const hasHoldings = holdingValueKrw > 0

  const rows: AccountBalanceRow[] = []
  if (hasUsdCash || hasHoldings) {
    rows.push({ label: '원화 예수금', valueText: `${formatNumber(account.cashKrw)}원`, note: null })
    if (hasUsdCash) {
      rows.push({
        label: '달러 예수금',
        valueText: `$${formatCurrencyAmount(usdCash, 'USD')}`,
        note: account.cashUsdKrw != null ? `${formatNumber(account.cashUsdKrw)}원` : null,
      })
    }
    if (hasHoldings) {
      rows.push({ label: '보유 종목', valueText: `${formatNumber(holdingValueKrw)}원`, note: null })
    }
  }

  return {
    // 지갑·통장처럼 예수금 한 덩어리뿐인 계좌에서 "총 평가액"은 과한 말이다(합칠 것이 없으니 그냥
    // 잔액이다). 쪼갠 줄이 있을 때만 "총 평가액"이라고 부른다.
    totalLabel: rows.length > 0 ? '총 평가액' : '현재 잔액',
    totalText: formatNumber(totalValueKrw),
    totalCaption: formatBigAmountCaption(totalValueKrw),
    rows,
    // 환율은 소수점 둘째 자리까지 쓴다 — formatCurrencyAmount의 USD 분기가 정확히 그 형식이라
    // 같은 규칙을 두 번 적지 않도록 그대로 빌려 쓴다(값 자체는 달러가 아니라 '달러당 원'이다).
    rateNote:
      hasUsdCash && account.usdKrwRate != null
        ? `1달러 = ${formatCurrencyAmount(account.usdKrwRate, 'USD')}원 기준`
        : null,
  }
}


// ---------- 계좌 상세: 가계부 거래 + 매매 합친 활동 목록 ----------
//
// 계좌 상세 모달의 "최근 거래내역"은 두 서버 리소스를 합친 것이다(사용자 요청 —
// "주식 매수 매도 한거 보여줄 수 있나"): GET /transactions(가계부 거래)와 GET /trades(매매).
// 서버에 둘을 함께 주는 API는 없고, 매매는 가계부 거래를 만들지도 않는다(등록 직후 계좌 잔액이
// 예수금 그대로인 것으로 확인) — 그래서 같은 건이 두 번 뜰 일은 없고, 프론트가 날짜로 병합한다.
//
// 이 함수가 ledgerView도 stocksView도 아닌 여기 있는 이유: 두 뷰 레이어가 서로를 import하면
// (가계부 ↔ 주식) 순환이 생긴다. 병합은 이 모달을 소유한 자산 화면의 관심사다.
//
// 합치는 쪽이 두 목록의 정렬을 다시 하지 않는다는 점이 중요하다 — 각 목록은 이미 자기 규칙으로
// 최신순이고(가계부는 서버 sort=transactionDate,desc + id,desc / 매매는 buildTradeRows), 여기서는
// **날짜만** 비교한다. Array.prototype.sort가 안정 정렬이라 같은 날짜 안의 순서는 원본 그대로
// 유지된다(가계부 → 매매 순).

export interface AccountActivityRow {
  key: string
  isoDate: string
  dateLabel: string
  desc: string
  tag: string
  /** 통화 기호·단위까지 이미 붙은 최종 표기('700,000원' / '$1,101.75'). 호출부가 '원'을 덧붙이지 말 것 —
   * 해외 종목 매매는 달러라 '원'을 붙이면 틀린 금액이 된다. */
  amountText: string
  amountColor: string
}

/**
 * 매매 금액은 무채색이다 — 투자 거래는 수입/지출이 아니라 이체로 취급한다(ds_rules_v2_5 §10-4,
 * buildTradeRows 주석과 같은 규칙).
 */
const TRADE_AMOUNT_COLOR = 'var(--text-strong)'

export function buildAccountActivity(
  txRows: LedgerTxRow[],
  tradeRows: TradeRowView[],
  limit: number,
): AccountActivityRow[] {
  const fromTx: AccountActivityRow[] = txRows.map((t) => ({
    // key에 접두사를 붙인다 — 거래 id와 매매 id는 서로 다른 테이블이라 값이 겹칠 수 있고,
    // 겹치면 React가 두 줄을 같은 항목으로 보고 한 줄만 그린다.
    key: `tx-${t.id}`,
    isoDate: t.isoDate,
    dateLabel: t.dateLabel,
    desc: t.desc,
    tag: t.tag,
    amountText: `${t.amount}원`,
    amountColor: t.amountColor,
  }))
  const fromTrade: AccountActivityRow[] = tradeRows.map((t) => ({
    key: `trade-${t.id}`,
    isoDate: t.isoDate,
    dateLabel: t.dateLabel,
    desc: t.stockName,
    tag: t.tag,
    amountText: t.amountFmt,
    amountColor: TRADE_AMOUNT_COLOR,
  }))
  return [...fromTx, ...fromTrade]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, limit)
}

