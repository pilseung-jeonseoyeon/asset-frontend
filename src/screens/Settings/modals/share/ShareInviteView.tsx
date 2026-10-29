// 1단계 · 구성원 초대(초대하는 사람, v17 시안). 6자리 코드 · 남은 시간 · 진행 바 · 새 코드 발급 · 코드 복사.
// 창이 열려 있는 동안 코드가 만료되면 ShareFlowModal이 새 코드를 자동으로 받는다.

import { Icon } from '../../../../components/primitives/Icon/Icon'
import { SHARE_CODE_LENGTH, SHARE_CODE_TTL_MS, formatRemaining } from '../../../../data/shareView'
import { FlowHeader, StepBars } from './shareParts'
import { ERROR_TEXT_STYLE, SMALL_BTN_STYLE } from './shareStyles'

interface ShareInviteViewProps {
  code: string | null
  remainingMs: number
  copied: boolean
  busy: boolean
  error: string | null
  onBack: () => void
  onClose: () => void
  onReissue: () => void
  onCopy: () => void
}

export function ShareInviteView({ code, remainingMs, copied, busy, error, onBack, onClose, onReissue, onCopy }: ShareInviteViewProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px', marginTop: 20 }}>
        <Icon name="hourglass_top" size={20} color="var(--text-weak)" style={{ flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>수락을 기다리고 있어요</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2, lineHeight: 1.5 }}>
            상대방이 코드를 입력하고 수락하면 알림으로 알려드려요. 이 창을 닫아도 초대는 유지돼요.
          </div>
        </div>
      </div>
    </>
  )
}
