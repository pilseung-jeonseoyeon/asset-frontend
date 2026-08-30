// 증권사·거래소 API 키 연동(BYOK — Bring Your Own Key).
//
// 서비스가 기관과 계약하는 마이데이터 방식이 아니라, 사용자가 각 기관에서 본인 명의로 발급받은
// API 키를 등록하면 서버가 그 키로 기관 API를 대신 호출하는 구조다. 계약 요약은
// docs/superpowers/specs/2026-08-29-byok-connection-design.md 참고.
//
// 주의: 앱 시크릿은 서버가 암호화해 보관하고 응답에 절대 내려오지 않는다. 즉 등록 후에는 화면에서
// 시크릿을 다시 볼 방법이 없고 수정 API도 없다 — 바꾸려면 삭제 후 재등록이다.

/** 연동 가능한 기관. 라이브 OpenAPI 기준 4종. */
export type ConnectionProvider = 'UPBIT' | 'TOSS_INVEST' | 'KB_SECURITIES' | 'KIWOOM'

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
  /** 기관 표시명(예: '업비트'). 화면에 찍는 이름은 프론트 상수가 아니라 이 값을 우선한다. */
  providerDescription: string
  /** 서버가 마스킹해 내려준 앱 키(예: 'acce****'). 프론트에서 따로 마스킹하지 않는다. */
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
  /** 매매로 등록된 체결 건수 */
  imported: number
  /** 이미 등록돼 건너뛴 체결 건수 */
  skipped: number
  /** 검증에 걸려 거부된 체결 건수 */
  rejected: number
}
