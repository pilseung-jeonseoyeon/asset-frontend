// Source: secret/Asset Manager v14.dc.html L1774-1986 (modalFixedExpense) — transcribed verbatim.
// z-index 80, width 460px, maxHeight 86vh.

import type { FormEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { SegmentedTab } from '../../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../../state/AppStateContext'
import { useCloseModal } from '../../../state/selectors/modal'
import { useDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { acctOptions } from '../../../data/mockAccounts'

function filterAmountInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  const v = target.value.replace(/[^0-9]/g, '')
  target.value = v ? Number(v).toLocaleString('ko-KR') : ''
}

function recurPayDayOptionsFor(freq: string): string[] {
  if (freq === 'weekly') return ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
  if (freq === 'yearly') return Array.from({ length: 12 }, (_, i) => i + 1 + '월 1일')
  return Array.from({ length: 31 }, (_, i) => i + 1 + '일').concat(['말일'])
}
function recurPayDayDefaultFor(freq: string): string {
  return freq === 'weekly' ? '월요일' : freq === 'yearly' ? '1월 1일' : '25일'
}

const RECUR_FREQ_LABELS: Record<string, string> = { weekly: '매주', monthly: '매월', yearly: '매년' }

export function FixedExpenseModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const ddRecurPayMethod = useDropdown('recurPayMethod', acctOptions, '파킹통장')
  const ddRecurDate = useDatePicker('recur', '2026.06.28')

  if (state.modalOpen !== 'fixedExpense') return null

  const recurExpenseCats = state.customCats['지출']
  const recurCatMajorIdx = Math.min(state.recurCatMajorIdx, recurExpenseCats.length - 1)
  const recurCatMajors = recurExpenseCats.map((c) => c.major)
  const recurCatSubsArr = recurExpenseCats[recurCatMajorIdx].subs
  const recurCatSubIdx = Math.min(state.recurCatSubIdx, recurCatSubsArr.length - 1)

  const ddRecurCatMajor = {
    value: recurCatMajors[recurCatMajorIdx],
    open: state.openDropdown === 'recurCatMajor',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurCatMajor' ? null : 'recurCatMajor' })),
    options: recurCatMajors.map((m) => ({
      name: m,
      pick: () => {
        const idx = recurExpenseCats.findIndex((c) => c.major === m)
        setState({ recurCatMajorIdx: idx < 0 ? 0 : idx, recurCatSubIdx: 0, openDropdown: null })
      },
    })),
  }
  const ddRecurCatSub = {
    value: recurCatSubsArr[recurCatSubIdx],
    open: state.openDropdown === 'recurCatSub',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurCatSub' ? null : 'recurCatSub' })),
    options: recurCatSubsArr.map((sub) => ({
      name: sub,
      pick: () => setState({ recurCatSubIdx: recurCatSubsArr.indexOf(sub), openDropdown: null }),
    })),
  }
  const ddRecurFreq = {
    value: RECUR_FREQ_LABELS[state.recurFreq] || '매월',
    open: state.openDropdown === 'recurFreq',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurFreq' ? null : 'recurFreq' })),
    options: Object.keys(RECUR_FREQ_LABELS).map((key) => ({
      name: RECUR_FREQ_LABELS[key],
      pick: () => setState({ recurFreq: key, recurPayDay: recurPayDayDefaultFor(key), openDropdown: null }),
    })),
  }
  const ddRecurPayDay = {
    value: state.recurPayDay,
    open: state.openDropdown === 'recurPayDay',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurPayDay' ? null : 'recurPayDay' })),
    options: recurPayDayOptionsFor(state.recurFreq).map((pd) => ({
      name: pd,
      pick: () => setState({ recurPayDay: pd, openDropdown: null }),
    })),
  }
  const ddRecurYearMonth = {
    value: state.recurYearMonth,
    open: state.openDropdown === 'recurYearMonth',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurYearMonth' ? null : 'recurYearMonth' })),
    options: Array.from({ length: 12 }, (_, i) => i + 1 + '월').map((m) => ({
      name: m,
      pick: () => setState({ recurYearMonth: m, openDropdown: null }),
    })),
  }
  const ddRecurYearDay = {
    value: state.recurYearDay,
    open: state.openDropdown === 'recurYearDay',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'recurYearDay' ? null : 'recurYearDay' })),
    options: Array.from({ length: 31 }, (_, i) => i + 1 + '일').map((d) => ({
      name: d,
      pick: () => setState({ recurYearDay: d, openDropdown: null }),
    })),
  }
  const recurFreqYearly = state.recurFreq === 'yearly'
  const recurFreqWeekly = state.recurFreq === 'weekly'
  const recurFreqNotYearly = !recurFreqYearly
  const recurPayDayLabel = recurFreqWeekly ? '요일' : '결제일'

  const recurEditing = !!state.editingRecurId
  const recurModalTitle = recurEditing ? (state.recurringType === 'fixed' ? '고정 지출 수정' : '구독 수정') : '고정 지출 · 구독 추가'
  const recurNamePlaceholder = state.recurringType === 'fixed' ? '예: 실손의료보험' : '예: 넷플릭스'
  const recurSaveLabel = state.recurringType === 'fixed' ? '고정 지출 저장' : '구독 저장'

  const endRecurring = () => {
    if (state.editingRecurId === 'fixed-0') setState({ fixedExpenseEnded: true, modalOpen: null, editingRecurId: null })
    else if (state.editingRecurId) setState((st) => ({ endedSubIds: [...st.endedSubIds, st.editingRecurId as string], modalOpen: null, editingRecurId: null }))
  }

  return (
    <Modal onClose={closeModal} zIndex={80} width={460} panelStyle={{ maxHeight: '86vh' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="event_repeat" size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>{recurModalTitle}</div>
        </div>
        <button
          onClick={closeModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!recurEditing && (
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
            <SegmentedTab active={state.recurringType === 'fixed'} onClick={() => setState({ recurringType: 'fixed' })} style={{ flex: 1 }}>
              고정 지출
            </SegmentedTab>
            <SegmentedTab active={state.recurringType === 'subscription'} onClick={() => setState({ recurringType: 'subscription' })} style={{ flex: 1 }}>
              구독
            </SegmentedTab>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>이름</div>
          <input
            type="text" placeholder={recurNamePlaceholder}
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" placeholder="0" onInput={filterAmountInput}
              style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>카테고리</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Dropdown dd={ddRecurCatMajor} maxHeight={200} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <Dropdown dd={ddRecurCatSub} maxHeight={200} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>반복 주기</div>
            <div style={{ position: 'relative' }}>
              <Dropdown dd={ddRecurFreq} maxHeight={200} />
            </div>
          </div>
          {recurFreqNotYearly && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>{recurPayDayLabel}</div>
              <div style={{ position: 'relative' }}>
                <Dropdown dd={ddRecurPayDay} maxHeight={200} />
              </div>
            </div>
          )}
          {recurFreqYearly && (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>결제월</div>
                <div style={{ position: 'relative' }}>
                  <Dropdown dd={ddRecurYearMonth} maxHeight={200} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>결제일</div>
                <div style={{ position: 'relative' }}>
                  <Dropdown dd={ddRecurYearDay} maxHeight={200} />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>시작 날짜</div>
          <DatePicker dp={ddRecurDate} />
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>결제수단</div>
          <Dropdown
            dd={ddRecurPayMethod}
            maxHeight={220}
            footer={
              <>
                <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                <button
                  className="mini-hov"
                  onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'fixedExpense' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Icon name="add" size={15} />
                  계좌 추가
                </button>
              </>
            }
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={closeModal}
            className="qbtn"
            style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            {recurSaveLabel}
          </button>
          {recurEditing && (
            <button
              onClick={endRecurring}
              className="qbtn"
              style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              종료
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
