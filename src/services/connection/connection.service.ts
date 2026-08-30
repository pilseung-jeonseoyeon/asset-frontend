import { api, unwrap } from '../api'
import type { ApiResponse } from '../api.types'
import type {
  ConnectionResponse,
  CreateConnectionRequest,
  SyncResponse,
} from './connection.type'

/** 등록한 연동 목록. 앱 키는 서버가 마스킹해 내려준다. */
export async function getConnections() {
  return unwrap(await api.get<ApiResponse<ConnectionResponse[]>>('/connections'))
}

/** 연동 등록. 앱 시크릿은 서버가 암호화해 저장하며 응답에 실리지 않는다. */
export async function postConnection(body: CreateConnectionRequest) {
  return unwrap(await api.post<ApiResponse<ConnectionResponse>>('/connections', body))
}

/**
 * 동기화 실행. 첫 실행은 계좌를 자동 생성하고 기준 시각만 잡으며, 이후 실행부터 그 시각 이후의
 * 체결을 매매 내역으로 추가한다. 기존 데이터는 수정하지 않는다(추가만).
 *
 * 기관 API를 실제로 호출하는 요청이라 api.ts의 기본 timeout(10초)보다 오래 걸릴 수 있어
 * 이 호출에만 30초를 준다.
 */
export async function postConnectionSync(connectionId: number) {
  return unwrap(
    await api.post<ApiResponse<SyncResponse>>(`/connections/${connectionId}/syncs`, undefined, {
      timeout: 30000,
    }),
  )
}

/** 연동 삭제. 동기화로 이미 만들어진 계좌·매매 내역은 남는다(204라 unwrap을 쓰지 않는다). */
export async function deleteConnection(connectionId: number) {
  await api.delete(`/connections/${connectionId}`)
}
