// Source: secret/Asset Manager v14.dc.html L2368-2636 (isStock block) — transcribed verbatim.
// This screen owns the 2nd (and last allowed) DonutChart usage app-wide — ds_rules_v2_5.md §3-4 caps
// donuts at exactly 2 locations (Dashboard asset composition + this 섹터 비중 chart). No modals owned
// by this screen (quickStock/exchangeAdd modals live in Assets/Phase 10 & header quick-add, not here).

import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { DonutChart } from '../../components/primitives/DonutChart/DonutChart'
import { SegmentedTab } from '../../components/primitives/SegmentedTab/SegmentedTab'
import { useAppState } from '../../state/AppStateContext'
import { darkTab, liteTab } from '../../state/selectors/stocks'
import { marketIndices, stockHoldings, getGroupReturns, getGroupReturnCaption, sectorComposition } from '../../data/mockStocks'

export function Stocks() {
  const { state, setState } = useAppState()
  const stockTab = state.stockTab

  const setStAll = () => setState({ stockTab: '전체' })
  const setStKr = () => setState({ stockTab: '국내' })
  const setStUs = () => setState({ stockTab: '해외' })

  const groupReturns = getGroupReturns(state.stockGroupTab)
  const groupReturnCaption = getGroupReturnCaption(state.stockGroupTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 실시간 시장 지표 */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>시장 지표</div>
          </div>
        </div>
        <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {marketIndices.map((idx) => (
            <div
              key={idx.name}
              style={{
                background: 'var(--fill-subtle)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{idx.name}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{idx.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: idx.positive ? 'var(--up)' : 'var(--down)', marginTop: 1 }}>
                  {idx.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 요약 + 외화 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20 }}>
        <DeepCard style={{ padding: 26, width: '100%', height: '100%', justifyContent: 'flex-start' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>주식 포트폴리오 요약</div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--deep-divider)', marginBottom: 22 }}>
            <button onClick={setStAll} style={darkTab(stockTab === '전체')}>전체</button>
            <button onClick={setStKr} style={darkTab(stockTab === '국내')}>국내 주식</button>
            <button onClick={setStUs} style={darkTab(stockTab === '해외')}>해외 주식</button>
          </div>
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>총 평가금액</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>513,800,000</div>
              <div style={{ fontSize: 11.5, color: 'var(--deep-label)', fontWeight: 500, marginTop: 3 }}>약 5억 1,380만 원</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>총 매수금액</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>393,680,000</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>평가손익</div>
              <div className="dk-accent" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--deep-up)', letterSpacing: '-.02em' }}>
                +120,120,000
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>평가 수익률</div>
              <div className="dk-accent" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--deep-up)', letterSpacing: '-.02em' }}>
                +30.5%
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 22,
              paddingTop: 18,
              borderTop: '0.5px solid var(--deep-divider)',
              fontSize: 12.5,
              color: 'var(--deep-label)',
            }}
          >
            <span>
              보유 종목 <b style={{ color: 'var(--deep-value)' }}>6종목</b>
            </span>
            <span>
              주식 비중 <b style={{ color: 'var(--deep-value)' }}>총자산의 40%</b>
            </span>
            <span>
              평단가 <b style={{ color: 'var(--deep-value)' }}>가중평균</b>
            </span>
          </div>
        </DeepCard>

        <Card style={{ padding: 26, justifyContent: 'space-between', height: '100%', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>외화 자산 &amp; 가중 평균 환율</div>
            <button
              onClick={() => setState({ modalOpen: 'exchangeAdd' })}
              className="qbtn"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                background: 'var(--accent-soft)',
                padding: '5px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              + 환전 추가
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>총 보유 USD</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em', color: 'var(--text-strong)' }}>
                $ 167,725.00{' '}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-weak)', letterSpacing: 0 }}>
                  (원화 약 231,209,000원)
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>평단가 (가중평균)</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: 'var(--text-strong)' }}>1,280.40원</div>
            </div>
          </div>
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>환차익</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--up)', marginTop: 4 }}>+16,450,000원</div>
            </div>
            <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>누적 실현 차익</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--up)', marginTop: 4 }}>+41,900,000원</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 보유 종목 */}
      <Card style={{ padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={setStAll} style={liteTab(stockTab === '전체')}>전체</button>
            <button onClick={setStKr} style={liteTab(stockTab === '국내')}>국내 주식</button>
            <button onClick={setStUs} style={liteTab(stockTab === '해외')}>해외 주식</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setState({ modalOpen: 'quickStock', stockTradeMode: 'buy' })}
              className="qbtn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 13px',
                borderRadius: 10,
                border: '0.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-strong)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform .12s',
              }}
            >
              <Icon name="add" size={16} />
              매수
            </button>
            <button
              onClick={() => setState({ modalOpen: 'quickStock', stockTradeMode: 'sell' })}
              className="qbtn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 13px',
                borderRadius: 10,
                border: '0.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-strong)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform .12s',
              }}
            >
              <Icon name="remove" size={16} />
              매도
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-weak)', marginBottom: 14 }}>수익률 높은 순</div>
        <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {stockHoldings.map((h) => (
            <div key={h.name} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{h.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-mid)',
                      background: 'var(--fill-subtle)',
                      padding: '2px 7px',
                      borderRadius: 8,
                    }}
                  >
                    {h.market}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>{h.sector}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {h.value}
                <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 600 }}> · {h.qty}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: h.positive ? 'var(--up)' : 'var(--down)', marginTop: 5 }}>
                {h.gain}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: 20, width: '100%' }}>
        <Card style={{ padding: 26, width: '100%', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>그룹별 수익률</div>
            <div style={{ display: 'flex', background: 'var(--track)', borderRadius: 10, padding: 4, gap: 2 }}>
              <SegmentedTab active={state.stockGroupTab === 'sector'} onClick={() => setState({ stockGroupTab: 'sector' })}>
                섹터
              </SegmentedTab>
              <SegmentedTab active={state.stockGroupTab === 'country'} onClick={() => setState({ stockGroupTab: 'country' })}>
                국가
              </SegmentedTab>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 4 }}>{groupReturnCaption}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignContent: 'center', flex: 1, marginTop: 16 }}>
            {groupReturns.map((gr) => (
              <div
                key={gr.name}
                style={{
                  flex: 1,
                  minWidth: 130,
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{gr.name}</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', color: gr.color }}>{gr.pctFmt}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 26, width: '100%', height: '100%' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>섹터 비중</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 4, marginBottom: 16 }}>
            보유 주식 산업군 분포
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
            <DonutChart segments={sectorComposition} size={118} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, flex: 1 }}>
              {sectorComposition.map((seg) => (
                <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: seg.color }} />
                  <span style={{ color: 'var(--text-mid)', flex: 1 }}>{seg.label}</span>
                  <b>{seg.pct}%</b>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
            최대 비중 <b style={{ color: 'var(--text-strong)' }}>반도체</b> <b style={{ color: 'var(--text-strong)' }}>70%</b>
          </div>
        </Card>
      </div>
    </div>
  )
}
