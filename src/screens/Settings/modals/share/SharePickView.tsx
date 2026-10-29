// 3단계 · 공유할 계좌 선택(v17 시안). 연결 직후 처음 설정(onboard)과 홈의 '공유 계좌 관리'(manage)가 같은 창이다.
// 현금 · 예적금 계좌만 고를 수 있고, 고른 계좌마다 '이전 내역도 함께 공유'를 켜고 끈다.

import { BankIcon } from '../../../../components/primitives/BankIcon/BankIcon'
import { Icon } from '../../../../components/primitives/Icon/Icon'
import { ACCOUNT_TYPE_LABELS } from '../../../../data/assetsView'
import { accountInstitutionMeta } from '../../../../data/accountView'
import { isShareableAccountType, shareHistoryCaption } from '../../../../data/shareView'
import { formatKrw } from '../../../../utils/format'
import { FlowHeader, StepBars } from './shareParts'
import { ERROR_TEXT_STYLE, PRIMARY_BTN_DISABLED_STYLE, PRIMARY_BTN_STYLE, SECONDARY_BTN_STYLE } from './shareStyles'
import type { AccountResponse } from '@/services/account'
import type { AccountType } from '@/services/common.type'
import type { InstitutionResponse } from '@/services/institution'

/** 고른 계좌 id → 이전 내역 포함 여부 */
export type SharePickDraft = ReadonlyMap<number, boolean>

const GROUPS: { type: AccountType; icon: string }[] = [
  { type: 'CASH', icon: 'wallet' },
  { type: 'DEPOSIT', icon: 'savings' },
]
const LOCKED_ORDER: AccountType[] = ['STOCK', 'CRYPTO', 'PENSION_ETC']

function CheckBox({ on, size }: { on: boolean; size: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: on ? 'none' : '1.5px solid var(--border)', background: on ? 'var(--accent)' : 'var(--surface)', color: '#fff',
      }}
    >
      {on && <Icon name="check" size={size - 5} />}
    </span>
  )
}

interface SharePickViewProps {
  mode: 'onboard' | 'manage'
  /** 내 계좌 전부(GET /accounts, ALL) */
  accounts: AccountResponse[]
  institutions: InstitutionResponse[]
  draft: SharePickDraft
  spaceName: string
  partnerName: string | null
  busy: boolean
  error: string | null
  onChange: (draft: SharePickDraft) => void
  onSave: () => void
  onBack: () => void
  onLater: () => void
  onClose: () => void
}

export function SharePickView(props: SharePickViewProps) {
  const { mode, accounts, institutions, draft } = props
  const open = accounts.filter((a) => a.closedAt === null)
  const pickable = open.filter((a) => isShareableAccountType(a.type))
  const locked = LOCKED_ORDER.map((t) => ({ t, n: open.filter((a) => a.type === t).length })).filter((x) => x.n > 0)
  const ids = [...draft.keys()]
  const allHistory = ids.length > 0 && ids.every((id) => draft.get(id))
  const canSave = mode === 'manage' || ids.length > 0

  const toggle = (id: number) => {
    const next = new Map(draft)
    if (next.has(id)) next.delete(id)
    else next.set(id, false)
    props.onChange(next)
  }
  const toggleHistory = (id: number) => {
    const next = new Map(draft)
    next.set(id, !next.get(id))
    props.onChange(next)
  }
  const toggleAllHistory = () => {
    const next = new Map<number, boolean>()
    ids.forEach((id) => next.set(id, !allHistory))
    props.onChange(next)
  }

  return (
    <>
      <FlowHeader
        title="공유할 계좌 선택"
        subtitle={`'${props.spaceName}'에서 ${props.partnerName ?? '상대'}님과 함께 볼 계좌를 골라주세요`}
        onBack={mode === 'manage' ? props.onBack : undefined}
        icon={mode === 'onboard' ? 'checklist' : undefined}
        onClose={props.onClose}
      />
      {mode === 'onboard' && <StepBars step={3} />}
      {pickable.length === 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)', lineHeight: 1.6, padding: '8px 0 14px' }}>
          공유할 수 있는 현금 · 예적금 계좌가 없어요. 계좌를 추가한 뒤 다시 골라주세요.
        </div>
      )}
      {GROUPS.map((g) => {
        const rows = pickable.filter((a) => a.type === g.type)
        if (rows.length === 0) return null
        return (
          <div key={g.type} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8 }}>
              <Icon name={g.icon} size={16} color="var(--text-weak)" />
              {ACCOUNT_TYPE_LABELS[g.type]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((a) => {
                const on = draft.has(a.id)
                const history = on && !!draft.get(a.id)
                const meta = accountInstitutionMeta(a, institutions)
                return (
                  <div key={a.id} style={{ border: `0.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(a.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', minHeight: 56, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: 'var(--text-strong)' }}
                    >
                      <CheckBox on={on} size={20} />
                      {meta ? (
                        <BankIcon tokenKey={meta.tokenKey} size={30} />
                      ) : (
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--track)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <Icon name={g.icon} size={17} />
                        </span>
                      )}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{a.institutionName ?? '기관 없음'}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatKrw(a.balanceKrw)}
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-weak)' }}>원</span>
                      </span>
                    </button>
                    {on && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={history}
                        onClick={() => toggleHistory(a.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', minHeight: 44, border: 'none', borderTop: '0.5px solid var(--border)', background: 'var(--fill-subtle)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', flexWrap: 'wrap' }}
                      >
                        <CheckBox on={history} size={18} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>이전 내역도 함께 공유</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-weak)', textAlign: 'right' }}>{shareHistoryCaption(history)}</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {ids.length > 0 && (
        <button
          type="button"
          role="checkbox"
          aria-checked={allHistory}
          onClick={toggleAllHistory}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', minHeight: 44, borderRadius: 10, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, textAlign: 'left' }}
        >
          선택한 계좌 모두 이전 내역 함께 공유
          <CheckBox on={allHistory} size={18} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'var(--fill-subtle)', borderRadius: 10, padding: '13px 14px', marginTop: 12 }}>
        <Icon name="lock" size={16} color="var(--text-weak)" style={{ flex: 'none' }} />
        <div style={{ fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
          현금 · 예적금 계좌만 공유할 수 있어요
          {locked.length > 0 && (
            <div style={{ color: 'var(--text-weak)' }}>공유 불가 · {locked.map((x) => `${ACCOUNT_TYPE_LABELS[x.t]} ${x.n}개`).join(' · ')}</div>
          )}
        </div>
      </div>
      {props.error && <div role="alert" style={ERROR_TEXT_STYLE}>{props.error}</div>}
      <div style={{ marginTop: 22 }}>
        <button type="button" className="pill-btn" onClick={props.onSave} disabled={!canSave || props.busy} style={canSave && !props.busy ? PRIMARY_BTN_STYLE : PRIMARY_BTN_DISABLED_STYLE}>
          {props.busy ? '저장하는 중…' : mode === 'manage' ? '변경사항 저장' : ids.length > 0 ? `${ids.length}개 계좌 공유하기` : '공유할 계좌를 선택해 주세요'}
        </button>
      </div>
      {mode === 'onboard' && (
        <button type="button" className="pill-btn" onClick={props.onLater} style={{ ...SECONDARY_BTN_STYLE, marginTop: 8 }}>
          나중에 할게요
        </button>
      )}
    </>
  )
}
