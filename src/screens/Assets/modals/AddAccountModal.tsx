// Source: secret/Asset Manager v14.dc.html L1379-1452 (modalAddAccount) — layout transcribed verbatim,
// then wired to POST /accounts (contents were previously uncontrolled/no-op — see git history). z-index
// 90 (NOT 80 — confirmed per-instance, this modal can be opened from within another modal via
// openAddAccountFrom{Entry,Stock,Recur}, hence the higher stacking). closeAddAccount returns to
// `addAccountReturnTo` (whatever modal opened this one) instead of just closing (L4513).
//
// 자산 유형 칩은 원본의 한글 6분류가 아니라 실제 서버 AccountType(10종)을 그대로 쓴다 — 한글 6분류는
// 서버 스펙 어디에도 매핑 규칙이 없어 임의로 짜맞추지 않는다(라벨은 src/data/assetsView.ts 참고).

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { fmt, parseAmount, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate } from '../../../utils/date'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ORDER } from '../../../data/assetsView'
import { useGetInstitutions } from '@/services/institution'
import { usePostAccount } from '@/services/account'
import type { CreateAccountRequest } from '@/services/account'
import type { Currency } from '@/services/common.type'

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'KRW', label: '원화 (KRW)' },
  { value: 'USD', label: '달러 (USD)' },
]

export function AddAccountModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'addAccount'
  const form = state.accountForm
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })
  const institutions = institutionsQuery.data ?? []
  const postAccount = usePostAccount()
  // 좁은 폭에서는 절반씩 나눈 두 필드(특히 Dropdown/DatePicker 팝오버)가 서로를 가리거나 잘리므로
  // 세로로 쌓는다 — 데스크톱은 기존 그대로 좌우 2열.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const ddInstitution = useEntityDropdown(
    'addAcctInst',
    institutions,
    (i) => i.id,
    (i) => i.name,
    form.institutionId,
    (id) => setState((st) => ({ accountForm: { ...st.accountForm, institutionId: id } })),
  )
  const ddInstitutionDisplay = { ...ddInstitution, value: ddInstitution.value || '선택 안 함' }

  const dpOpened = useDatePicker(
    'addAccountOpened',
    form.openedAt ? isoDateToDisplay(form.openedAt) : '선택 안 함',
    isoDateToNav(form.openedAt),
  )
  const dpMaturity = useDatePicker(
    'addAccountMaturity',
    form.maturityDate ? isoDateToDisplay(form.maturityDate) : '선택 안 함',
    isoDateToNav(form.maturityDate),
  )
  const [nameInvalid, setNameInvalid] = useState(false)

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: st.addAccountReturnTo,
      addAccountReturnTo: null,
      accountForm: BLANK_ACCOUNT_FORM,
      dpPicked: { ...st.dpPicked, addAccountOpened: undefined, addAccountMaturity: undefined },
      dpNav: { ...st.dpNav, addAccountOpened: undefined, addAccountMaturity: undefined },
      openDropdown: null,
    }))
    // 이 모달은 AppShell에 항상 마운트되어 있어 닫아도 언마운트되지 않는다. 로컬 상태와 mutation
    // 에러를 직접 지우지 않으면 다음에 "계좌 추가"를 열었을 때 지난 실패 메시지가 그대로 보인다.
    setNameInvalid(false)
    postAccount.reset()
  }

  const patchForm = (patch: Partial<typeof form>) =>
    setState((st) => ({ accountForm: { ...st.accountForm, ...patch } }))

  const handleSave = () => {
    if (!form.name.trim()) {
      setNameInvalid(true)
      return
    }
    setNameInvalid(false)

    const openedPicked = state.dpPicked['addAccountOpened'] as { y: number; m: number; d: number } | undefined
    const maturityPicked = state.dpPicked['addAccountMaturity'] as { y: number; m: number; d: number } | undefined
    const openedAt = openedPicked ? pickedToISODate(openedPicked) : (form.openedAt ?? undefined)
    const maturityDate = maturityPicked ? pickedToISODate(maturityPicked) : (form.maturityDate ?? undefined)

    const body: CreateAccountRequest = {
      name: form.name.trim(),
      type: form.type,
      currency: form.currency,
      initialBalance: form.initialBalance,
      isLiquid: form.isLiquid,
      ...(form.institutionId !== null ? { institutionId: form.institutionId } : {}),
      ...(form.interestRate !== null ? { interestRate: form.interestRate } : {}),
      ...(openedAt ? { openedAt } : {}),
      ...(maturityDate ? { maturityDate } : {}),
    }

    postAccount.mutate(body, { onSuccess: resetAndClose })
  }

  return (
    <Modal onClose={resetAndClose} zIndex={90} width={480} panelStyle={{ maxHeight: '90vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="account_balance" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>계좌 추가</div>
        </div>
        <button
          onClick={resetAndClose}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={LABEL_STYLE}>자산 유형</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ACCOUNT_TYPE_ORDER.map((t) => (
              <button key={t} className="mini-hov" onClick={() => patchForm({ type: t })} style={chipStyle(form.type === t)}>
                {ACCOUNT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={LABEL_STYLE}>계좌 이름</div>
          <input
            type="text" placeholder="예: 파킹통장"
            value={form.name}
            onChange={(e) => {
              patchForm({ name: e.target.value })
              if (nameInvalid) setNameInvalid(false)
            }}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
          {nameInvalid && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌 이름을 입력해주세요</div>}
        </div>
        <div>
          <div style={LABEL_STYLE}>통화</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {CURRENCY_OPTIONS.map((c) => (
              <button key={c.value} className="mini-hov" onClick={() => patchForm({ currency: c.value })} style={chipStyle(form.currency === c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div style={fieldRowStyle}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>금융기관 (선택)</div>
            {institutionsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 13.5, color: 'var(--text-weak)' }}>—</div>
            ) : institutions.length === 0 ? (
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>
                등록된 금융기관이 없어요
              </div>
            ) : (
              <Dropdown dd={ddInstitutionDisplay} maxHeight={220} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>현재 잔액</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{form.currency === 'KRW' ? '₩' : '$'}</span>
              <input
                type="text" placeholder="0"
                value={form.initialBalance ? fmt(form.initialBalance) : ''}
                onChange={(e) => patchForm({ initialBalance: parseAmount(e.target.value) })}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>
        <div>
          <div style={LABEL_STYLE}>유동성 여부</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([{ label: '유동성 있음', val: true }, { label: '유동성 없음', val: false }] as const).map((n) => (
              <button key={n.label} className="mini-hov" onClick={() => patchForm({ isLiquid: n.val })} style={chipStyle(form.isLiquid === n.val)}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div style={fieldRowStyle}>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>이자율 % (선택)</div>
            <input
              type="text" inputMode="decimal" placeholder="0.00"
              value={form.interestRate === null ? '' : String(form.interestRate)}
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value, 2)
                patchForm({ interestRate: sanitized === '' ? null : Number(sanitized) })
              }}
              style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>개설일 (선택)</div>
            <DatePicker dp={dpOpened} />
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={LABEL_STYLE}>만기일 (선택)</div>
          <DatePicker dp={dpMaturity} />
        </div>
        {postAccount.error && (
          <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{postAccount.error.message}</div>
        )}
        <button
          onClick={handleSave}
          disabled={postAccount.isPending}
          aria-busy={postAccount.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postAccount.isPending ? 'default' : 'pointer', opacity: postAccount.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postAccount.isPending ? '저장 중…' : '계좌 추가'}
        </button>
      </div>
    </Modal>
  )
}
