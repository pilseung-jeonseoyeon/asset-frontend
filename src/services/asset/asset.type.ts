import type { AssetClass } from '../common.type'

// 자산 분포/유동성 분석.

export interface DistributionAccount {
  accountId: number
  accountName: string
  valueKrw: number
}

export interface AssetClassGroup {
  assetClass: AssetClass
  /** 서버가 내려주는 한글 라벨. 대시보드 allocation에는 이 필드가 없다(비일관). */
  assetClassName: string
  totalValueKrw: number
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
  balance: number
}

export interface LockedAccount extends LiquidAccount {
  /**
   * lockedAccounts의 기준은 isLiquid=false이지 만기 유무가 아니다 — 만기 없는 계좌가 섞여
   * 나오고 그때 이 값은 null이다. null이면 D-Day 표시 자체를 생략할 것.
   */
  maturityDate: string | null
  /** 만기가 지나면 음수. maturityDate가 null이면 0이 오므로 "오늘 만기"로 읽으면 안 된다. */
  dDay: number
}

export interface AssetLiquidityResponse {
  liquidAccounts: LiquidAccount[]
  lockedAccounts: LockedAccount[]
}
