// Source: secret/Asset Manager v14.dc.html L1605-1771 (modalLedgerEntry) — transcribed verbatim.
// z-index 80, width 480px, maxHeight 86vh (confirmed per-instance, NOT the 90vh some other modals use).

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
import { fmt } from '../../../utils/format'
import { accounts, acctOptions } from '../../../data/mockAccounts'
import type { EntryType } from '../../../state/types'

function filterAmountInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  const v = target.value.replace(/[^0-9]/g, '')
  target.value = v ? Number(v).toLocaleString('ko-KR') : ''
}

const CONTENT_PLACEHOLDER: Record<EntryType, string> = {
  income: '급여, 상여, 이자 등',
  expense: '어디에 썼는지 적어주세요',
  saving: '적금 자동이체, 목돈 이체 등',
  transfer: '증권계좌 출금, 계좌 간 이동 등',
}

const ENTRY_CAT_KEY_MAP: Record<string, string> = { income: '수입', saving: '저축', expense: '지출' }

export function LedgerEntryModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()

  if (state.modalOpen !== 'ledgerEntry') return null

  const entryType = state.entryType
  const entryCatKey = ENTRY_CAT_KEY_MAP[entryType] || '수입'
  const entryCatList = state.customCats[entryCatKey]
  const entryCatMajorIdxClamped = Math.min(state.entryCatMajorIdx, entryCatList.length - 1)
  const entryCatMajors = entryCatList.map((c) => c.major)
  const entryCatSubsArr = entryCatList[entryCatMajorIdxClamped].subs
  const entryCatSubIdxClamped = Math.min(state.entryCatSubIdx, entryCatSubsArr.length - 1)
  const entryCatMajorVal = entryCatMajors[entryCatMajorIdxClamped]
  const entryCatSubVal = entryCatSubsArr[entryCatSubIdxClamped]

  const ddEntryCatMajor = {
    value: entryCatMajorVal,
    open: state.openDropdown === 'entryCatMajor',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'entryCatMajor' ? null : 'entryCatMajor' })),
    options: entryCatMajors.map((m) => ({
      name: m,
      pick: () => {
        const idx = entryCatList.findIndex((c) => c.major === m)
        setState({ entryCatMajorIdx: idx < 0 ? 0 : idx, entryCatSubIdx: 0, openDropdown: null })
      },
    })),
  }
  const ddEntryCatSub = {
    value: entryCatSubVal,
    open: state.openDropdown === 'entryCatSub',
    toggle: () => setState((st) => ({ openDropdown: st.openDropdown === 'entryCatSub' ? null : 'entryCatSub' })),
    options: entryCatSubsArr.map((sub) => ({
      name: sub,
      pick: () => setState({ entryCatSubIdx: entryCatSubsArr.indexOf(sub), openDropdown: null }),
    })),
  }

  const ddWithdrawAcct = useDropdown('withdrawAcct', acctOptions, '파킹통장')
  const ddLedgerEntryAcct = useDropdown('ledgerEntryAcct', acctOptions, '파킹통장')
  const ddEntryDate = useDatePicker('entry', state.entryDateOverride || '2026.06.28')

  const withdrawAcctObj = accounts.find((a) => a.name.indexOf(ddWithdrawAcct.value) === 0 || ddWithdrawAcct.value.indexOf(a.name) === 0)
  const showInvestBreakdown = entryType === 'transfer' && !!(withdrawAcctObj && withdrawAcctObj.group === '주식 · 투자')
  const investGainFmt = fmt(8000000) + '원'
  const investPrincipalFmt = fmt(12000000) + '원'

  const entryModalIcon = entryType === 'income' ? 'payments' : entryType === 'saving' ? 'savings' : entryType === 'transfer' ? 'sync_alt' : 'edit_note'
  const entryTitle = state.editingTx
    ? '내역 수정'
    : state.entryTabsVisible
      ? '가계부 입력'
      : entryType === 'income' ? '수입 입력' : entryType === 'saving' ? '저축 입력' : entryType === 'transfer' ? '이체 입력' : '지출 입력'
  const entryCatVisible = entryType !== 'transfer'
  const entryShowWithdraw = entryType === 'saving' || entryType === 'transfer'
  const ledgerEntryAcctLabel = entryType === 'saving' ? '저축처' : entryType === 'transfer' ? '입금계좌' : '계좌'
  const entrySaveLabel = entryType === 'income' ? '수입 저장' : entryType === 'saving' ? '저축 저장' : entryType === 'transfer' ? '이체 저장' : '지출 저장'

  const setEntryType = (t: EntryType) => setState({ entryType: t, entryCatMajorIdx: 0, entryCatSubIdx: 0 })

  const deleteTx = () =>
    setState((st) => ({ deletedTxKeys: [...st.deletedTxKeys, st.editingTxKey as string], modalOpen: null, editingTx: false, editingTxKey: null }))

  return (
    <Modal onClose={closeModal} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={entryModalIcon} size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{entryTitle}</div>
        </div>
        <button
          onClick={closeModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {state.entryTabsVisible && (
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
            <SegmentedTab active={entryType === 'income'} onClick={() => setEntryType('income')} style={{ flex: 1 }}>수입</SegmentedTab>
            <SegmentedTab active={entryType === 'expense'} onClick={() => setEntryType('expense')} style={{ flex: 1 }}>지출</SegmentedTab>
            <SegmentedTab active={entryType === 'saving'} onClick={() => setEntryType('saving')} style={{ flex: 1 }}>저축</SegmentedTab>
            <SegmentedTab active={entryType === 'transfer'} onClick={() => setEntryType('transfer')} style={{ flex: 1 }}>이체</SegmentedTab>
          </div>
        )}

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>금액</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-weak)' }}>₩</span>
            <input
              type="text" placeholder="0" onInput={filterAmountInput}
              style={{ border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>내용</div>
          <input
            type="text" placeholder={CONTENT_PLACEHOLDER[entryType]}
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>

        {entryCatVisible && (
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>카테고리</div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Dropdown dd={ddEntryCatMajor} maxHeight={200} />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <Dropdown dd={ddEntryCatSub} maxHeight={200} />
              </div>
            </div>
          </div>
        )}

        {entryShowWithdraw && (
          <>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>출금계좌</div>
              <Dropdown dd={ddWithdrawAcct} maxHeight={180} />
            </div>
            {showInvestBreakdown && (
              <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>투자 수익</span>
                  <span>{investGainFmt}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span>원금 회수</span>
                  <span>{investPrincipalFmt}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>{ledgerEntryAcctLabel}</div>
            <Dropdown
              dd={ddLedgerEntryAcct}
              maxHeight={180}
              footer={
                <>
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'ledgerEntry' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <Icon name="add" size={15} />
                    계좌 추가
                  </button>
                </>
              }
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>날짜</div>
            <DatePicker dp={ddEntryDate} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={closeModal}
            className="qbtn"
            style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
          >
            {entrySaveLabel}
          </button>
          {state.editingTx && (
            <button
              onClick={deleteTx}
              className="qbtn"
              style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
