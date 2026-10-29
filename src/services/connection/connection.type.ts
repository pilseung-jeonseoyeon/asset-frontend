// 증권사·거래소 API 키 연동(BYOK — Bring Your Own Key).
//
// 서비스가 기관과 계약하는 마이데이터 방식이 아니라, 사용자가 각 기관에서 본인 명의로 발급받은
// API 키를 등록하면 서버가 그 키로 기관 API를 대신 호출하는 구조다. 계약 요약은
// docs/superpowers/specs/2026-08-29-byok-connection-design.md 참고.
//
// 주의: 앱 시크릿은 DB 함수가 Vault 에 보관하고 응답에 절대 내려오지 않는다. 즉 등록 후에는 화면에서
// 시크릿을 다시 볼 방법이 없고 수정 API도 없다 — 바꾸려면 삭제 후 재등록이다.
// 동기화는 Edge Function `connections`(supabase/functions/connections) 가 기관 API 를 부르고 apply_connection_sync 로 반영한다.

/** 연동 가능한 기관. 4종. */
export type ConnectionProvider = 'UPBIT' | 'TOSS_INVEST' | 'KB_SECURITIES' | 'KIWOOM'

/**
 * 기관 표시명(스프링 Provider.description · DB private.provider_meta.label 과 같다). 동기화가 자동 생성하는 계좌·기관
 * 이름도 이 값이라 화면 표기와 데이터가 어긋나지 않는다. ConnectionRes.providerDescription 은 이 표에서 채운다.
 */
export const CONNECTION_PROVIDER_LABELS: Record<ConnectionProvider, string> = {
  UPBIT: '업비트',
  TOSS_INVEST: '토스증권',
  KB_SECURITIES: 'KB증권',
  KIWOOM: '키움증권',
}

export interface CreateConnectionRequest {
  provider: ConnectionProvider
  /** 기관에서 발급받은 앱 키(액세스 키). 최대 255자. */
  appKey: string
  /** 기관에서 발급받은 앱 시크릿. 최대 255자. */
  appSecret: string
  /**
   * 체결을 넣을 기존 계좌 id. 생략하면 첫 동기화 때 계좌를 자동 생성한다.
   * 현재 화면은 항상 생략한다 — 기존 계좌에 붙이는 흐름은 다음 단계 과제다.
   */
  accountId?: number
}

export interface ConnectionResponse {
  id: number
  provider: ConnectionProvider
  /** 기관 표시명(예: '업비트') — CONNECTION_PROVIDER_LABELS. 화면은 이 값을 쓴다. */
  providerDescription: string
  /** 마스킹된 앱 키(앞 4자 + * + 뒤 4자, account_connections_masked 뷰). 프론트에서 따로 마스킹하지 않는다. */
  appKey: string
  /** 연결된 계좌 id. 첫 동기화 전이면 null. */
  accountId: number | null
  /** 마지막 동기화 시각(ISO-8601). 아직 동기화하지 않았으면 null일 수 있다. */
  lastSyncedAt: string | null
  createdAt: string
}

export interface SyncResponse {
  accountId: number
  /** 이번 동기화에서 계좌를 자동 생성했는지 */
  accountCreated: boolean
  /** 기초 보유로 등록된 보유 종목 수. 계좌 자동 생성 때만 0보다 클 수 있다. */
  seeded: number
  /** 매매로 등록된 체결 건수 */
  imported: number
  /** 이미 등록돼 건너뛴 체결 건수 */
  skipped: number
  /** 검증에 걸려 거부된 체결 건수 */
  rejected: number
  /** 이번 동기화로 보유·체결이 생긴 종목 id — 시세 즉시 수집에 쓴다(스프링엔 없던 필드, 생략 가능). */
  stockIds?: number[]
}
