// 증권사·거래소 API 키 연동(BYOK) — AddAccountModal 안에서 열리는 서브뷰.
//
// 설계: docs/superpowers/specs/2026-08-29-byok-connection-design.md
//
// 새 모달을 띄우지 않고 AddAccountModal의 패널을 그대로 쓴다(AccountModal의 비밀번호 변경 뷰와 같은
// 규격 — 뒤로가기 헤더 + 폼). 모달을 두 겹 쌓으면 모바일 바텀시트에서 뒤 시트가 비쳐 보이고,
// 스크림 클릭으로 닫히지 않는 이 앱의 모달 규칙(docs/mobile.md §4)에서는 닫는 수단만 헷갈려진다.
//
// **API 키는 이 컴포넌트의 로컬 state에만 둔다.** AppState(전역)에 담으면 모달을 닫아도 메모리에
// 남고 다른 화면에서도 읽을 수 있다. 이 컴포넌트는 connectView !== 'none'일 때만 마운트되므로,
// 뒤로 나가거나 모달을 닫으면 언마운트되면서 키가 함께 사라진다 — AddAccountModal 본체와 달리
// 별도의 수동 초기화가 필요 없는 구조다.
//
// 등록(POST /connections)과 동기화(POST /connections/{id}/syncs)를 사용자에게 두 번 누르게 하지
// 않고 한 번의 "연동하고 가져오기"로 이어 부른다. 등록은 됐는데 동기화가 실패한 경우 연동 자체는
// 서버에 남아 있으므로 삭제하지 않고 그 자리에서 재시도할 수 있게 한다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { useAppState } from '../../../state/AppStateContext'
import { useGetConnections, usePostConnection, usePostConnectionSync } from '@/services/connection'
import type { ConnectionProvider, ConnectionResponse, SyncResponse } from '@/services/connection'
import type { AssetClass } from '@/services/common.type'
import { ApiError } from '@/services/api'
import {
  CONNECTION_GUIDE_URL,
  CONNECTION_KEY_MAX_LENGTH,
  PROVIDER_META,
  describeConnectionError,
  describeSync,
  isConnectionProvider,
  providersFor,
  tradeNounFor,
} from '../../../data/connectionView'

/** 서버 실패를 화면 문구로. ApiError가 아니면(네트워크 등) 기본 문장으로 접는다. */
function messageOf(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return describeConnectionError(e.code, e.message)
  return e instanceof Error ? e.message : fallback
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const TEXT_INPUT_STYLE: CSSProperties = {
  width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
  outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box',
}
const FIELD_ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }
const BACK_BTN_STYLE: CSSProperties = {
  width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
}
// 이 앱의 모달은 스크림 클릭으로 닫히지 않는다(docs/mobile.md §4). 계좌 폼 헤더에 X가 있듯
// 서브뷰에도 X를 남겨야 모바일에서 닫을 수단이 사라지지 않는다 — 뒤로가기만으로는 폼까지
// 되짚어 나가야 한다.
const HEADER_ROW_STYLE: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22,
}
const PRIMARY_BTN_STYLE: CSSProperties = {
  width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)',
  color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const SECONDARY_BTN_STYLE: CSSProperties = {
  flex: 1, padding: 12, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
const GUIDE_LINK_STYLE: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 44,
  fontSize: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none',
}
/** 안내·결과 블록. AddAccountModal의 유형 변경 확인 블록과 같은 규격. */
const NOTE_BLOCK_STYLE: CSSProperties = {
  background: 'var(--fill-subtle)', borderRadius: 10, padding: 14,
  fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.7,
}

function providerChipStyle(disabled: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10, minHeight: 44,
    border: '0.5px solid var(--border)',
    background: disabled ? 'var(--track)' : 'var(--surface)',
    color: disabled ? 'var(--text-weak)' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
  }
}

interface ConnectAccountViewProps {
  /** 계좌 추가 폼에서 고른 자산 유형. 어떤 기관을 보여줄지 결정한다. */
  assetClass: AssetClass
  /** 연동을 마쳤을 때(또는 결과 화면에서 확인을 눌렀을 때) 모달 전체를 닫는다. */
  onDone: () => void
}

export function ConnectAccountView({ assetClass, onDone }: ConnectAccountViewProps) {
  const { state, setState } = useAppState()
  const view = state.connectView
  const provider = isConnectionProvider(state.connectProvider) ? state.connectProvider : null

  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  // 등록에 성공한 연동. 동기화만 실패했을 때 재시도 대상으로 들고 있는다.
  const [created, setCreated] = useState<ConnectionResponse | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const candidates = providersFor(assetClass)
  // 기관 선택 화면뿐 아니라 키 입력 화면에서도 필요하다 — 후보가 하나뿐이라 선택 단계를 건너뛰는
  // 가상자산(업비트)은 여기서만 "이미 연동됨"을 알려줄 수 있다.
  const connectionsQuery = useGetConnections({ enabled: view !== 'none' })
  const connectedProviders = new Set(connectionsQuery.connections.map((c) => c.provider))

  const postConnection = usePostConnection()
  const postSync = usePostConnectionSync()
  const busy = postConnection.isPending || postSync.isPending

  const meta = provider ? PROVIDER_META[provider] : null
  // 이미 연동한 기관이면 서버가 준 표시명을 우선한다(기관명이 바뀌어도 화면이 따라간다).
  const displayName = (p: ConnectionProvider) =>
    connectionsQuery.connections.find((c) => c.provider === p)?.providerDescription ?? PROVIDER_META[p].label

  const closeConnect = () => setState({ connectView: 'none', connectProvider: null })

  // 기관 후보가 하나뿐인 자산 유형(가상자산 = 업비트)은 기관 선택 단계를 두지 않으므로,
  // 뒤로가기가 곧 계좌 추가 폼으로 돌아가는 것이다.
  const backFromForm = () => {
    setFieldError(null)
    if (candidates.length <= 1) closeConnect()
    else setState({ connectView: 'provider', connectProvider: null })
  }

  const runSync = async (connectionId: number) => {
    setSyncError(null)
    try {
      const result = await postSync.mutateAsync(connectionId)
      setSyncResult(result)
    } catch (e) {
      // 서버 코드별로 "그래서 뭘 해야 하는지"까지 붙인다 — 특히 키 오류와 허용 IP 미등록이
      // 같은 코드(CONNECTION_INVALID_CREDENTIALS)로 와서 둘 다 짚어줘야 한다.
      setSyncError(messageOf(e, '가져오기에 실패했어요.'))
    }
  }

  const handleSubmit = async () => {
    if (!provider) return
    const key = appKey.trim()
    const secret = appSecret.trim()
    if (!key || !secret) {
      setFieldError('두 값을 모두 입력해주세요')
      return
    }
    if (key.length > CONNECTION_KEY_MAX_LENGTH || secret.length > CONNECTION_KEY_MAX_LENGTH) {
      setFieldError(`각 값은 ${CONNECTION_KEY_MAX_LENGTH}자를 넘을 수 없어요`)
      return
    }
    setFieldError(null)
    try {
      // accountId를 싣지 않는다 — 첫 동기화가 계좌를 자동 생성하는 경로만 쓴다(설계 문서 §3).
      const connection = await postConnection.mutateAsync({ provider, appKey: key, appSecret: secret })
      setCreated(connection)
      // 등록된 순간 키는 서버로 갔고 더 들고 있을 이유가 없다. 재시도는 connectionId로 하므로
      // 여기서 지워도 흐름이 끊기지 않는다.
      setAppKey('')
      setAppSecret('')
      setState({ connectView: 'result' })
      await runSync(connection.id)
    } catch (e) {
      setFieldError(messageOf(e, '연동에 실패했어요.'))
    }
  }

  if (view === 'provider') {
    return (
      <div>
        <div style={HEADER_ROW_STYLE}>
          <button onClick={closeConnect} aria-label="뒤로" style={BACK_BTN_STYLE}>
            <Icon name="arrow_back" size={19} color="var(--text-mid)" />
          </button>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>증권사·거래소 연동</div>
          <button onClick={onDone} aria-label="닫기" style={{ ...BACK_BTN_STYLE, marginLeft: 'auto' }}>
            <Icon name="close" size={19} color="var(--text-mid)" />
          </button>
        </div>
        <div style={LABEL_STYLE}>어디를 연동할까요?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {candidates.map((p) => {
            const already = connectedProviders.has(p)
            // 백엔드가 아직 못 가져오는 기관은 아예 못 고르게 한다. 등록 자체는 되지만 동기화가
            // 400으로 떨어져서, 키를 다 발급받고 입력까지 마친 뒤에야 실패를 알게 된다.
            const notReady = !PROVIDER_META[p].supported
            const disabled = already || notReady
            return (
              <button
                key={p}
                type="button"
                className={disabled ? undefined : 'mini-hov'}
                disabled={disabled}
                title={notReady ? '모닛이 아직 이 기관의 내역 가져오기를 지원하지 않아요' : undefined}
                onClick={() => setState({ connectView: 'form', connectProvider: p })}
                style={providerChipStyle(disabled)}
              >
                {displayName(p)}
                {notReady ? ' · 준비 중' : already ? ' · 연동됨' : ''}
              </button>
            )
          })}
        </div>
        <a
          href={CONNECTION_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={GUIDE_LINK_STYLE}
        >
          기관별 발급 방법 보기
          <Icon name="open_in_new" size={14} ariaHidden />
        </a>
        {connectionsQuery.connections.length > 0 && (
          <div style={{ ...NOTE_BLOCK_STYLE, marginTop: 14 }}>
            이미 연동한 기관은 설정 → 데이터 관리 및 백업에서 다시 가져오거나 해제할 수 있어요.
          </div>
        )}
      </div>
    )
  }

  if (view === 'form' && meta && provider) {
    return (
      <div>
        <div style={HEADER_ROW_STYLE}>
          <button onClick={backFromForm} aria-label="뒤로" style={BACK_BTN_STYLE}>
            <Icon name="arrow_back" size={19} color="var(--text-mid)" />
          </button>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>{meta.label} 연동</div>
          <button onClick={onDone} aria-label="닫기" style={{ ...BACK_BTN_STYLE, marginLeft: 'auto' }}>
            <Icon name="close" size={19} color="var(--text-mid)" />
          </button>
        </div>

        {/* 후보가 하나뿐이라 기관 선택 단계를 건너뛰는 가상자산은 "이미 연동됨"을 알릴 자리가
            여기밖에 없다. 서버가 중복 등록을 어떻게 처리하는지 계약에 없으므로(설계 문서 §2)
            막지는 않고 사실만 알린다 — 사용자가 키를 새로 발급받아 갈아끼우려는 것일 수도 있다. */}
        {connectedProviders.has(provider) && (
          <div style={{ ...NOTE_BLOCK_STYLE, marginBottom: 12 }}>
            {meta.label}은 이미 연동되어 있어요. 다시 가져오기만 하려면 설정 → 데이터 관리 및 백업에서
            할 수 있어요.
          </div>
        )}

        <div style={{ ...NOTE_BLOCK_STYLE, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <span>{meta.guide}</span>
          {/* 권한 범위·허용 IP·시크릿 1회 노출 같은 세부는 여기 다 적으면 폼이 화면 밖으로 밀린다.
              새 창으로 여는 이유: 같은 창에서 이동하면 입력하던 키가 날아간다. */}
          <a href={CONNECTION_GUIDE_URL} target="_blank" rel="noopener noreferrer" style={GUIDE_LINK_STYLE}>
            {meta.label} 발급 방법 자세히
            <Icon name="open_in_new" size={14} ariaHidden />
          </a>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div>
            <div style={LABEL_STYLE}>{meta.keyLabel}</div>
            <input
              type="password" autoComplete="off" spellCheck={false} maxLength={CONNECTION_KEY_MAX_LENGTH}
              value={appKey}
              onChange={(e) => {
                setAppKey(e.target.value)
                if (fieldError) setFieldError(null)
              }}
              style={TEXT_INPUT_STYLE}
            />
          </div>
          <div>
            <div style={LABEL_STYLE}>{meta.secretLabel}</div>
            <input
              type="password" autoComplete="off" spellCheck={false} maxLength={CONNECTION_KEY_MAX_LENGTH}
              value={appSecret}
              onChange={(e) => {
                setAppSecret(e.target.value)
                if (fieldError) setFieldError(null)
              }}
              style={TEXT_INPUT_STYLE}
            />
            {fieldError && <div role="alert" style={FIELD_ERROR_STYLE}>{fieldError}</div>}
          </div>

          <div style={{ ...NOTE_BLOCK_STYLE, display: 'flex', gap: 9 }}>
            <Icon name="lock" size={16} style={{ color: 'var(--text-weak)', flexShrink: 0 }} ariaHidden />
            <span>입력한 키는 서버에서 암호화해 보관하고, 다시 화면에 표시되지 않아요. 바꾸려면 연동을 해제하고 다시 등록해주세요.</span>
          </div>

          <button type="submit" className="qbtn" disabled={busy} style={{ ...PRIMARY_BTN_STYLE, opacity: busy ? 0.6 : 1 }}>
            {busy ? '가져오는 중…' : '연동하고 가져오기'}
          </button>
        </form>
      </div>
    )
  }

  if (view === 'result') {
    const summary = syncResult ? describeSync(syncResult, provider ? tradeNounFor(provider) : undefined) : null
    return (
      <div>
        <div style={HEADER_ROW_STYLE}>
          <span
            style={{
              width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: syncError ? 'var(--fill-subtle)' : 'var(--accent-soft)',
              color: syncError ? 'var(--text-mid)' : 'var(--accent)',
            }}
          >
            <Icon name={syncError ? 'warning' : 'check_circle'} size={20} ariaHidden />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>
            {meta?.label ?? '기관'} {syncError ? '가져오기 실패' : postSync.isPending ? '가져오는 중' : '연동 완료'}
          </div>
          {/* 가져오는 중에는 닫기를 감춘다 — 이 자리에서 닫아도 서버 작업은 계속되므로,
              닫을 수 있게 두면 결과를 못 본 채 "된 건가?" 하고 남는다. */}
          {!postSync.isPending && (
            <button onClick={onDone} aria-label="닫기" style={{ ...BACK_BTN_STYLE, marginLeft: 'auto' }}>
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          )}
        </div>

        {postSync.isPending && <div style={NOTE_BLOCK_STYLE}>기관에서 계좌와 매매 내역을 가져오고 있어요. 잠시만 기다려주세요.</div>}

        {syncError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={NOTE_BLOCK_STYLE}>
              연동은 저장했지만 가져오기에 실패했어요.
              <div style={{ marginTop: 6, color: 'var(--down)' }} role="alert">{syncError}</div>
              <div style={{ marginTop: 6 }}>설정 → 데이터 관리 및 백업에서 나중에 다시 가져올 수 있어요.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button" className="qbtn" disabled={!created || busy}
                onClick={() => created && void runSync(created.id)}
                style={{ ...PRIMARY_BTN_STYLE, flex: 1, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? '다시 시도 중…' : '다시 시도'}
              </button>
              <button type="button" className="qbtn" onClick={onDone} style={SECONDARY_BTN_STYLE}>
                나중에 할게요
              </button>
            </div>
          </div>
        )}

        {summary && !syncError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={NOTE_BLOCK_STYLE}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>{summary.headline}</div>
              {summary.detail && <div style={{ marginTop: 6 }}>{summary.detail}</div>}
            </div>
            <button type="button" className="qbtn" onClick={onDone} style={PRIMARY_BTN_STYLE}>
              확인
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
