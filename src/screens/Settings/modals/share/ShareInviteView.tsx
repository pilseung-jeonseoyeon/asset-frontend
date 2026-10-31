// 1단계 · 구성원 초대(초대하는 사람, v17 시안). 6자리 코드 · 남은 시간 · 진행 바 · 새 코드 발급 · 코드 복사.
// 창이 열려 있는 동안 코드가 만료되면 ShareFlowModal이 새 코드를 자동으로 받는다.
// 상대가 거절하면(SHARE_DECLINED 알림) 아래 '수락을 기다리고 있어요' 칸이 거절 안내로 바뀐다.
// 코드 아래 '이메일로 초대 보내기'(7일 유효)는 가입한 사람에게 앱 알림으로 초대가 간다 — 메일은 보내지 않는다.
// 가입 여부가 드러나지 않게 보내기 결과 문구와 보낸 목록은 늘 같다(서버 send_share_invite).

import { Icon } from '../../../../components/primitives/Icon/Icon'
import { SHARE_CODE_LENGTH, SHARE_CODE_TTL_MS, formatRemaining, inviteDeadlineLabel } from '../../../../data/shareView'
import { FlowHeader, StepBars } from './shareParts'
import { ERROR_TEXT_STYLE, SMALL_BTN_STYLE } from './shareStyles'
import type { SentShareInvitation } from '@/services/share'

export interface EmailInviteProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  sending: boolean
  /** 방금 보내기에 성공했으면 true — "보냈어요" 안내 */
  sent: boolean
  error: string | null
  list: SentShareInvitation[]
  onCancel: (invitationId: number) => void
  cancellingId: number | null
}

interface ShareInviteViewProps {
  code: string | null
  remainingMs: number
  copied: boolean
  /** 지금 코드로 온 거절 알림의 제목("OO님이 초대를 거절했어요"). 없으면 null — 기다리는 중 */
  declinedTitle: string | null
  busy: boolean
  error: string | null
  email: EmailInviteProps
  onBack: () => void
  onClose: () => void
  onReissue: () => void
  onCopy: () => void
}

export function ShareInviteView({ code, remainingMs, copied, declinedTitle, busy, error, email, onBack, onClose, onReissue, onCopy }: ShareInviteViewProps) {
  const cells = (code ?? '').padEnd(SHARE_CODE_LENGTH, ' ').slice(0, SHARE_CODE_LENGTH).split('')
  const pct = Math.min(100, Math.max(0, (remainingMs / SHARE_CODE_TTL_MS) * 100))
  return (
    <>
      <FlowHeader title="구성원 초대" onBack={onBack} onClose={onClose} />
      <StepBars step={1} />
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>초대 코드를 상대방에게 알려주세요</div>
      <div style={{ fontSize: 12, color: 'var(--text-weak)', marginTop: 4, marginBottom: 18 }}>1단계 · 총 3단계 · 상대방이 코드를 입력하고 수락하면 연결돼요</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>초대 코드</div>
      <div style={{ display: 'flex', gap: 8 }} aria-live="polite" aria-label={code ? `초대 코드 ${code.split('').join(' ')}` : '초대 코드를 만드는 중'}>
        {cells.map((c, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              flex: 1, minWidth: 0, height: 54, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--fill-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 700, color: 'var(--text-strong)',
            }}
          >
            {c.trim() || '·'}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-mid)' }}>
          <Icon name="schedule" size={15} color="var(--text-weak)" />
          <span>
            <b style={{ color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{formatRemaining(remainingMs)}</b> 후 만료
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onReissue} disabled={busy} style={SMALL_BTN_STYLE}>새 코드 발급</button>
          <button
            type="button"
            className="qbtn"
            onClick={onCopy}
            disabled={!code}
            style={{ ...SMALL_BTN_STYLE, display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'var(--accent)', color: '#fff' }}
          >
            <Icon name={copied ? 'check' : 'content_copy'} size={15} />
            {copied ? '복사됨' : '코드 복사'}
          </button>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'var(--track)', marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct.toFixed(2)}%`, height: '100%', borderRadius: 4, background: 'var(--accent)' }} />
      </div>
      {error && <div role="alert" style={ERROR_TEXT_STYLE}>{error}</div>}
      <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 10, lineHeight: 1.6 }}>
        코드는 10분 동안만 유효하고, 만료되면 새 코드가 자동으로 발급돼요.
        <br />
        상대방은 설정 › 가족 · 커플 공유 › 초대 코드 입력에서 입력해요.
      </div>
      <EmailInviteSection {...email} />
      <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px', marginTop: 20 }}>
        <Icon name={declinedTitle ? 'person_remove' : 'hourglass_top'} size={20} color="var(--text-weak)" style={{ flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{declinedTitle ?? '수락을 기다리고 있어요'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, lineHeight: 1.5 }}>
            {declinedTitle
              ? '코드가 유효한 동안에는 상대가 다시 입력해 수락할 수 있어요. 다른 사람을 초대하려면 새 코드를 발급해 주세요.'
              : '상대방이 코드를 입력하고 수락하면 알림으로 알려드려요. 이 창을 닫아도 초대는 유지돼요.'}
          </div>
        </div>
      </div>
    </>
  )
}

function EmailInviteSection({ value, onChange, onSend, sending, sent, error, list, onCancel, cancellingId }: EmailInviteProps) {
  const canSend = value.trim() !== '' && !sending
  return (
    <section aria-labelledby="share-invite-email-label" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 14 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        또는
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <label id="share-invite-email-label" htmlFor="share-invite-email" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>
        이메일로 초대 보내기
      </label>
      {/* 형식 확인은 ShareFlowModal이 앱 문구로 한다 — 브라우저 기본 말풍선은 끈다 */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSend()
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          id="share-invite-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={254}
          placeholder="상대방이 모닛에 가입한 이메일"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby="share-invite-email-help"
          style={{
            flex: 1, minWidth: 0, height: 40, border: '0.5px solid var(--border)', borderRadius: 10, padding: '0 12px', fontSize: 13,
            fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', background: 'var(--surface)', boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          className="qbtn"
          disabled={!canSend}
          style={{
            ...SMALL_BTN_STYLE, minHeight: 40, padding: '0 16px', border: 'none',
            background: canSend ? 'var(--accent)' : 'var(--track)', color: canSend ? '#fff' : 'var(--text-weak)',
          }}
        >
          {sending ? '보내는 중…' : '보내기'}
        </button>
      </form>
      {error && <div role="alert" style={ERROR_TEXT_STYLE}>{error}</div>}
      {!error && sent && (
        <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--up)', marginTop: 8, lineHeight: 1.5 }}>
          <Icon name="check_circle" size={16} style={{ flex: 'none' }} />
          보냈어요. 이 이메일로 가입한 사람이 있으면 모닛 알림으로 초대가 가요.
        </div>
      )}
      {list.length > 0 && (
        <ul aria-label="보낸 초대" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((inv) => (
            <li key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
              <Icon name="mail" size={18} color="var(--text-weak)" style={{ flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)' }}>{inviteDeadlineLabel(inv.expiresAt)}</div>
              </div>
              <button
                type="button"
                onClick={() => onCancel(inv.id)}
                disabled={cancellingId === inv.id}
                aria-label={`${inv.email} 초대 취소`}
                style={{ ...SMALL_BTN_STYLE, color: 'var(--exp-text)' }}
              >
                취소
              </button>
            </li>
          ))}
        </ul>
      )}
      <div id="share-invite-email-help" style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 8, lineHeight: 1.6 }}>
        메일은 보내지 않아요. 모닛에 가입한 사람에게만 앱 알림으로 가고, 초대는 7일 동안 유효해요.
      </div>
    </section>
  )
}
