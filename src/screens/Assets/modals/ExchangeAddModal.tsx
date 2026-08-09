// Source: secret/Asset Manager v14.dc.html L1315-1376 (modalExchangeAdd) — layout transcribed verbatim,
// then wired to GET /accounts / POST /exchanges (previously uncontrolled/no-op mock inputs — see git
// history). z-index 80, width 440px, maxHeight 86vh.
//
// Adapted vs. source:
//  - side(원→외/외→원) 선택이 원본 UI에 없었다 — CreateExchangeRequest가 필수로 받는 필드라 추가했다.
//  - exchangedAt(환전일) 선택이 원본 UI에 없었다 — 마찬가지로 필수 필드라 DatePicker를 추가했다
//    (QuickStockModal과 동일한 패턴, 기본값 오늘).
//  - krwAmount는 사용자가 직접 입력하지 않고 foreignAmount × rate로 자동 계산해 캡션으로 보여준다 —
//    두 값을 각각 입력하게 하면 외화금액·환율·원화금액 세 숫자가 서로 어긋날 수 있다.
//  - 드롭다운 키를 'exchangeAcct'로 분리했다 — 과거 QuickStockModal과 'stockAcct' 키를 공유해 계좌
//    선택이 서로 새던 버그(CLAUDE.md/과제 지시)를 피하기 위함이다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { fmt, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { usePostExchange } from '@/services/exchange'
import type { CreateExchangeRequest } from '@/services/exchange'
import type { ForeignExchangeSide } from '@/services/common.type'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }

function sideTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)', boxShadow: 'none',
  }
}

export function ExchangeAddModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'exchangeAdd'
  // 좁은 폭에서 Dropdown/DatePicker 팝오버가 옆 칼럼 밖으로 잘리는 것을 막기 위해 세로로 쌓는다.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const [side, setSide] = useState<ForeignExchangeSide>('BUY')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [foreignAmountStr, setForeignAmountStr] = useState('')
  const [rateStr, setRateStr] = useState('')
  const [accountMissing, setAccountMissing] = useState(false)
  const [amountMissing, setAmountMissing] = useState(false)

  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const postExchange = usePostExchange()

  const ddAccount = useEntityDropdown(
    'exchangeAcct',
    accounts,
    (a) => a.id,
    (a) => a.name,
    accountId,
    (id) => {
      setAccountId(id)
      setAccountMissing(false)
    },
  )
  const ddAccountDisplay = { ...ddAccount, value: ddAccount.value || '계좌를 선택하세요' }

  const todayISO = toISODate(new Date())
  const dpExchangeDate = useDatePicker('exchangeDate', isoDateToDisplay(todayISO), isoDateToNav(todayISO))

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((st) => ({
      modalOpen: null,
      dpPicked: { ...st.dpPicked, exchangeDate: undefined },
      dpNav: { ...st.dpNav, exchangeDate: undefined },
      openDropdown: null,
    }))
    setSide('BUY')
    setAccountId(null)
    setForeignAmountStr('')
    setRateStr('')
    setAccountMissing(false)
    setAmountMissing(false)
    postExchange.reset()
  }

  const foreignAmount = Number(foreignAmountStr) || 0
  const rate = Number(rateStr) || 0
  const krwAmountEstimate = Math.round(foreignAmount * rate)

  const handleSave = () => {
    const missingAccount = !accountId
    const missingAmount = !foreignAmountStr || !foreignAmount || !rateStr || !rate
    setAccountMissing(missingAccount)
    setAmountMissing(missingAmount)
    if (missingAccount || missingAmount) return

    const picked = state.dpPicked['exchangeDate'] as { y: number; m: number; d: number } | undefined
    const exchangedAt = picked ? pickedToISODate(picked) : todayISO

    const body: CreateExchangeRequest = {
      accountId: accountId as number,
      side,
      currency: 'USD',
      foreignAmount,
      krwAmount: krwAmountEstimate,
      rate,
      exchangedAt,
    }
    postExchange.mutate(body, { onSuccess: resetAndClose })
  }

  const insufficientBalance = postExchange.error instanceof ApiError && postExchange.error.code === 'FX_INSUFFICIENT_BALANCE'
  const genericError = postExchange.error && !insufficientBalance ? postExchange.error.message : null

  return (
    <Modal onClose={resetAndClose} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <ModalHeader icon="currency_exchange" title="환전 추가" onClose={resetAndClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={LABEL_STYLE}>환전 방향</div>
          <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
            <button onClick={() => setSide('BUY')} style={sideTabStyle(side === 'BUY')}>원 → 달러</button>
            <button onClick={() => setSide('SELL')} style={sideTabStyle(side === 'SELL')}>달러 → 원</button>
          </div>
        </div>
        <div style={fieldRowStyle}>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>{side === 'BUY' ? '매수 금액 (USD)' : '매도 금액 (USD)'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>$</span>
              <input
                type="text" inputMode="decimal" placeholder="0.00"
                value={foreignAmountStr}
                onChange={(e) => {
                  setForeignAmountStr(sanitizeDecimalInput(e.target.value, 2))
                  setAmountMissing(false)
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            {insufficientBalance && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>보유 외화보다 많이 팔 수 없어요</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>적용 환율</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <input
                type="text" inputMode="decimal" placeholder="1,380.00"
                value={rateStr}
                onChange={(e) => {
                  setRateStr(sanitizeDecimalInput(e.target.value, 2))
                  setAmountMissing(false)
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-weak)' }}>원</span>
            </div>
          </div>
        </div>
        {amountMissing && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>금액과 환율을 입력해주세요</div>}
        {!!krwAmountEstimate && (
          <div style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>
            원화 환산 총액 <b style={{ color: 'var(--text-strong)' }}>{fmt(krwAmountEstimate)}원</b>
          </div>
        )}
        <div style={fieldRowStyle}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>계좌</div>
            {accountsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : accounts.length === 0 ? (
              <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 계좌가 없어요</div>
            ) : (
              <Dropdown dd={ddAccountDisplay} maxHeight={180} />
            )}
            {accountMissing && !accountId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌를 선택해주세요</div>}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={LABEL_STYLE}>환전일</div>
            <DatePicker dp={dpExchangeDate} />
          </div>
        </div>
        {genericError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{genericError}</div>}
        <button
          onClick={handleSave}
          disabled={postExchange.isPending}
          aria-busy={postExchange.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postExchange.isPending ? 'default' : 'pointer', opacity: postExchange.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postExchange.isPending ? '저장 중…' : '환전 기록 저장'}
        </button>
      </div>
    </Modal>
  )
}
