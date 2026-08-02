// Source: secret/Asset Manager v14.dc.html L1172-1310 (modalQuickStock) — transcribed verbatim.
// z-index 80, width 480px, maxHeight 86vh. Computed fields (stockModalTitle/Icon/stockModeBuy etc,
// L3763-3772) transcribed verbatim, incl. stockSellSummaryValue's hardcoded '$600'/'920,000원' —
// not a live computation in the source, just a hardcoded mock value.

import type { CSSProperties, FormEvent } from 'react'
import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { Dropdown } from '../../../components/primitives/Dropdown/Dropdown'
import { DatePicker } from '../../../components/primitives/DatePicker/DatePicker'
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
function filterDecimalInput(e: FormEvent<HTMLInputElement>) {
  const target = e.target as HTMLInputElement
  let v = target.value.replace(/[^0-9.]/g, '')
  const p = v.split('.')
  v = p[0] + (p.length > 1 ? '.' + p[1].slice(0, 2) : '')
  const [i, d] = v.split('.')
  target.value = (i ? Number(i).toLocaleString('ko-KR') : '') + (d !== undefined ? '.' + d : '')
}

function marketTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text-strong)' : 'var(--text-weak)', boxShadow: 'none',
  }
}
function sectorBtn(active: boolean): CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-mid)',
    fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }
}
const SECTOR_NAMES = ['반도체', '테크', '자동차', 'IT서비스', '금융', '헬스케어', '기타']
const HOLDING_STOCKS = ['NVIDIA', 'SK하이닉스', 'Apple', '삼성전자', 'NAVER', 'Tesla']

export function QuickStockModal() {
  const { state, setState } = useAppState()
  const closeModal = useCloseModal()
  const ddStockHolding = useDropdown('stockHolding', HOLDING_STOCKS, HOLDING_STOCKS[0])
  const ddStockAcct = useDropdown('stockAcct', acctOptions, '미래에셋 (국내)')
  const ddStockDate = useDatePicker('stock', '2026.06.28')

  if (state.modalOpen !== 'quickStock') return null

  const stockModeBuy = state.stockTradeMode !== 'sell'
  const stockModeSell = state.stockTradeMode === 'sell'
  const stockCurrencySymbol = state.stockBuyMarket === 'overseas' ? '$' : '₩'
  const stockModalTitle = stockModeSell ? '주식 매도' : '주식 매수'
  const stockModalIcon = stockModeSell ? 'trending_down' : 'show_chart'
  const stockAmountLabel = stockModeSell ? '수수료·세금 차감 후 최종 입금액' : '수수료 포함 총 지불액'
  const stockDateLabel = stockModeSell ? '매도일' : '매수일'
  const stockSaveLabel = stockModeSell ? '매도 기록 저장' : '매수 기록 저장'
  const stockSellSummaryValue = stockCurrencySymbol === '$' ? '$600' : '920,000원'

  return (
    <Modal onClose={closeModal} zIndex={80} width={480} panelStyle={{ maxHeight: '86vh' }}>
      {!!state.openDropdown && (
        <div onClick={() => setState({ openDropdown: null })} style={{ position: 'absolute', inset: 0, zIndex: 94 }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={stockModalIcon} size={20} />
          </span>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>{stockModalTitle}</div>
        </div>
        <button
          onClick={closeModal}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 8, padding: 4, gap: 2 }}>
          <button onClick={() => setState({ stockBuyMarket: 'domestic' })} style={marketTabStyle(state.stockBuyMarket === 'domestic')}>국내 주식</button>
          <button onClick={() => setState({ stockBuyMarket: 'overseas' })} style={marketTabStyle(state.stockBuyMarket === 'overseas')}>해외 주식</button>
        </div>

        {stockModeBuy && (
          <>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>종목</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
                <Icon name="search" size={18} color="var(--text-weak)" />
                <input
                  type="text" placeholder="종목명 또는 티커 검색"
                  style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>섹터</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SECTOR_NAMES.map((n) => (
                  <button key={n} className="mini-hov" onClick={() => setState({ stockSector: n })} style={sectorBtn(state.stockSector === n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {stockModeSell && (
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>종목 (보유)</div>
            <Dropdown dd={ddStockHolding} maxHeight={180} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>수량</div>
            <input
              type="text" placeholder="0주" onInput={filterDecimalInput}
              style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--text-strong)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>{stockAmountLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '0.5px solid var(--border)', borderRadius: 10, padding: '13px 16px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-weak)' }}>{stockCurrencySymbol}</span>
              <input
                type="text" placeholder="0" onInput={filterAmountInput}
                style={{ border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', width: '100%', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>

        {stockModeSell && (
          <div style={{ fontSize: 11.5, color: 'var(--text-mid)', background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px' }}>
            실현 수익 <b style={{ color: 'var(--text-strong)' }}>{stockSellSummaryValue}</b>
          </div>
        )}

        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>계좌</div>
            <Dropdown
              dd={ddStockAcct}
              maxHeight={180}
              footer={
                <>
                  <div style={{ borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />
                  <button
                    className="mini-hov"
                    onClick={() => setState({ modalOpen: 'addAccount', addAccountReturnTo: 'quickStock' })}
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
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 8 }}>{stockDateLabel}</div>
            <DatePicker dp={ddStockDate} />
          </div>
        </div>

        <button
          onClick={closeModal}
          className="qbtn"
          style={{ padding: 14, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform .12s' }}
        >
          {stockSaveLabel}
        </button>
      </div>
    </Modal>
  )
}
