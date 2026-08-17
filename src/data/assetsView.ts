// View-model layer for the 자산(Assets) screen: adapts server responses (GET /assets/distribution,
// GET /assets/liquidity) into the shapes the screen/modals render. `buildMapTiers` below is the same
// merge/tier/ramp algorithm as the old src/data/mockAssets.ts `buildMapTiers` (5% "기타" merge, 15%/6%
// tier thresholds, ramp color order, top-3 white text) — that part is a design-system rule (ds_rules_v2_5
// §1-6) and is transcribed verbatim, not reinvented. What changed is the input: `pct` no longer comes
// from the payload (the server doesn't send it) — it's derived here from totalValueKrw / sum(...) with a
// divide-by-zero guard, and "performance" (perf/perfAmt) is dropped entirely because no API in this phase
// exposes a return figure per asset class.

import type { TreemapBlock } from '../components/primitives/Treemap/Treemap'
import { fmt } from '../utils/format'
import { isoDateToDisplay } from '../utils/date'
import { toPercentages } from './dashboardView'
import type { AccountResponse, AccountSnapshotResponse } from '@/services/account'
import type { AssetClassGroup, LockedAccount } from '@/services/asset'
import type { AccountType, AssetClass, Currency, InstitutionType } from '@/services/common.type'

// ---------- 계좌/기관 유형 ↔ 한글 라벨 ----------
// 서버 AccountType/InstitutionType은 영문 코드값만 내려준다(common.type.ts 주석 참고). 한글 라벨은
// 백엔드 확정값이 아니라 이 화면(AddAccountModal/EditAccountModal/InstitutionsModal)에서 붙이는
// 프론트 전용 표기이므로, 실제 서비스 오픈 전 백엔드와 라벨 문구를 맞춰야 한다.

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: '현금',
  CHECKING: '입출금',
  PARKING: '파킹통장',
  TERM_DEPOSIT: '정기예금',
  INSTALLMENT_SAVINGS: '적금',
  BROKERAGE: '증권계좌',
  CRYPTO_WALLET: '가상자산',
  PENSION: '연금',
  PENSION_SAVINGS: '연금저축',
  REAL_ASSET: '실물자산',
}

/** 칩 표시 순서 — 현금성 자산부터 투자/연금 순으로 사용자가 훑기 쉬운 순서. */
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'CASH',
  'CHECKING',
  'PARKING',
  'TERM_DEPOSIT',
  'INSTALLMENT_SAVINGS',
  'BROKERAGE',
  'CRYPTO_WALLET',
  'PENSION',
  'PENSION_SAVINGS',
  'REAL_ASSET',
]

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  BANK: '은행',
  BROKERAGE: '증권사',
  EXCHANGE: '거래소',
  PENSION: '연금',
  OTHER: '기타',
}

export const INSTITUTION_TYPE_ORDER: InstitutionType[] = ['BANK', 'BROKERAGE', 'EXCHANGE', 'PENSION', 'OTHER']

/**
 * 자산군(AssetClass) → 계좌 추가 시 기본 선택할 AccountType. 임의 추측이 아니라 백엔드
 * `AccountService.splitByClass`가 AccountType을 AssetClass로 묶는 규칙의 **역방향**이다(그 방향으로
 * 접힌 6종 중 어느 AccountType이 대표인지는 각 자산군에서 실제로 쓰이는 계좌 종류를 그대로 따랐다).
 * 어디까지나 칩의 기본 선택일 뿐이며 사용자가 다른 칩으로 바꿀 수 있다 — AssetCategoryModal이 "계좌
 * 추가"를 열 때 해당 자산군 칸의 기본값으로만 쓴다.
 *
 * 예적금(DEPOSIT)에는 정기예금·적금 둘 다 접히는데 대표는 제품 결정으로 '적금'이다(2026-08-17).
 * 서버 규칙만으로는 어느 쪽이 대표인지 정해지지 않으므로 임의로 바꾸지 말 것.
 */
export const ASSET_CLASS_ACCOUNT_TYPE_PRESET: Record<AssetClass, AccountType> = {
  CASH_PENSION: 'CASH',
  DEPOSIT: 'INSTALLMENT_SAVINGS',
  DOMESTIC_STOCK: 'BROKERAGE',
  FOREIGN_STOCK: 'BROKERAGE',
  CRYPTO: 'CRYPTO_WALLET',
  ETC: 'PENSION_SAVINGS',
}

/**
 * 자산군 칩을 고를 때 함께 반영할 계좌 폼 필드. AccountType은 위 프리셋을 그대로 쓰되, 국내주식/해외주식은
 * 둘 다 BROKERAGE라 AccountType만으로는 구분이 안 된다 — 서버가 증권계좌 예수금 통화로 국내/해외를 가르므로
 * (AddAccountModal.tsx 상단 주석 참고) 여기서 currency도 같이 정해준다. 나머지 4개 자산군은 currency를
 * 건드리지 않는다 — 이미 사용자가 골라둔 통화(예: 달러로 적어둔 가상자산)를 자산 유형 칩을 눌렀다고 조용히
 * 원화로 되돌리면 안 되기 때문이다.
 */
export function assetClassFormPreset(assetClass: AssetClass): { type: AccountType; currency?: Currency } {
  const type = ASSET_CLASS_ACCOUNT_TYPE_PRESET[assetClass]
  if (assetClass === 'FOREIGN_STOCK') return { type, currency: 'USD' }
  if (assetClass === 'DOMESTIC_STOCK') return { type, currency: 'KRW' }
  return { type }
}

/**
 * AccountType(+currency) → 자산군(칩) 역방향 판정. 백엔드 `AccountService.splitByClass`가 AccountType
 * 10종을 6개 자산군으로 접는 규칙을 그대로 옮긴 것 — 위 프리셋과 반대 방향이라 서로 다른 로직이 필요하다
 * (프리셋은 자산군 하나에 대표 AccountType 하나만 고르지만, 역방향은 10종 전부가 반드시 6개 중 하나로
 * 떨어져야 한다: 정기예금도 적금과 마찬가지로 예적금이고, 기존에 PARKING으로 저장된 계좌도 반드시 현금으로
 * 판정돼야 한다). BROKERAGE는 currency로 국내/해외를 가른다(USD가 아니면 국내주식).
 */
export function assetClassOfAccountType(type: AccountType, currency: Currency): AssetClass {
  switch (type) {
    case 'CHECKING':
    case 'PARKING':
    case 'CASH':
    case 'PENSION':
      return 'CASH_PENSION'
    case 'TERM_DEPOSIT':
    case 'INSTALLMENT_SAVINGS':
      return 'DEPOSIT'
    case 'BROKERAGE':
      return currency === 'USD' ? 'FOREIGN_STOCK' : 'DOMESTIC_STOCK'
    case 'CRYPTO_WALLET':
      return 'CRYPTO'
    case 'PENSION_SAVINGS':
    case 'REAL_ASSET':
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
// icon 값은 구 mockAssets.ts natureBlocks/assetCatsRaw에서 카테고리별로 옮긴 것이고, color는
// 모든 카테고리가 공유하던 'var(--accent)'를 그대로 유지한다(포인트 아이콘 배경 위 accent 색상 규칙).

interface AssetClassMeta {
  icon: string
  color: string
  label: string
}

export const ASSET_CLASS_META: Record<AssetClass, AssetClassMeta> = {
  CASH_PENSION: { icon: 'wallet', color: 'var(--accent)', label: '현금' },
  DEPOSIT: { icon: 'savings', color: 'var(--accent)', label: '예적금' },
  DOMESTIC_STOCK: { icon: 'trending_up', color: 'var(--accent)', label: '국내주식' },
  FOREIGN_STOCK: { icon: 'public', color: 'var(--accent)', label: '해외주식' },
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
 * 자산 카드 표시 순서(dc.html assetCatsRaw: 현금 → 예적금 → 국내주식 → 해외주식 → 가상자산 →
 * 연금·기타). `AssetClass` 유니언 선언 순서(common.type.ts)와는 다르므로 반드시 이 상수로 정렬해야
 * 한다 — 서버 응답 순서나 유니언 선언 순서를 그대로 쓰면 카드가 뒤섞인다.
 */
export const ASSET_CLASS_ORDER: AssetClass[] = [
  'CASH_PENSION',
  'DEPOSIT',
  'DOMESTIC_STOCK',
  'FOREIGN_STOCK',
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
        totalFmt: fmt(g.totalValueKrw),
        // 카테고리 내부 계좌는 금액 내림차순 — ①의 카테고리 순서 규칙과는 별개다.
        accounts: [...g.accounts]
          .sort((a, b) => b.valueKrw - a.valueKrw)
          .map((a) => ({
            accountId: a.accountId,
            name: a.accountName,
            inst: institutionNameOf(a.accountId, accounts),
            amt: a.valueKrw,
            amtFmt: fmt(a.valueKrw),
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

  const main = withPct.filter((b) => b.pct >= 5)
  const etcRaw = withPct.filter((b) => b.pct < 5)

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
      amtFmt: fmt(b.amt),
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
    liquidAmtFmt: fmt(liquidSum),
    lockedAmtFmt: fmt(lockedSum),
  }
}

/**
 * 즉시 현금화 가능 자산이 월 지출 기준 약 몇 개월치인지(원본 dc.html L1163). 월 지출이 0이거나
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
  // 그때 서버는 dDay를 0으로 내려주므로(API-SPEC §3.2) 걸러내지 않으면 그 계좌가 "가장 임박한 만기"
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

const TREND_VIEWBOX_TOP = 6
const TREND_VIEWBOX_BOTTOM = 40

/**
 * 계좌 스냅샷 → SVG path(`viewBox="0 0 100 44"`, x는 스냅샷 순서를 0~100에 균등 배치, y는 최소/최대
 * 값을 6~40에 매핑). 스냅샷이 0~1개면 선을 그릴 수 없으므로 null — 호출부는 그래프 영역 자체를 숨기거나
 * 빈 상태로 대체할 것(직선을 억지로 그리지 않는다).
 */
export function buildAccountTrendPath(snapshots: AccountSnapshotResponse[]): string | null {
  if (snapshots.length < 2) return null
  const sorted = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
  const values = sorted.map((s) => s.valueKrw)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  const points = sorted.map((s, i) => {
    const x = (i / (sorted.length - 1)) * 100
    const y =
      span === 0
        ? (TREND_VIEWBOX_TOP + TREND_VIEWBOX_BOTTOM) / 2
        : TREND_VIEWBOX_BOTTOM - ((s.valueKrw - min) / span) * (TREND_VIEWBOX_BOTTOM - TREND_VIEWBOX_TOP)
    return `${x.toFixed(1)} ${y.toFixed(1)}`
  })

  return `M${points[0]} L${points.slice(1).join(' L')}`
}
