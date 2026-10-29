import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { ShareCodeCheckResponse, ShareInvite, SharedAccountRequest, ShareStatusResponse } from './share.type'

// 공유 RPC(security definer)만 부른다 — 공유 테이블은 RLS 정책이 없어 직접 읽을 수 없다.
// 틀린 초대 코드는 서버가 시도 기록을 남겨야 해서 예외 대신 { error } 로 돌려준다 → 여기서 ApiError 로 바꾼다.

function throwIfCodeError<T extends object>(result: T | { error: string }): T {
  if ('error' in result) throw new ApiError(result.error, errorMessageOf(result.error), 400)
  return result
}

export async function getShareStatus() {
  return rpc<ShareStatusResponse>('get_share_status')
}

/** 새 초대 코드(10분). 이전 코드는 폐기된다. 연결 중이면 SHARE_ALREADY_LINKED. */
export async function issueShareCode() {
  return rpc<ShareInvite>('issue_share_code')
}

export async function cancelShareCode() {
  await rpc<void>('cancel_share_code')
}

/** 받은 코드 확인 → 초대한 사람 이름. 틀리면 SHARE_CODE_INVALID, 10분에 5번 틀리면 SHARE_CODE_LOCKED. */
export async function checkShareCode(code: string) {
  return throwIfCodeError(await rpc<ShareCodeCheckResponse | { error: string }>('check_share_code', { p_code: code }))
}

/** 수락하고 연결. 응답은 연결된 뒤의 공유 상태. */
export async function acceptShareCode(code: string) {
  return throwIfCodeError(await rpc<ShareStatusResponse | { error: string }>('accept_share_code', { p_code: code }))
}

export async function unlinkShare() {
  await rpc<void>('unlink_share')
}

/** 공유할 계좌 저장 — 목록 전체 교체. 이미 공유 중이던 계좌는 공유 시작일이 그대로다. */
export async function setSharedAccounts(items: SharedAccountRequest[]) {
  return rpc<ShareStatusResponse>('set_shared_accounts', { p_items: items })
}

/** 공유 화면 이름(내 설정, 1~8자). 빈 값은 null로 저장해 기본 '우리집'으로 돌아간다. */
export async function patchShareSpaceName(name: string) {
  const uid = await currentUserId()
  const trimmed = name.trim()
  unwrapResult(
    await supabase
      .from('user_settings')
      .update({ share_space_name: trimmed === '' ? null : trimmed })
      .eq('user_id', uid)
      .select('user_id'),
  )
}
