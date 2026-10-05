// 환전 등록 모달. GET /accounts + POST /exchanges에 연결돼 있다.
// z-index 80, 너비 440px, maxHeight 86vh.
//
// 입력 규칙:
// - side(원→외/외→원)와 exchangedAt(환전일)은 CreateExchangeRequest의 필수 필드다.
// 환전일은 DatePicker로 고르고 기본값은 오늘이다(QuickStockModal과 같은 패턴).
// - krwAmount는 사용자가 직접 입력하지 않고 foreignAmount × rate로 자동 계산해 캡션으로 보여준다 —
// 두 값을 각각 입력하게 하면 외화금액·환율·원화금액 세 숫자가 서로 어긋날 수 있다.
// - 드롭다운 키는 'exchangeAcct'로 분리한다 — QuickStockModal과 'stockAcct' 키를 공유하면 계좌
// 선택이 서로 샌다.
// - 계좌가 0개일 때도 '등록된 계좌가 없어요'에서 막히지 않게 계좌 추가 버튼을 둔다
// (QuickStockModal과 같은 패턴).
// - 달러→원에서 보유 달러(GET /exchanges/summary의 heldForeignAmount — 외화 카드와 같은 값)보다 많이
// 팔아도 **서버는 막지 않는다**(의도된 설계, 2026-09-26 사용자 확인): 100달러를 사서 주식으로 120달러로
// 불렸다면 앱 기록은 100달러지만 실제로는 120달러를 환전할 수 있기 때문이다. 초과분은 보유 달러를
// 음수(−20달러)로 남기고, 그 뒤 원→달러로 다시 사면 결손을 환차손익 없이 0으로 털고 새로 산 달러부터
// 다시 쌓는다(평균 매입 환율도 새 매수분만으로 다시 계산). 그래서 막지 않고, 저장 전에 "주식 수익 등으로
// 불어난 달러가 맞는지" 한 번 확인만 받는다 — 입력 실수(0을 더 친 경우)로 총자산이 크게 틀어지는 걸 막는 용도다.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { assetClassFormPreset } from '../../../data/assetsView'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useEntityDropdown } from '../../../state/selectors/dropdown'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { formatNumber, formatUsd, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToViewingMonth, pickedToISODate, toISODate } from '../../../utils/date'
import { useGetAccounts, type AccountResponse } from '@/services/account'
import { useGetInstitutions } from '@/services/institution'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { accountInstitutionLabel, accountInstitutionMeta } from '../../../data/accountView'
import { useGetExchangeSummary, usePostExchange } from '@/services/exchange'
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
  const isOpen = state.openModal === 'exchangeAdd'
  // 좁은 폭에서 Dropdown/DatePicker 팝오버가 옆 칼럼 밖으로 잘리는 것을 막기 위해 세로로 쌓는다.
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const [side, setSide] = useState<ForeignExchangeSide>('BUY')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [foreignAmountStr, setForeignAmountStr] = useState('')
  const [rateStr, setRateStr] = useState('')
  const [accountMissing, setAccountMissing] = useState(false)
  const [amountMissing, setAmountMissing] = useState(false)
  // 보유 달러 초과 매도 확인창 — 금액·방향을 바꾸면 다시 물어야 하므로 그때마다 닫는다.
  const [overSellConfirmOpen, setOverSellConfirmOpen] = useState(false)

  // 달러를 담는 건 주식 계좌뿐이라 주식 계좌만 받는다(2026-09-26 사용자 결정 — 예전엔 현금·연금 계좌까지 떴다).
  const accountsQuery = useGetAccounts({ type: 'STOCK' }, { enabled: isOpen })
  const accounts = accountsQuery.data ?? []
  const postExchange = usePostExchange()
  // 달러→원일 때만 보유 달러가 필요하다. 조회 실패(환율 미수집 422 포함)면 확인 없이 기존대로 저장한다.
  // 환율 칸 안내 글자(오늘 고시 환율)에도 쓰므로 방향과 무관하게 받는다. 실패(환율 미수집 422 포함)하면
  // 안내 글자는 비우고 보유 확인도 건너뛴다.
  const summaryQuery = useGetExchangeSummary('USD', { enabled: isOpen })
  const heldUsd = side === 'SELL' ? (summaryQuery.data?.heldForeignAmount ?? null) : null
  const currentRate = summaryQuery.data?.currentRate ?? null
  const [memo, setMemo] = useState('')
  // 계좌 드롭다운에 소속 기관(아이콘 + 기관명)을 함께 보여주기 위한 조인 대상.
  // 기관 목록은 React Query 캐시를 다른 화면과 공유하므로 모달을 열 때마다 다시 받지 않는다.
  const institutions = useGetInstitutions({ enabled: isOpen }).data ?? []
  const accountLeadingIcon = (a: AccountResponse, size: number) => {
    const meta = accountInstitutionMeta(a, institutions)
    return meta ? <BankIcon tokenKey={meta.tokenKey} size={size} /> : undefined
  }

  const accountDropdown = useEntityDropdown(
    'exchangeAcct',
    accounts,
    (a) => a.id,
    (a) => a.name,
    accountId,
    (id) => {
      setAccountId(id)
      setAccountMissing(false)
    },
    (a) => accountInstitutionMeta(a, institutions)?.institutionName,
    (a) => accountLeadingIcon(a, 28),
  )
  // 좁은 두 칸 배치에서 '계좌를 선택하세요'가 잘려 '계좌를 선택하...'로 보였다 — 짧게 쓴다.
  const accountDisplayDropdown = { ...accountDropdown, value: accountDropdown.value || '계좌 선택' }
  // 트리거 보조 줄 — 계좌명이 좁은 열에서 잘려도 기관은 아래 줄에 남는다(Dropdown.tsx selectedMeta).
  const selectedAccount = accountId !== null ? accounts.find((a) => a.id === accountId) : undefined

  const todayISO = toISODate(new Date())
  // 미래 환전은 성립하지 않는다 — 서버도 400 FX_DATE_IN_FUTURE로 막지만 입력 단계에서 먼저 막는다.
  const dpExchangeDate = useDatePicker('exchangeDate', isoDateToDisplay(todayISO), isoDateToViewingMonth(todayISO), todayISO)

  if (!isOpen) return null

  const resetAndClose = () => {
    setState((prev) => ({
      openModal: null,
      datePickerPicked: { ...prev.datePickerPicked, exchangeDate: undefined },
      datePickerViewingMonth: { ...prev.datePickerViewingMonth, exchangeDate: undefined },
      openDropdown: null,
    }))
    setSide('BUY')
    setAccountId(null)
    setForeignAmountStr('')
    setRateStr('')
    setAccountMissing(false)
    setAmountMissing(false)
    setOverSellConfirmOpen(false)
    setMemo('')
    postExchange.reset()
  }

  const foreignAmount = Number(foreignAmountStr) || 0
  const rate = Number(rateStr) || 0
  const krwAmountEstimate = Math.round(foreignAmount * rate)
  const isOverSell = side === 'SELL' && heldUsd !== null && foreignAmount > heldUsd
  // 저장 후 외화 카드에 찍힐 보유 달러(음수). 소수 2자리 오차를 없애려고 센트 단위로 뺀다.
  const heldAfterSell = heldUsd !== null ? (Math.round(heldUsd * 100) - Math.round(foreignAmount * 100)) / 100 : null

  const handleSave = (confirmedOverSell = false) => {
    const missingAccount = !accountId
    const missingAmount = !foreignAmountStr || !foreignAmount || !rateStr || !rate
    setAccountMissing(missingAccount)
    setAmountMissing(missingAmount)
    if (missingAccount || missingAmount) return
    if (isOverSell && !confirmedOverSell) {
      setOverSellConfirmOpen(true)
      return
    }

    const picked = state.datePickerPicked['exchangeDate'] as { y: number; m: number; d: number } | undefined
    const exchangedAt = picked ? pickedToISODate(picked) : todayISO

    const body: CreateExchangeRequest = {
      accountId: accountId as number,
      side,
      currency: 'USD',
      foreignAmount,
      krwAmount: krwAmountEstimate,
      rate,
      exchangedAt,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
    }
    postExchange.mutate(body, { onSuccess: resetAndClose })
  }

  // 초과 매도는 서버가 막지 않으므로(헤더 주석) 예전의 FX_INSUFFICIENT_BALANCE 분기는 지웠다.
  const genericError = postExchange.error ? postExchange.error.message : null

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
            <button onClick={() => { setSide('BUY'); setOverSellConfirmOpen(false) }} style={sideTabStyle(side === 'BUY')}>원 → 달러</button>
            <button onClick={() => { setSide('SELL'); setOverSellConfirmOpen(false) }} style={sideTabStyle(side === 'SELL')}>달러 → 원</button>
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
                  setOverSellConfirmOpen(false)
                }}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
            {side === 'SELL' && heldUsd !== null && (
              <div style={{ fontSize: 11.5, color: isOverSell ? 'var(--exp-text)' : 'var(--text-weak)', marginTop: 6 }}>
                보유 달러 {formatUsd(heldUsd)}{isOverSell && ' · 보유보다 많아요'}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={LABEL_STYLE}>적용 환율</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FIELD_BORDER_STYLE }}>
              <input
                type="text" inputMode="decimal"
                // 예전엔 고정값 '1,380.00'이 보여 실제 환율처럼 읽혔다 — 오늘 고시 환율(서버)을 안내로 쓴다.
                placeholder={currentRate ? formatNumber(currentRate) : '0.00'}
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
            원화 환산 총액 <b style={{ color: 'var(--text-strong)' }}>{formatNumber(krwAmountEstimate)}원</b>
          </div>
        )}
        <div style={fieldRowStyle}>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={LABEL_STYLE}>계좌</div>
            {accountsQuery.isPending ? (
              <div aria-busy style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
            ) : accounts.length === 0 ? (
              // 계좌가 하나도 없으면 빈 드롭다운으로 막다른 길을 만들지 않고 바로 계좌 추가로
              // 보낸다(매수/매도 모달 QuickStockModal과 동일한 패턴).
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ ...FIELD_BORDER_STYLE, fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 주식 계좌가 없어요</div>
                <button
                  // 목록이 주식 계좌만이라, 여기서 여는 계좌 추가도 주식 유형을 골라 둔 채로 연다.
                  onClick={() => setState({ openModal: 'addAccount', addAccountReturnTo: 'exchangeAdd', openDropdown: null, accountForm: { ...BLANK_ACCOUNT_FORM, ...assetClassFormPreset('STOCK') } })}
                  className="mini-hov"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Icon name="add" size={15} />
                  계좌 추가
                </button>
              </div>
            ) : (
              <Dropdown
                dropdown={accountDisplayDropdown}
                maxHeight={180}
                selectedMeta={accountInstitutionLabel(selectedAccount, institutions)}
                selectedLeading={selectedAccount && accountLeadingIcon(selectedAccount, 24)}
              />
            )}
            {accountMissing && !accountId && <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 6 }}>계좌를 선택해주세요</div>}
          </div>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <div style={LABEL_STYLE}>환전일</div>
            <DatePicker dp={dpExchangeDate} />
          </div>
        </div>
        <div>
          <div style={LABEL_STYLE}>메모 (선택)</div>
          <input
            type="text" placeholder="예: 여행 경비"
            maxLength={200}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
          />
        </div>
        {genericError && <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{genericError}</div>}
        {overSellConfirmOpen && isOverSell && heldUsd !== null && heldAfterSell !== null && (
          <div role="alertdialog" aria-label="보유 달러 초과 환전 확인" style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>
              보유 달러({formatUsd(heldUsd)})보다 많이 환전할까요?
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-mid)', lineHeight: 1.6 }}>
              주식 수익 등으로 달러가 늘어난 거라면 그대로 저장해도 돼요. 저장하면 보유 달러가{' '}
              <b style={{ color: 'var(--text-strong)' }}>{formatUsd(heldAfterSell)}</b>로 표시되고,
              다음에 달러를 사면 0부터 다시 쌓여요. 금액을 잘못 입력했다면 고쳐주세요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleSave(true)}
                disabled={postExchange.isPending}
                aria-busy={postExchange.isPending}
                className="qbtn"
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: postExchange.isPending ? 'default' : 'pointer', opacity: postExchange.isPending ? 0.7 : 1 }}
              >
                {postExchange.isPending ? '저장 중…' : '맞아요, 저장할게요'}
              </button>
              <button
                onClick={() => setOverSellConfirmOpen(false)}
                disabled={postExchange.isPending}
                className="qbtn"
                style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                금액 다시 볼게요
              </button>
            </div>
          </div>
        )}
        {!overSellConfirmOpen && <button
          onClick={() => handleSave()}
          disabled={postExchange.isPending}
          aria-busy={postExchange.isPending}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: postExchange.isPending ? 'default' : 'pointer', opacity: postExchange.isPending ? 0.7 : 1, transition: 'transform .12s' }}
        >
          {postExchange.isPending ? '저장 중…' : '환전 기록 저장'}
        </button>}
      </div>
    </Modal>
  )
}
