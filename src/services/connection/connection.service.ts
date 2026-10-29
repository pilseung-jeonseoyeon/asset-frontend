import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { refreshPricesFor } from '../priceRefresh'
import { invoke, rpc, supabase, unwrapResult } from '../supabase'
import { CONNECTION_PROVIDER_LABELS } from './connection.type'
import type { ConnectionProvider, ConnectionResponse, CreateConnectionRequest, SyncResponse } from './connection.type'

// 목록은 마스킹 뷰(account_connections_masked), 등록·해제는 2단계 RPC(시크릿은 Vault 에만), 동기화는 Edge Function `connections`
// (기관 API 호출 + apply_connection_sync). 앱 시크릿은 어디에도 다시 내려오지 않는다.

/** account_connections_masked 뷰 한 줄 */
interface MaskedRow {
  id: number
  provider: ConnectionProvider
  app_key_masked: string
  account_id: number | null
  last_synced_at: string | null
  created_at: string
}

/** create_connection 이 돌려주는 account_connections 행(쓰는 열만) */
interface ConnectionRow {
  id: number
  provider: ConnectionProvider
  app_key: string
  account_id: number | null
  last_synced_at: string | null
  created_at: string
}

function toConnectionResponse(row: MaskedRow): ConnectionResponse {
  return {
    id: row.id,
    provider: row.provider,
    providerDescription: CONNECTION_PROVIDER_LABELS[row.provider],
    appKey: row.app_key_masked,
    accountId: row.account_id,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  }
}

/** 뷰와 같은 마스킹(앞 4 + * + 뒤 4). 등록 직후 응답에 쓴다 — 목록을 다시 읽지 않아도 같은 모양이 되도록. */
function maskAppKey(appKey: string): string {
  return appKey.slice(0, 4) + '*'.repeat(Math.max(appKey.length - 8, 0)) + appKey.slice(Math.max(appKey.length - 4, 0))
}

/** 등록한 연동 목록(최근 등록 순). 앱 키는 뷰가 마스킹해 내려준다. */
export async function getConnections(): Promise<ConnectionResponse[]> {
  const rows =
    unwrapResult(
      await supabase
        .from('account_connections_masked')
        .select('id, provider, app_key_masked, account_id, last_synced_at, created_at')
        .order('created_at', { ascending: false })
        .returns<MaskedRow[]>(),
    ) ?? []
  return rows.map(toConnectionResponse)
}

/** 연동 등록. 시크릿은 DB 함수가 Vault 에 넣고 테이블엔 id 만 남는다. 같은 키를 또 등록하면 CONNECTION_DUPLICATE. */
export async function postConnection(body: CreateConnectionRequest): Promise<ConnectionResponse> {
  let row: ConnectionRow
  try {
    row = await rpc<ConnectionRow>('create_connection', {
      p_provider: body.provider,
      p_app_key: body.appKey,
      p_app_secret: body.appSecret,
      p_account_id: body.accountId ?? null,
    })
  } catch (e) {
    // unique(user_id, provider, app_key) 위반은 SQLSTATE 23505 → 공용 DUPLICATE 로 오므로 스프링 코드로 바꾼다
    if (e instanceof ApiError && e.code === 'DUPLICATE') throw new ApiError('CONNECTION_DUPLICATE', errorMessageOf('CONNECTION_DUPLICATE'), 409)
    throw e
  }
  return toConnectionResponse({
    id: row.id,
    provider: row.provider,
    app_key_masked: maskAppKey(row.app_key),
    account_id: row.account_id,
    last_synced_at: row.last_synced_at,
    created_at: row.created_at,
  })
}

/**
 * 동기화 실행. 첫 실행은 계좌를 자동 생성하고 기준 시각만 잡으며, 이후 실행부터 그 시각 이후의
 * 체결을 매매 내역으로 추가한다. 기존 데이터는 수정하지 않는다(추가만).
 * 기관 API 를 실제로 부르는 요청이라 함수 쪽에서 25초 넘으면 CONNECTION_TIMEOUT 으로 끊는다.
 * 끝나면 이번에 생긴 보유·체결 종목의 시세를 바로 받아온다(배치 전까지 평가액이 비지 않게).
 */
export async function postConnectionSync(connectionId: number): Promise<SyncResponse> {
  const result = await invoke<SyncResponse>('connections', { body: { action: 'sync', connectionId } })
  void refreshPricesFor(result.stockIds ?? [])
  return result
}

/** 연동 해제. 행과 Vault 시크릿을 함께 지운다. 동기화로 이미 만들어진 계좌·매매 내역은 남는다. */
export async function deleteConnection(connectionId: number): Promise<void> {
  await rpc<null>('delete_connection', { p_id: connectionId })
}
