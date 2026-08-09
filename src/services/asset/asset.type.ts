import type { AssetClass } from '../common.type'

// API-SPEC §3. 자산 분포/유동성 분석.

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
  institutionId: number
  institutionName: string
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
  maturityDate: string
  /** 만기가 지나면 음수가 된다 — dDay < 0이면 "만기 경과"로 분기할 것. */
  dDay: number
}

export interface AssetLiquidityResponse {
  liquidAccounts: LiquidAccount[]
  lockedAccounts: LockedAccount[]
}
