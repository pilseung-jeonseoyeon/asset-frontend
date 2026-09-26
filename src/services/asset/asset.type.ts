import type { AssetClass } from '../common.type'

// 자산 분포/유동성 분석.

export interface DistributionAccount {
  accountId: number
  accountName: string
  /** 금융기관명 — 현금처럼 기관이 없는 계좌는 null. 이 값이 있어 자산 화면은 GET /accounts를 부르지 않는다. */
  institutionName: string | null
  valueKrw: number
  /**
   * 이 금액의 성격(예: 증권 계좌의 'CASH_AND_HOLDING' = 예수금 + 보유 종목). 값이 늘어날 수 있어
   * 모르는 코드면 kindName을 그대로 표시한다. 기관별(byInstitution) 목록에는 오지 않을 수 있다.
   */
  kind?: string
  kindName?: string
}

export interface AssetClassGroup {
  assetClass: AssetClass
  /** 서버가 내려주는 한글 라벨. 대시보드 allocation에는 이 필드가 없다(비일관). */
  assetClassName: string
  totalValueKrw: number
  /** 전체 대비 비율(%) — 최대잔여법으로 합이 정확히 100이 되게 맞춘 서버 값이 정본. 총자산이 0이면 null. */
  sharePercent: number | null
  /** 지난달 대비 증감(원) — 이 자산군에 계좌가 없으면 null. */
  changeFromLastMonthKrw: number | null
  /** 지난달 대비 증감률(%) — 기준값이 0이면 null. */
  changeFromLastMonthPercent: number | null
  accounts: DistributionAccount[]
}

export interface AssetInstitutionGroup {
  /**
   * 기관에 연결되지 않은 계좌(현금 등)를 모은 버킷이 섞여 나오고, 그 버킷은 id·name이 둘 다
   * null이다. 리스트 key나 라우팅 파라미터로 그대로 쓰면 깨지므로 "미지정"으로 따로 처리할 것.
   */
  institutionId: number | null
  institutionName: string | null
  totalValueKrw: number
  /** 전체 대비 비율(%) — 서버 정본(합 100). 총자산이 0이면 null. */
  sharePercent: number | null
  accounts: DistributionAccount[]
}

/** groupBy로 요청한 축만 채워지고 반대편은 null이다. */
export interface AssetDistributionResponse {
  byClass: AssetClassGroup[] | null
  byInstitution: AssetInstitutionGroup[] | null
}

export interface LiquidAccount {
  accountId: number
  name: string
  /** 계좌 총 평가액(원) = 예수금 + 보유 종목 평가액. 계좌 상세(GET /accounts/{id})의 totalValueKrw와
   * 같은 값이다(2026-09-26 계약 변경 — 예전 이름은 balance). */
  totalValueKrw: number
}

export interface LockedAccount extends LiquidAccount {
  /**
   * lockedAccounts의 기준은 isLiquid=false이지 만기 유무가 아니다 — 만기 없는 계좌가 섞여
   * 나오고 그때 이 값은 null이다. null이면 D-Day 표시 자체를 생략할 것.
   */
  maturityDate: string | null
  /** 만기까지 남은 일수 — 만기가 지나면 음수, 0은 '오늘 만기'. **만기일이 없으면 null**이다
   * (2026-09-26 계약 변경 — 예전에는 0이 와서 '오늘 만기'와 구분되지 않았다). */
  dDay: number | null
}

export interface AssetLiquidityResponse {
  liquidAccounts: LiquidAccount[]
  lockedAccounts: LockedAccount[]
}
