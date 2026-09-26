// 종목 정보(이름·섹터) 수정 모달. PUT /stocks/{stockId} + GET /stocks/sectors에 연결돼 있다.
// z-index 80, 너비 440px.
//
// 새 종목을 잘못된 이름·섹터로 등록하면 예전엔 고칠 방법이 없었다(2026-09-26 통합테스트). 티커·시장·통화는
// 서버가 수정을 받지 않으므로 읽기 전용으로 보여준다. 섹터 칩은 매수 모달의 신규 등록과 같은 서버 마스터
// 목록이고, 한 번 더 누르면 선택을 풀어 '섹터 없음'(그룹 수익률에서는 '기타')으로 되돌린다. 가상자산은
// 섹터가 없는 자산이라 칩을 보여주지 않는다.
//
// 단건 조회 API가 없어 주식 화면이 이미 받아 둔 보유 종목 캐시(GET /stocks/holdings)에서 editingStockId로 찾는다.

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { MARKET_LABELS } from '../../../data/stocksView'
import { useGetHoldings, useGetStockSectors, usePutStock } from '@/services/stock'

const LABEL_STYLE: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }
const FIELD_BORDER_STYLE: CSSProperties = { border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }
const ERROR_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)', marginTop: 6 }

function sectorChipStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 12px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}

export function StockEditModal() {
  const { state, setState } = useAppState()
  const stockId = state.editingStockId
  const isOpen = state.openModal === 'stockEdit' && stockId !== null

  const holdingsQuery = useGetHoldings(undefined, { enabled: isOpen })
  const holding = holdingsQuery.holdings.find((h) => h.stockId === stockId) ?? null
  const isCrypto = holding?.market === 'CRYPTO'
  const sectorsQuery = useGetStockSectors({ enabled: isOpen && !isCrypto })
  const putStock = usePutStock()

  const [name, setName] = useState('')
  const [sector, setSector] = useState<string | null>(null)
  const [nameInvalid, setNameInvalid] = useState(false)
  const [loadedFor, setLoadedFor] = useState<number | null>(null)

  // 폼 초기값 채우기 — 대상 종목이 바뀔 때 한 번만(입력 중에 캐시가 다시 와도 덮어쓰지 않게).
  useEffect(() => {
    if (!isOpen || !holding || loadedFor === holding.stockId) return
    setName(holding.stockName)
    setSector(holding.sector)
    setNameInvalid(false)
    setLoadedFor(holding.stockId)
  }, [isOpen, holding, loadedFor])

  if (!isOpen) return null

  const close = () => {
    setState({ openModal: null, editingStockId: null })
    setLoadedFor(null)
    setNameInvalid(false)
    putStock.reset()
  }

  const save = () => {
    if (!holding) return
    const trimmed = name.trim()
    if (!trimmed) {
      setNameInvalid(true)
      return
    }
    putStock.mutate({ id: holding.stockId, body: { name: trimmed, sector: isCrypto ? null : sector } }, { onSuccess: close })
  }

  return (
    <Modal onClose={close} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="edit" title="종목 정보 수정" onClose={close} />
      {holdingsQuery.isPending || (!holding && holdingsQuery.isFetching) ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : !holding ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>종목 정보를 찾지 못했어요. 창을 닫고 다시 열어주세요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={LABEL_STYLE}>티커 · 시장</div>
            <div style={{ ...FIELD_BORDER_STYLE, background: 'var(--fill-subtle)', fontSize: 13.5, fontWeight: 700, color: 'var(--text-weak)' }}>
              {holding.ticker} · {MARKET_LABELS[holding.market]}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>티커와 시장은 바꿀 수 없어요</div>
          </div>
          <div>
            <div style={LABEL_STYLE}>종목명</div>
            <input
              type="text"
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameInvalid) setNameInvalid(false)
                if (putStock.error) putStock.reset()
              }}
              style={{ width: '100%', ...FIELD_BORDER_STYLE, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
            {nameInvalid && <div style={ERROR_STYLE}>종목명을 입력해주세요</div>}
          </div>
          {!isCrypto && (
            <div>
              <div style={LABEL_STYLE}>섹터</div>
              {sectorsQuery.isPending ? (
                <div aria-busy style={{ fontSize: 12, color: 'var(--text-weak)' }}>—</div>
              ) : sectorsQuery.error ? (
                <div style={ERROR_STYLE}>섹터 목록을 불러오지 못했어요. 잠시 후 다시 열어주세요.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sectorsQuery.sectors.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className="mini-hov"
                      aria-pressed={sector === s.name}
                      onClick={() => {
                        setSector((prev) => (prev === s.name ? null : s.name))
                        if (putStock.error) putStock.reset()
                      }}
                      style={sectorChipStyle(sector === s.name)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 6 }}>
                {sector ? '고른 섹터를 한 번 더 누르면 선택이 풀려요' : "섹터를 고르지 않으면 '기타'로 분류돼요"}
              </div>
            </div>
          )}
          {putStock.error && <div style={ERROR_STYLE}>{putStock.error.message}</div>}
          <button
            onClick={save}
            disabled={putStock.isPending}
            aria-busy={putStock.isPending}
            className="qbtn"
            style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: putStock.isPending ? 'default' : 'pointer', opacity: putStock.isPending ? 0.7 : 1 }}
          >
            {putStock.isPending ? '저장 중…' : '변경사항 저장'}
          </button>
        </div>
      )}
    </Modal>
  )
}
