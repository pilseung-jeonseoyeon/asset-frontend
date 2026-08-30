// 설정 → 데이터 관리 및 백업의 "증권사·거래소 연동" 행. DataModal 안에서 인라인 아코디언으로
// 펼쳐진다(엑셀 가져오기 행과 같은 패턴).
//
// 설계: docs/superpowers/specs/2026-08-29-byok-connection-design.md
//
// 이 화면은 있으면 좋은 게 아니라 **없으면 안 되는** 화면이다: 연동 등록은 계좌 추가 모달에서
// 하지만, 한 번 등록한 API 키를 지우는 수단이 여기밖에 없다. 삭제 API가 있는데 진입점이 없으면
// 사용자는 키를 영영 회수할 수 없다.
//
// 새 연동 등록은 여기서 하지 않는다 — 등록의 결과물이 "계좌"라서 계좌 추가 흐름에 있어야 개념이
// 맞고(설계 문서 §4), 등록 진입점이 두 곳이면 어느 쪽이 정본인지 흐려진다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { formatNotificationTime } from '../../../utils/notificationTime'
import {
  CONNECTION_GUIDE_URL,
  describeConnectionError,
  describeSync,
  tradeNounFor,
} from '../../../data/connectionView'
import { ApiError } from '@/services/api'
import { useDeleteConnection, useGetConnections, usePostConnectionSync } from '@/services/connection'
import type { ConnectionProvider } from '@/services/connection'

/** 서버 실패를 화면 문구로. ConnectAccountView와 같은 규칙을 쓴다. */
function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeConnectionError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

const ROW_BASE_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, textAlign: 'left',
}
const ACTION_ROW_BTN_STYLE: CSSProperties = {
  ...ROW_BASE_STYLE,
  width: '100%',
  border: '0.5px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'inherit',
  cursor: 'pointer',
}
const ICON_SQUARE_STYLE: CSSProperties = {
  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
}
const PANEL_STYLE: CSSProperties = {
  marginTop: 8, padding: 14, borderRadius: 10, background: 'var(--fill-subtle)',
  display: 'flex', flexDirection: 'column', gap: 10,
}
const HINT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }
const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
const SMALL_BTN_STYLE: CSSProperties = {
  border: '0.5px solid var(--border)', background: 'var(--surface)', borderRadius: 8,
  padding: '8px 12px', minHeight: 36, fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)',
  cursor: 'pointer', fontFamily: 'inherit', flex: 'none',
}

/** 행마다 남기는 마지막 동작 결과. 한 번에 한 줄만 조작하므로 id 하나로 충분하다. */
interface RowNote {
  connectionId: number
  text: string
  isError: boolean
}

export function ConnectionsSection() {
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [note, setNote] = useState<RowNote | null>(null)

  // 펼쳤을 때만 조회한다 — 설정 모달을 열기만 해도 연동 목록을 불러올 이유가 없다.
  const connectionsQuery = useGetConnections({ enabled: open })
  const postSync = usePostConnectionSync()
  const deleteConnection = useDeleteConnection()

  const connections = connectionsQuery.connections
  const busyId = postSync.isPending ? postSync.variables : deleteConnection.isPending ? deleteConnection.variables : null

  const runSync = (connectionId: number, provider: ConnectionProvider) => {
    setNote(null)
    setConfirmDeleteId(null)
    postSync.mutate(connectionId, {
      onSuccess: (result) => {
        const summary = describeSync(result, tradeNounFor(provider))
        setNote({
          connectionId,
          text: summary.detail ? `${summary.headline} ${summary.detail}` : summary.headline,
          isError: false,
        })
      },
      onError: (e) => setNote({ connectionId, text: messageOf(e, '가져오기에 실패했어요.'), isError: true }),
    })
  }

  const runDelete = (connectionId: number) => {
    setNote(null)
    deleteConnection.mutate(connectionId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (e) => setNote({ connectionId, text: messageOf(e, '연동을 해제하지 못했어요.'), isError: true }),
    })
  }

  return (
    <div>
      <button
        type="button"
        className="qbtn"
        onClick={() => {
          setOpen((v) => !v)
          setConfirmDeleteId(null)
          setNote(null)
        }}
        aria-expanded={open}
        style={ACTION_ROW_BTN_STYLE}
      >
        <span style={{ ...ICON_SQUARE_STYLE, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          <Icon name="link" size={18} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>증권사·거래소 연동</div>
          <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>API 키로 계좌·매매 내역 자동 등록</div>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={18} color="var(--text-weak)" />
      </button>

      {open && (
        <div style={PANEL_STYLE}>
          {connectionsQuery.isPending && <div aria-busy style={HINT_STYLE}>불러오는 중…</div>}

          {connectionsQuery.isError && (
            <div role="alert" style={{ ...HINT_STYLE, color: 'var(--down)' }}>
              연동 목록을 불러오지 못했어요.{' '}
              <button
                type="button"
                onClick={() => void connectionsQuery.refetch()}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                다시 시도
              </button>
            </div>
          )}

          {!connectionsQuery.isPending && !connectionsQuery.isError && connections.length === 0 && (
            <div style={HINT_STYLE}>
              아직 연동한 기관이 없어요. 자산 화면의 <b style={{ color: 'var(--text-strong)' }}>계좌 추가</b>에서
              주식·가상자산을 고르면 연동할 수 있어요.{' '}
              <a
                href={CONNECTION_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
              >
                발급 방법 보기 ↗
              </a>
            </div>
          )}

          {connections.map((c) => {
            const rowBusy = busyId === c.id
            const rowNote = note?.connectionId === c.id ? note : null
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>
                      {c.providerDescription}
                      <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--text-weak)' }}>{c.appKey}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>
                      {c.lastSyncedAt ? `마지막 가져오기 ${formatNotificationTime(c.lastSyncedAt)}` : '아직 가져오지 않았어요'}
                    </div>
                  </div>
                  <button
                    type="button" className="qbtn" disabled={rowBusy}
                    onClick={() => runSync(c.id, c.provider)}
                    aria-busy={postSync.isPending && rowBusy}
                    style={{ ...SMALL_BTN_STYLE, opacity: rowBusy ? 0.6 : 1 }}
                  >
                    {postSync.isPending && rowBusy ? '가져오는 중…' : '가져오기'}
                  </button>
                  <button
                    type="button" className="qbtn" disabled={rowBusy}
                    onClick={() => {
                      setNote(null)
                      setConfirmDeleteId((id) => (id === c.id ? null : c.id))
                    }}
                    style={{ ...SMALL_BTN_STYLE, color: 'var(--down)', opacity: rowBusy ? 0.6 : 1 }}
                  >
                    해제
                  </button>
                </div>

                {confirmDeleteId === c.id && (
                  // 되돌릴 수 없는 동작이라 확인을 받는다. 새 모달을 띄우지 않고 그 자리에서 묻는
                  // 규격(AddAccountModal의 유형 변경 확인 블록과 동일).
                  //
                  // "계좌와 매매 내역은 남는다"를 반드시 적는다 — 서버가 실제로 그렇게 동작하는데,
                  // 이 말이 없으면 자산이 통째로 사라질까 봐 해제를 못 한다.
                  <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>
                      {c.providerDescription} 연동을 해제할까요?
                    </div>
                    <div style={HINT_STYLE}>
                      등록한 API 키가 서버에서 지워지고 더 이상 가져오기를 할 수 없어요.
                      <b style={{ color: 'var(--text-strong)' }}> 이미 만들어진 계좌와 매매 내역은 그대로 남아요.</b>
                      {' '}다시 연동하려면 키를 새로 입력해야 해요.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button" className="qbtn" disabled={rowBusy}
                        onClick={() => runDelete(c.id)}
                        style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: rowBusy ? 0.6 : 1 }}
                      >
                        {deleteConnection.isPending && rowBusy ? '해제 중…' : '해제할게요'}
                      </button>
                      <button
                        type="button" className="qbtn"
                        onClick={() => setConfirmDeleteId(null)}
                        style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {rowNote && (
                  <div role={rowNote.isError ? 'alert' : 'status'} style={rowNote.isError ? ERROR_TEXT_STYLE : { ...HINT_STYLE, color: 'var(--text-strong)' }}>
                    {rowNote.text}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
