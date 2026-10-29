// 설정 › 가족 · 커플 공유 홈(v17 시안 '공유 홈'). 구성원 · 공유 화면 이름 · 받은 초대 · 내가 공유 중 · 참여 중 · 안내.
// 연결 해제 확인은 같은 창 안에서 내용을 바꿔 보여준다(ShareFlowModal).

import { Icon } from '../../../../components/primitives/Icon/Icon'
import { formatRemaining, formatShareDate, shareHistoryLabel } from '../../../../data/shareView'
import { FlowHeader, SharedAccountRow, SpaceNameField } from './shareParts'
import { COUNT_STYLE, ERROR_TEXT_STYLE, MUTED_TEXT_STYLE, SECTION_TITLE_STYLE, SMALL_BTN_STYLE } from './shareStyles'
import type { AccountResponse } from '@/services/account'
import type { InstitutionResponse } from '@/services/institution'
import type { ShareStatusResponse } from '@/services/share'

const MEMBER_CARD_STYLE = {
  display: 'flex', alignItems: 'center', gap: 12, border: '0.5px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 10,
} as const

interface ShareHomeViewProps {
  status: ShareStatusResponse
  /** GET /accounts?scope=SHARED (연결 중일 때만) */
  sharedAccounts: AccountResponse[]
  institutions: InstitutionResponse[]
  myUserId: string | null
  /** 초대 코드 남은 시간(ms) — PENDING일 때만 의미 */
  inviteRemainingMs: number
  spaceName: { value: string; onChange: (v: string) => void; onCommit: (v: string) => void; error: string | null }
  busy: boolean
  error: string | null
  onClose: () => void
  onInvite: () => void
  onCancelInvite: () => void
  onEnterCode: () => void
  onUnlink: () => void
  onManageAccounts: () => void
}

export function ShareHomeView(props: ShareHomeViewProps) {
  const { status, sharedAccounts, institutions, myUserId } = props
  const linked = status.status === 'LINKED'
  const partnerName = status.partner?.name ?? null
  const spaceLabel = linked ? status.spaceName : '공유'
  const mine = sharedAccounts.filter((a) => a.ownerId === myUserId)
  const partners = sharedAccounts.filter((a) => a.ownerId !== myUserId)
  const historyOf = (accountId: number) => status.myAccounts.find((m) => m.accountId === accountId)?.includeHistory ?? false

  return (
    <>
      <FlowHeader icon="group" title="가족 · 커플 공유" onClose={props.onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section>
          <div style={SECTION_TITLE_STYLE}>
            구성원<span style={COUNT_STYLE}>{linked ? 1 : 0}</span>
          </div>
          {status.status === 'NONE' && (
            <>
              <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>아직 함께하는 구성원이 없어요. 구성원을 초대하면 함께 볼 계좌를 고를 수 있어요.</div>
              <button
                type="button"
                className="qbtn"
                onClick={props.onInvite}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, minHeight: 46,
                  borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-mid)',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit',
                }}
              >
                <Icon name="person_add" size={17} />
                구성원 초대
              </button>
            </>
          )}
          {status.status === 'PENDING' && (
            <div style={{ ...MEMBER_CARD_STYLE, flexWrap: 'wrap' }}>
              <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--track)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="hourglass_top" size={20} />
              </span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>수락을 기다리고 있어요</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>초대 코드 {formatRemaining(props.inviteRemainingMs)} 후 만료</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={props.onInvite} style={SMALL_BTN_STYLE}>초대 보기</button>
                <button type="button" onClick={props.onCancelInvite} disabled={props.busy} style={{ ...SMALL_BTN_STYLE, color: 'var(--exp-text)' }}>취소</button>
              </div>
            </div>
          )}
          {linked && (
            <div style={MEMBER_CARD_STYLE}>
              <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <Icon name="link" size={20} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partnerName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
                  연결됨{status.linkedAt ? ` · ${formatShareDate(status.linkedAt)}부터` : ''}
                </div>
              </div>
              <button type="button" onClick={props.onUnlink} style={{ ...SMALL_BTN_STYLE, color: 'var(--exp-text)' }}>연결 해제</button>
            </div>
          )}
          {props.error && <div role="alert" style={ERROR_TEXT_STYLE}>{props.error}</div>}
        </section>

        {linked && (
          <SpaceNameField
            value={props.spaceName.value}
            partnerName={partnerName}
            onChange={props.spaceName.onChange}
            onCommit={props.spaceName.onCommit}
            error={props.spaceName.error}
          />
        )}

        {!linked && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={SECTION_TITLE_STYLE}>
                받은 초대<span style={COUNT_STYLE}>0</span>
              </div>
              <button type="button" onClick={props.onEnterCode} style={SMALL_BTN_STYLE}>초대 코드 입력</button>
            </div>
            <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>받은 초대가 없어요. 초대 코드를 받았다면 입력해 주세요.</div>
          </section>
        )}

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={SECTION_TITLE_STYLE}>
              내가 공유 중<span style={COUNT_STYLE}>{status.myAccounts.length}</span>
            </div>
            {linked && <button type="button" onClick={props.onManageAccounts} style={SMALL_BTN_STYLE}>공유 계좌 관리</button>}
          </div>
          {linked && mine.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
              {mine.map((a) => (
                <SharedAccountRow key={a.id} account={a} institutions={institutions} caption={shareHistoryLabel(historyOf(a.id))} />
              ))}
            </div>
          )}
          {linked && status.myAccounts.length === 0 && (
            <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>아직 공유 중인 계좌가 없어요. 공유 계좌 관리에서 함께 볼 계좌를 골라주세요.</div>
          )}
          {!linked && <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>구성원이 연결되면 공유할 계좌를 고를 수 있어요.</div>}
        </section>

        <section>
          <div style={SECTION_TITLE_STYLE}>
            참여 중<span style={COUNT_STYLE}>{linked ? status.partnerAccountCount : 0}</span>
          </div>
          {linked && partners.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
              {partners.map((a) => (
                <SharedAccountRow key={a.id} account={a} institutions={institutions} caption={`${partnerName ?? '상대'}님이 공유`} />
              ))}
            </div>
          )}
          {linked && status.partnerAccountCount === 0 && (
            <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>{partnerName ?? '상대'}님이 아직 공유한 계좌가 없어요.</div>
          )}
          {!linked && <div style={{ ...MUTED_TEXT_STYLE, marginTop: 8 }}>다른 구성원이 공유한 계좌가 여기에 보여요.</div>}
        </section>

        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6, paddingTop: 16, borderTop: '0.5px solid var(--track)' }}>
          공유는 현금 · 예적금 계좌만 할 수 있어요. 공유 중인 계좌는 '개인' 화면 합계에서 빠지고, 상단 '{spaceLabel}' 탭에서 합산돼요.
        </div>
      </div>
    </>
  )
}
