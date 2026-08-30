// 환전 내역 목록/수정 모달. GET/PUT/DELETE /exchanges에 연결돼 있다.
// 이 모달이 없으면 환전을 등록해도 화면 어디에도 나타나지 않고 되돌릴 방법도 없다.
// InstitutionsModal과 같은 '목록 ↔ 폼을 한 모달 안에서 토글' 패턴이다:
// state.editingExchangeId가 null이면 목록, 값이 있으면 그 id의 수정 폼.
// z-index 80, 너비 440px(ExchangeAddModal과 같은 톤), maxHeight 86vh.
//
// GET /exchanges는 currency가 선택이라 전 통화를 함께 조회한다 — 저장 시 currency는 'USD'로 고정하는데,
// 이 앱이 다루는 유일한 외화가 USD이기 때문이다.
//
// 주식 화면의 '외화 자산 & 가중 평균 환율' 카드는 GET /exchanges/summary가 422(FX_RATE_NOT_FOUND)면
// 본문 전체가 빈 상태로 막힌다. 이 모달은 summary가 아니라 GET /exchanges(목록)만 쓰므로 summary가
// 실패해도 항상 열리고, 등록해 둔 환전을 최소한 확인·삭제할 수 있다.
//
// UpdateExchangeRequest는 accountId를 받지 않으므로 계좌는 읽기 전용으로 보여준다
// (LedgerEntryModal/TradeEditModal과 같은 이유).

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useDatePicker } from '../../../state/selectors/datePicker'
import { formatNumber, formatKrw, sanitizeDecimalInput } from '../../../utils/format'
import { isoDateToDisplay, isoDateToNav, pickedToISODate, toISODate } from '../../../utils/date'
import { ApiError } from '@/services/api'
import { useGetAccounts } from '@/services/account'
import { useDeleteExchange, useGetExchanges, usePutExchange } from '@/services/exchange'
import type { UpdateExchangeRequest } from '@/services/exchange'
import type { ForeignExchangeSide } from '@/services/common.type'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const LOCKED_FIELD_STYLE: CSSProperties = { ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, color: 'var(--text-weak)' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

function sideTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)', boxShadow: 'none',
  }
}

function sideLabel(side: ForeignExchangeSide): string {
  return side === 'BUY' ? '원 → 달러' : '달러 → 원'
}

export function ExchangeHistoryModal() {
  const { state, setState } = useAppState()
  const isMobile = useIsMobile()
  const isOpen = state.modalOpen === 'exchangeHistory'
  const editingId = state.editingExchangeId
  const fieldRowStyle: CSSProperties = { display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }

  const exchangesQuery = useGetExchanges({}, { enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const putExchange = usePutExchange()
  const deleteExchange = useDeleteExchange()

  const rows = [...exchangesQuery.exchanges].sort((a, b) =>
    a.exchangedAt === b.exchangedAt ? b.id - a.id : b.exchangedAt.localeCompare(a.exchangedAt),
  )
  const editing = editingId !== null ? (rows.find((r) => r.id === editingId) ?? null) : null

  const [side, setSide] = useState<ForeignExchangeSide>('BUY')
  const [foreignAmountStr, setForeignAmountStr] = useState('')
  const [rateStr, setRateStr] = useState('')
  const [amountMissing, setAmountMissing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [syncedId, setSyncedId] = useState<number | null>(null)

  // 저장(PUT) 요청 응답이 도착했을 때 여전히 같은 레코드를 편집 중인지 확인하기 위한 참조. state는
  // 클로저에 갇혀 응답 시점에 최신값이 아닐 수 있어 ref로 별도 추적한다(handleSave 참고).
  const editingIdRef = useRef(editingId)
  useEffect(() => {
    editingIdRef.current = editingId
  }, [editingId])

  const todayISO = toISODate(new Date())
  const dpExchangeDate = useDatePicker(
    'exchangeEditDate',
    isoDateToDisplay(editing?.exchangedAt ?? todayISO),
    isoDateToNav(editing?.exchangedAt ?? null),
    todayISO,
  )

  const putReset = putExchange.reset
  const deleteReset = deleteExchange.reset

  // 폼 초기값 채우기(예외적으로 허용 — docs/state-management.md). 렌더 중 setState 금지라 커밋 후
  // useEffect에서 한다.
  useEffect(() => {
    if (!editing || syncedId === editing.id) return
    setSide(editing.side)
    setForeignAmountStr(String(editing.foreignAmount))
    setRateStr(String(editing.rate))
    setSyncedId(editing.id)
    setAmountMissing(false)
    setDeleteConfirmOpen(false)
    setState((prev) => ({
      datePickerPicked: { ...prev.datePickerPicked, exchangeEditDate: undefined },
      datePickerNav: { ...prev.datePickerNav, exchangeEditDate: undefined },
    }))
    putReset()
    deleteReset()
  }, [editing, syncedId, setState, putReset, deleteReset])

  if (!isOpen) return null

  const closeModal = () => {
    setState((prev) => ({
      modalOpen: null,
      editingExchangeId: null,
      datePickerPicked: { ...prev.datePickerPicked, exchangeEditDate: undefined },
      datePickerNav: { ...prev.datePickerNav, exchangeEditDate: undefined },
      openDropdown: null,
    }))
    setSide('BUY')
    setForeignAmountStr('')
    setRateStr('')
    setAmountMissing(false)
    setDeleteConfirmOpen(false)
    setSyncedId(null)
    putExchange.reset()
    deleteExchange.reset()
  }

  const openEdit = (id: number) => setState({ editingExchangeId: id })
  const backToList = () => {
    setState((prev) => ({
      editingExchangeId: null,
      datePickerPicked: { ...prev.datePickerPicked, exchangeEditDate: undefined },
      datePickerNav: { ...prev.datePickerNav, exchangeEditDate: undefined },
    }))
    setSyncedId(null)
    setAmountMissing(false)
    setDeleteConfirmOpen(false)
    putExchange.reset()
    deleteExchange.reset()
  }

  const foreignAmount = Number(foreignAmountStr) || 0
  const rate = Number(rateStr) || 0
  const krwAmountEstimate = Math.round(foreignAmount * rate)
  const accountName = accountsQuery.data?.find((a) => a.id === editing?.accountId)?.name ?? '—'
  // 로컬 폼 상태가 이 editing 대상으로 아직 동기화되지 않았으면(useEffect가 커밋 후에 돈다) 이전
  // 세션의 값이 한 프레임 보이지 않도록 로딩으로 취급한다.
  const isEditFormReady = editing !== null && syncedId === editing.id

  const handleSave = () => {
    if (!editing) return
    const missingAmount = !foreignAmountStr || !foreignAmount || !rateStr || !rate
    setAmountMissing(missingAmount)
    if (missingAmount) return

    const picked = state.datePickerPicked['exchangeEditDate'] as { y: number; m: number; d: number } | undefined
    const exchangedAt = picked ? pickedToISODate(picked) : editing.exchangedAt

    const body: UpdateExchangeRequest = {
      side,
      currency: 'USD',
      foreignAmount,
      krwAmount: krwAmountEstimate,
      rate,
      exchangedAt,
      ...(editing.memo !== null ? { memo: editing.memo } : {}),
    }
    const savingId = editing.id
    // 저장 응답이 늦게 오는 동안 사용자가 목록으로 돌아가 다른 레코드 편집을 시작했을 수 있다 — 그
    // 사이 editingExchangeId가 바뀌었으면(=이미 다른 화면) 목록으로 돌려보내지 않는다.
    putExchange.mutate(
      { id: editing.id, body },
      { onSuccess: () => { if (editingIdRef.current === savingId) backToList() } },
    )
  }

  const handleDelete = () => {
    if (!editing) return
    deleteExchange.mutate(editing.id, { onSuccess: backToList })
  }

  const isBusy = putExchange.isPending || deleteExchange.isPending
  const insufficientBalance = putExchange.error instanceof ApiError && putExchange.error.code === 'FX_INSUFFICIENT_BALANCE'
  const genericError = putExchange.error && !insufficientBalance ? putExchange.error.message : null
  const deleteErrorMessage = deleteExchange.error?.message ?? null

  return (
    <Modal onClose={closeModal} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      {editing === null ? (
        <>
          <ModalHeader icon="receipt_long" title="환전 내역" onClose={closeModal} />
          {exchangesQuery.isPending ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : exchangesQuery.error ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{exchangesQuery.error.message}</div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 환전 내역이 없어요</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="mini-hov"
                  onClick={() => openEdit(r.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer' }}
                >
                  {/* 달러를 산 행(원 → 달러)은 라벨·달러 금액을 액센트로 칠해 판 행(달러 → 원)과 한눈에
                      구분한다(두 방향이 같은 색이면 헷갈린다). 디자인 규칙상
                      "파랑"으로 허용된 유채색은 액센트 인디고뿐이라 새 색을 만들지 않고 --accent를 쓴다.
                      이 구분색은 이 목록 안에서만 쓴다 — 주식 화면의 "총 보유 USD"까지 칠했다가 "내역에서만"
                      이라는 지적으로 되돌렸다(같은 날). */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: r.side === 'BUY' ? 'var(--accent)' : 'var(--text-strong)' }}>{sideLabel(r.side)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>
                      {isoDateToDisplay(r.exchangedAt)} · {formatNumber(r.rate)}원
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: r.side === 'BUY' ? 'var(--accent)' : 'var(--text-strong)' }}>${formatNumber(r.foreignAmount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{formatKrw(r.krwAmount)}원</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
            <button
              onClick={backToList}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="arrow_back" size={19} color="var(--text-mid)" />
            </button>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>환전 내역 수정</div>
          </div>
          {!isEditFormReady ? (
            <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : (
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
                {insufficientBalance && <div style={ERROR_STYLE}>보유 외화보다 많이 팔 수 없어요</div>}
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
            {amountMissing && <div style={ERROR_STYLE}>금액과 환율을 입력해주세요</div>}
            {!!krwAmountEstimate && (
              <div style={{ fontSize: 11.5, color: 'var(--text-mid)' }}>
                원화 환산 총액 <b style={{ color: 'var(--text-strong)' }}>{formatKrw(krwAmountEstimate)}원</b>
              </div>
            )}
            <div>
              <div style={LABEL_STYLE}>계좌</div>
              <div style={LOCKED_FIELD_STYLE}>{accountName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>계좌는 수정할 수 없어요. 바꾸려면 삭제 후 다시 등록해주세요.</div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={LABEL_STYLE}>환전일</div>
              <DatePicker dp={dpExchangeDate} />
            </div>

            {genericError && <div style={ERROR_STYLE}>{genericError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={isBusy}
                aria-busy={putExchange.isPending}
                className="qbtn"
                style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1, transition: 'transform .12s' }}
              >
                {putExchange.isPending ? '저장 중…' : '변경사항 저장'}
              </button>
              {!deleteConfirmOpen && (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isBusy}
                  className="qbtn"
                  style={{ padding: '14px 20px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--exp-text)', fontSize: 14, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
                >
                  삭제
                </button>
              )}
            </div>

            {deleteConfirmOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--fill-subtle)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)' }}>정말 삭제할까요?</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }}>삭제한 환전 기록은 되돌릴 수 없어요.</div>
                {deleteErrorMessage && <div style={ERROR_STYLE}>{deleteErrorMessage}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleDelete}
                    disabled={isBusy}
                    aria-busy={deleteExchange.isPending}
                    className="qbtn"
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'var(--down)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: isBusy ? 'default' : 'pointer', opacity: isBusy ? 0.7 : 1 }}
                  >
                    {deleteExchange.isPending ? '삭제 중…' : '삭제할게요'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={isBusy}
                    className="qbtn"
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mid)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </>
      )}
    </Modal>
  )
}
