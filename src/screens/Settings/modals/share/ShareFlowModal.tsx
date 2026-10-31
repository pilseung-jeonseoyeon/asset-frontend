// 설정 › 가족 · 커플 공유(v17 시안) — 홈과 연결 흐름(초대 코드 · 코드 입력 · 초대 확인 · 연결 완료 · 공유할 계좌 선택 ·
// 공유 시작 완료)을 한 모달 안에서 단계(AppState.shareFlowStep)로 바꿔 그린다. openModal 'familyShare'로 열린다.
//   여는 곳: 설정 카드(홈), 상단 '공유' 안내 팝오버의 [공유 추가](홈), 연결됨 알림의 버튼(연결 완료).
//   초대 코드는 창이 열려 있는 동안 만료되면 새로 받는다. 초대한 사람이 기다리는 사이 상대가 수락하면(알림 →
//   공유 상태 다시 받음) 저절로 '연결 완료' 단계로 넘어간다.
// 항상 마운트되는 모달이라 닫을 때 로컬 상태·mutation 을 직접 초기화한다(docs/architecture.md).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../../components/primitives/Icon/Icon'
import { Modal } from '../../../../components/primitives/Modal/Modal'
import { Skeleton } from '../../../../components/primitives/Skeleton/Skeleton'
import { useAppState } from '../../../../state/AppStateContext'
import { useAuthStore } from '../../../../stores/auth'
import { SHARE_CODE_LENGTH, shareHistoryLabel } from '../../../../data/shareView'
import { useViewScope } from '../../../../utils/viewScope'
import { ShareCodeView } from './ShareCodeView'
import { ShareHomeView } from './ShareHomeView'
import { ShareInviteView } from './ShareInviteView'
import { SharePickView } from './SharePickView'
import type { SharePickDraft } from './SharePickView'
import { CenteredIntro, FlowHeader, SharedAccountRow, SpaceNameField, StepBars } from './shareParts'
import { ERROR_TEXT_STYLE, PRIMARY_BTN_STYLE, SECONDARY_BTN_STYLE } from './shareStyles'
import { useSpaceNameDraft } from './useSpaceNameDraft'
import { useGetAccounts } from '@/services/account'
import { useGetInstitutions } from '@/services/institution'
import {
  useAcceptShareCode,
  useCancelShareCode,
  useCheckShareCode,
  useGetShareStatus,
  useIssueShareCode,
  usePatchShareSpaceName,
  useSetSharedAccounts,
  useUnlinkShare,
} from '@/services/share'
import type { ShareInvite } from '@/services/share'
import type { ShareFlowStep } from '../../../../state/types'

const WIDTH_BY_STEP: Record<ShareFlowStep, number> = {
  home: 520, invite: 480, code: 460, accept: 460, linked: 480, pick: 500, done: 460,
}
const EMPTY_CELLS = Array.from({ length: SHARE_CODE_LENGTH }, () => '')

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : '잠시 후 다시 시도해 주세요.'
}

export function ShareFlowModal() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()
  const isOpen = state.openModal === 'familyShare'
  const step = state.shareFlowStep
  const myUserId = useAuthStore((s) => s.userId)
  const { setScope } = useViewScope()

  const statusQuery = useGetShareStatus({ enabled: isOpen })
  const status = statusQuery.shareStatus
  const linked = status?.status === 'LINKED'
  const sharedAccountsQuery = useGetAccounts({ scope: 'SHARED' }, { enabled: isOpen && linked })
  const sharedAccounts = sharedAccountsQuery.data ?? []
  const myAccountsQuery = useGetAccounts({}, { enabled: isOpen && step === 'pick' })
  const institutions = useGetInstitutions({ enabled: isOpen }).data ?? []

  const issue = useIssueShareCode()
  const cancel = useCancelShareCode()
  const check = useCheckShareCode()
  const accept = useAcceptShareCode()
  const unlink = useUnlinkShare()
  const setShared = useSetSharedAccounts()
  const patchName = usePatchShareSpaceName()

  const [now, setNow] = useState(() => Date.now())
  const [cells, setCells] = useState<string[]>(EMPTY_CELLS)
  const [checked, setChecked] = useState<{ code: string; inviterName: string } | null>(null)
  const [draft, setDraft] = useState<SharePickDraft>(new Map())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [unlinkConfirm, setUnlinkConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const spaceName = useSpaceNameDraft(status?.spaceName ?? '우리집', (name) =>
    patchName.mutate(name, { onSuccess: () => setNameError(null), onError: (e) => setNameError(messageOf(e)) }),
  )

  // 지금 보여 줄 초대 코드 — 서버 상태의 코드와 방금 받은 코드 중 늦게 만료되는 것(새로 받은 직후 상태를 다시 받는 사이에도 새 코드를 보인다)
  const statusInvite = status?.status === 'PENDING' ? status.invite : null
  const invite = [statusInvite, issue.data ?? null]
    .filter((i): i is ShareInvite => i !== null)
    .sort((a, b) => Date.parse(b.expiresAt) - Date.parse(a.expiresAt))[0] ?? null
  const remainingMs = invite ? Date.parse(invite.expiresAt) - now : 0
  const ticking = isOpen && (step === 'invite' || (step === 'home' && status?.status === 'PENDING'))

  // 남은 시간 표시를 1초마다 갱신(단계에 들어올 때 바로 한 번)
  useEffect(() => {
    if (!ticking) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [ticking])

  // 초대 코드 단계: 살아 있는 코드가 없거나 만료되면 새로 받는다(실패하면 [새 코드 발급]을 누를 때까지 멈춘다)
  const needCode = isOpen && step === 'invite' && status !== null && !linked && (!invite || remainingMs <= 0)
  const { isPending: issuing, isError: issueFailed, mutate: issueCode } = issue
  useEffect(() => {
    if (needCode && !issuing && !issueFailed) issueCode()
  }, [needCode, issuing, issueFailed, issueCode])

  // 기다리는 사이 상대가 수락하면 '연결 완료'로
  useEffect(() => {
    if (isOpen && step === 'invite' && linked) setState({ shareFlowStep: 'linked' })
  }, [isOpen, step, linked, setState])

  if (!isOpen) return null

  const goto = (next: ShareFlowStep) => {
    setError(null)
    setState({ shareFlowStep: next })
  }
  const close = () => {
    if (spaceName.value !== (status?.spaceName ?? '우리집')) spaceName.commit(spaceName.value)
    setCells(EMPTY_CELLS)
    setChecked(null)
    setDraft(new Map())
    setCopiedCode(null)
    setUnlinkConfirm(false)
    setError(null)
    setNameError(null)
    spaceName.reset()
    ;[issue, cancel, check, accept, unlink, setShared, patchName].forEach((m) => m.reset())
    setState({ openModal: null, shareFlowStep: 'home', sharePickMode: 'onboard' })
  }
  const openPick = (mode: 'onboard' | 'manage') => {
    setDraft(new Map((status?.myAccounts ?? []).map((m) => [m.accountId, m.includeHistory])))
    setError(null)
    setState({ shareFlowStep: 'pick', sharePickMode: mode })
  }
  const partnerName = status?.partner?.name ?? null
  const space = status?.spaceName ?? '우리집'
  const myShared = sharedAccounts.filter((a) => a.ownerId === myUserId)
  const historyOf = (id: number) => status?.myAccounts.find((m) => m.accountId === id)?.includeHistory ?? false

  // 단계가 연결 상태와 맞지 않으면(연결이 끊긴 뒤 알림을 눌렀다 등) 홈을 그린다
  const effectiveStep: ShareFlowStep =
    (step === 'linked' || step === 'pick' || step === 'done') && !linked ? 'home'
      : (step === 'invite' || step === 'code' || step === 'accept') && linked ? 'home'
        : step

  let body
  if (!status) {
    body = (
      <>
        <FlowHeader icon="group" title="가족 · 커플 공유" onClose={close} />
        {statusQuery.isError ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <div role="alert" style={{ fontSize: 12.5, color: 'var(--text-mid)' }}>공유 정보를 불러오지 못했어요.</div>
            <button type="button" onClick={() => void statusQuery.refetch()} style={{ ...SECONDARY_BTN_STYLE, width: 'auto', height: 40, padding: '0 16px' }}>다시 시도</button>
          </div>
        ) : (
          <div aria-busy style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={64} />
            <Skeleton height={120} />
          </div>
        )}
      </>
    )
  } else if (unlinkConfirm && linked) {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <FlowHeader onClose={close} />
        <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--down-chip)', color: 'var(--down)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon name="link_off" size={22} />
        </span>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>{partnerName}님과 연결을 해제할까요?</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.7, marginBottom: 24 }}>
          해제하면 서로 공유한 계좌가 '{space}' 화면에서 사라지고, 상단 탭은 '개인'만 남아요.
          <br />
          각자 기록한 가계부 내역은 결제한 사람의 내역으로 남아요.
        </div>
        {error && <div role="alert" style={{ ...ERROR_TEXT_STYLE, marginTop: 0, marginBottom: 12 }}>{error}</div>}
        <button
          type="button"
          className="pill-btn"
          disabled={unlink.isPending}
          onClick={() =>
            unlink.mutate(undefined, {
              onSuccess: () => {
                setUnlinkConfirm(false)
                setScope('PERSONAL')
              },
              onError: (e) => setError(messageOf(e)),
            })
          }
          style={{ ...PRIMARY_BTN_STYLE, background: 'var(--down)' }}
        >
          {unlink.isPending ? '해제하는 중…' : '연결 해제'}
        </button>
        <button type="button" className="pill-btn" onClick={() => { setUnlinkConfirm(false); setError(null) }} style={{ ...SECONDARY_BTN_STYLE, marginTop: 8 }}>
          취소
        </button>
      </div>
    )
  } else if (effectiveStep === 'invite') {
    const code = invite && remainingMs > 0 ? invite.code : null
    body = (
      <ShareInviteView
        code={code}
        remainingMs={Math.max(0, remainingMs)}
        copied={code !== null && copiedCode === code}
        busy={issue.isPending}
        error={issue.isError ? messageOf(issue.error) : null}
        onBack={() => goto('home')}
        onClose={close}
        onReissue={() => {
          issue.reset()
          issue.mutate()
        }}
        onCopy={() => {
          if (!code) return
          navigator.clipboard?.writeText(code).then(() => setCopiedCode(code)).catch(() => setCopiedCode(null))
        }}
      />
    )
  } else if (effectiveStep === 'code') {
    body = (
      <ShareCodeView
        cells={cells}
        busy={check.isPending}
        error={error}
        onChange={(next) => {
          setCells(next)
          setError(null)
        }}
        onSubmit={() => {
          const code = cells.join('')
          check.mutate(code, {
            onSuccess: (r) => {
              setChecked({ code, inviterName: r.inviterName })
              goto('accept')
            },
            onError: (e) => setError(messageOf(e)),
          })
        }}
        onBack={() => goto('home')}
        onClose={close}
      />
    )
  } else if (effectiveStep === 'accept') {
    body = (
      <>
        <FlowHeader onClose={close} />
        <StepBars step={2} />
        <CenteredIntro icon="mail" title={`${checked?.inviterName ?? ''}님이 함께 보자고 초대했어요`}>
          수락하면 두 사람이 각자 고른 계좌만 공유 화면에서 함께 볼 수 있어요.
        </CenteredIntro>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 16, marginTop: 20 }}>
          {['공유할 계좌는 내가 직접 골라요', "고르지 않은 계좌와 내역은 '개인'에만 남고 상대에게 보이지 않아요", '언제든 설정에서 연결을 해제할 수 있어요'].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>
              <Icon name="check_circle" size={16} color="var(--accent)" style={{ flex: 'none' }} />
              {t}
            </div>
          ))}
        </div>
        {error && <div role="alert" style={ERROR_TEXT_STYLE}>{error}</div>}
        <div style={{ marginTop: 22 }}>
          <button
            type="button"
            className="pill-btn"
            disabled={accept.isPending || !checked}
            onClick={() =>
              checked &&
              accept.mutate(checked.code, {
                onSuccess: () => goto('linked'),
                onError: (e) => setError(messageOf(e)),
              })
            }
            style={PRIMARY_BTN_STYLE}
          >
            {accept.isPending ? '연결하는 중…' : '수락하고 연결'}
          </button>
        </div>
        <button
          type="button"
          className="pill-btn"
          onClick={() => {
            setCells(EMPTY_CELLS)
            setChecked(null)
            goto('home')
          }}
          style={{ ...SECONDARY_BTN_STYLE, marginTop: 8 }}
        >
          거절
        </button>
      </>
    )
  } else if (effectiveStep === 'linked') {
    body = (
      <>
        <FlowHeader onClose={close} />
        <StepBars step={2} />
        <div style={{ marginBottom: 22 }}>
          <CenteredIntro icon="link" title={`${partnerName}님과 연결됐어요`}>
            공유 화면 이름을 정하고, 함께 볼 계좌를 골라주세요.
            <br />
            고르지 않은 계좌는 계속 '개인'에서만 보여요.
          </CenteredIntro>
        </div>
        <SpaceNameField value={spaceName.value} partnerName={partnerName} onChange={spaceName.setValue} onCommit={spaceName.commit} error={nameError} />
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              spaceName.commit(spaceName.value)
              openPick('onboard')
            }}
            style={PRIMARY_BTN_STYLE}
          >
            공유할 계좌 선택
          </button>
        </div>
        <button type="button" className="pill-btn" onClick={close} style={{ ...SECONDARY_BTN_STYLE, marginTop: 8 }}>
          나중에 할게요
        </button>
      </>
    )
  } else if (effectiveStep === 'pick') {
    body = (
      <SharePickView
        mode={state.sharePickMode}
        accounts={myAccountsQuery.data ?? []}
        institutions={institutions}
        draft={draft}
        spaceName={space}
        partnerName={partnerName}
        busy={setShared.isPending}
        error={error}
        onChange={setDraft}
        onSave={() => {
          const items = [...draft.entries()].map(([accountId, includeHistory]) => ({ accountId, includeHistory }))
          setShared.mutate(items, {
            onSuccess: () => goto(state.sharePickMode === 'manage' ? 'home' : 'done'),
            onError: (e) => setError(messageOf(e)),
          })
        }}
        onBack={() => goto('home')}
        onLater={close}
        onClose={close}
      />
    )
  } else if (effectiveStep === 'done') {
    body = (
      <>
        <FlowHeader onClose={close} />
        <StepBars step={3} />
        <CenteredIntro icon="check_circle" title="공유를 시작했어요">
          {partnerName}님도 공유 화면에서 아래 계좌 {status.myAccounts.length}개를 볼 수 있어요.
          <br />
          공유 중인 계좌는 '개인' 합계에서 빠지고 상단 '{space}' 탭에서 합산돼요.
        </CenteredIntro>
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '2px 14px', marginTop: 20 }}>
          {myShared.map((a) => (
            <SharedAccountRow key={a.id} account={a} institutions={institutions} caption={shareHistoryLabel(historyOf(a.id))} />
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <button
            type="button"
            className="pill-btn"
            onClick={() => {
              close()
              setScope('SHARED')
              navigate('/dashboard')
            }}
            style={PRIMARY_BTN_STYLE}
          >
            '{space}' 화면 보기
          </button>
        </div>
        <button type="button" className="pill-btn" onClick={close} style={{ ...SECONDARY_BTN_STYLE, marginTop: 8 }}>
          닫기
        </button>
      </>
    )
  } else {
    body = (
      <ShareHomeView
        status={status}
        sharedAccounts={sharedAccounts}
        institutions={institutions}
        myUserId={myUserId}
        inviteRemainingMs={Math.max(0, remainingMs)}
        spaceName={{ value: spaceName.value, onChange: spaceName.setValue, onCommit: spaceName.commit, error: nameError }}
        busy={cancel.isPending}
        error={cancel.isError ? messageOf(cancel.error) : null}
        onClose={close}
        onInvite={() => goto('invite')}
        onCancelInvite={() => cancel.mutate()}
        onEnterCode={() => {
          setCells(EMPTY_CELLS)
          goto('code')
        }}
        onUnlink={() => {
          setError(null)
          setUnlinkConfirm(true)
        }}
        onManageAccounts={() => openPick('manage')}
      />
    )
  }

  return (
    <Modal onClose={close} zIndex={80} width={WIDTH_BY_STEP[effectiveStep]} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {body}
    </Modal>
  )
}
