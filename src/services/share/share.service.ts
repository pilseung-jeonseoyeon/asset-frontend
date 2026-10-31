import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { ShareCodeCheckResponse, ShareInvitationsResponse, ShareInvite, SharedAccountRequest, ShareStatusResponse } from './share.type'

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

/** 초대 거절 → 초대한 사람에게 SHARE_DECLINED 알림. 코드는 만료까지 남는다(마음이 바뀌면 다시 수락). 틀린 코드는 SHARE_CODE_INVALID. */
export async function declineShareCode(code: string) {
  throwIfCodeError(await rpc<Record<string, never> | { error: string }>('decline_share_code', { p_code: code }))
}

/** 이메일 초대 목록(받은 · 보낸). */
export async function getShareInvitations() {
  return rpc<ShareInvitationsResponse>('get_share_invitations')
}

/**
 * 이메일로 초대 보내기(7일). 가입 여부가 드러나지 않게 결과는 늘 같은 목록이다 — 가입 · 미연결인 사람에게만 알림이 간다.
 * 내 이메일 SHARE_INVITE_SELF, 형식 오류 INVALID_INPUT, 10분에 새 초대 5건 초과 SHARE_INVITE_LIMIT, 연결 중 SHARE_ALREADY_LINKED.
 */
export async function sendShareInvite(email: string) {
  return rpc<ShareInvitationsResponse>('send_share_invite', { p_email: email })
}

/** 보낸 초대 취소(받는 사람의 초대 알림도 지워진다). */
export async function cancelShareInvite(invitationId: number) {
  return rpc<ShareInvitationsResponse>('cancel_share_invite', { p_id: invitationId })
}

/** 받은 초대에 답하기 → 공유 상태. 만료 · 취소됨 SHARE_INVITE_NOT_FOUND. 거절하면 초대한 사람에게 SHARE_DECLINED 알림. */
export async function respondShareInvite(invitationId: number, accept: boolean) {
  return rpc<ShareStatusResponse>('respond_share_invite', { p_id: invitationId, p_accept: accept })
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
