// 주식 화면. GET /indices, GET /stocks, GET /stocks/holdings, GET /stocks/holdings/groups,
// GET /stocks/holdings/closed, GET /exchanges/summary, GET /exchanges, GET /trades,
// GET /dashboard/summary에 연결돼 있다. 뷰모델 변환은 src/data/stocksView.ts.
//
// 이 화면의 섹터 비중 도넛이 앱 전체에서 허용된 두 번째이자 마지막 DonutChart 사용처다 —
// ds_rules_v2_5.md §3-4가 도넛을 정확히 두 곳(대시보드 자산 구성 + 여기)으로 제한한다.
//
// **시세 미확보 처리가 이 화면의 핵심 함정이다.** HoldingRes의 평가 계열(valuationKrw·
// unrealizedPnlKrw·returnRatePercent·currentPrice·previousClosePrice·dayChangePercent·priceAsOf)은
// 전부 nullable이라 formatNumber(null)로 넘기면 크래시한다 — 시세를 못 받은 종목은 카드에
// '시세를 아직 확보하지 못했어요'로 대체하고, 포트폴리오 요약 합산에서는 그 종목을 제외한 뒤
// 캡션으로 안내한다. 원가는 valuationKrw − unrealizedPnlKrw로 역산하지 말고 totalCostKrw를 쓴다.
// 외화 카드의 원화 환산액도 GET /indices의 USDKRW로 근사하지 말고 서버의 heldKrwValuation을 쓴다.
//
// '매매 내역' 섹션과 '외화 자산' 카드의 '내역' 진입점이 있어야 오입력한 매매·환전을 되돌릴 수 있다 —
// 지우지 말 것.

import type { CSSProperties } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { DeepCard } from '../../components/primitives/DeepCard/DeepCard'
import { DonutChart } from '../../components/primitives/DonutChart/DonutChart'
import { SegmentedTab } from '../../components/primitives/SegmentedTab/SegmentedTab'
import { Skeleton } from '../../components/primitives/Skeleton/Skeleton'
import { useAppState } from '../../state/AppStateContext'
import { stockDeepTabStyle, stockLightTabStyle } from '../../state/selectors/stockTabStyles'
import { formatNumber, formatKrw, formatKoreanUnits } from '../../utils/format'
import { isoDateToDisplay } from '../../utils/date'
import {
  buildClosedHoldingCards,
  buildGroupReturns,
  buildHoldingCards,
  buildMarketIndexViews,
  MARKET_INDEX_COUNT,
  buildPortfolioSummary,
  buildSectorComposition,
  buildTradeRows,
  STOCK_MARKET_TAB_LABELS,
  stockMarketTabToMarket,
  TRADE_HISTORY_LIMIT,
} from '../../data/stocksView'
import { useGetMarketIndices } from '@/services/marketIndex'
import { isExchangeRateMissing, useGetClosedHoldings, useGetHoldingGroups, useGetHoldings } from '@/services/stock'
import { useGetExchangeSummary } from '@/services/exchange'
import { useGetDashboardSummary } from '@/services/dashboard'
import { useGetTrades } from '@/services/trade'

const EMPTY_TEXT_STYLE: CSSProperties = { fontSize: 12.5, color: 'var(--text-weak)' }
const EMPTY_TEXT_STYLE_DEEP: CSSProperties = { fontSize: 12.5, color: 'var(--deep-label)' }
const ERROR_TEXT_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--down)' }
// 시장 지표 타일 — 실제 지표 카드와 로딩 스켈레톤이 같은 크기·간격을 쓰도록 한 곳에 둔다.
const INDEX_TILE_STYLE: CSSProperties = {
  background: 'var(--fill-subtle)',
  borderRadius: 10,
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}
// 1억 원 미만 금액에는 축약 캡션을 병기하지 않는다(ds_rules_v2_5.md §4-2) — Dashboard.tsx의
// KoreanUnitsCaption과 동일 기준.
const ABBREV_THRESHOLD = 100_000_000

function TotalValueKoreanUnitsCaption({ amountKrw }: { amountKrw: number }) {
  if (amountKrw < ABBREV_THRESHOLD) return null
  return (
    <div style={{ fontSize: 12, color: 'var(--deep-label)', fontWeight: 500, marginTop: 4 }}>
      약 {formatKoreanUnits(amountKrw)} 원
    </div>
  )
}

export function Stocks() {
  const { state, setState } = useAppState()
  const stockMarketTab = state.stockMarketTab
  const market = stockMarketTabToMarket(stockMarketTab)

  const showAllStocks = () => setState({ stockMarketTab: 'all' })
  const showDomesticStocks = () => setState({ stockMarketTab: 'domestic' })
  const showForeignStocks = () => setState({ stockMarketTab: 'foreign' })

  const openBuy = () => setState({ openModal: 'quickStock', stockTradeMode: 'buy' })
  const openSell = () => setState({ openModal: 'quickStock', stockTradeMode: 'sell' })
  // 이미 갖고 있던 종목을 기존 계좌에 한 번에 넣는 진입점 — 매수 모달을 종목 수만큼
  // 여닫지 않아도 되게 한다. AddHoldingsModal 헤더 주석 참고.
  const openAddHoldings = () => setState({ openModal: 'addHoldings' })

  const indicesQuery = useGetMarketIndices()
  const indexViews = buildMarketIndexViews(indicesQuery.indices)

  // 이 화면의 전체/국내/해외 탭은 딥 카드(포트폴리오 요약)와 보유 종목 그리드가 공유한다 — 소스에서도
  // 두 블록이 같은 stockTab을 읽는다.
  const holdingsQuery = useGetHoldings(market)
  const holdingCards = buildHoldingCards(holdingsQuery.holdings)

  const dashboardSummaryQuery = useGetDashboardSummary()
  const portfolioSummary = buildPortfolioSummary(holdingsQuery.holdings, dashboardSummaryQuery.data?.totalAssetKrw)

  const groupsByTab = useGetHoldingGroups(state.stockGroupTab === 'country' ? 'market' : 'sector')
  const groupReturns = buildGroupReturns(groupsByTab.groups, state.stockGroupTab === 'country' ? 'market' : 'sector')
  const groupReturnCaption = state.stockGroupTab === 'sector' ? '보유 섹터별 평가 수익률' : '국내·해외 평가 수익률'

  // 섹터 비중 도넛은 그룹별 수익률 탭과 무관하게 항상 섹터 기준이다. by='sector' 쿼리는 React Query가
  // 키로 중복 제거하므로, 그룹별 수익률 탭이 '섹터'일 때는 위 groupsByTab과 같은 캐시를 공유한다.
  const sectorGroups = useGetHoldingGroups('sector')
  const sectorComposition = buildSectorComposition(sectorGroups.groups)
  const topSector = sectorComposition[0]

  const exchangeSummary = useGetExchangeSummary('USD')

  // 전량 매도해 청산된 종목 — 보유 종목(GET /stocks/holdings)에는 잡히지 않으므로 별도 섹션으로 보여준다.
  const closedHoldingsQuery = useGetClosedHoldings(market)
  const closedHoldingCards = buildClosedHoldingCards(closedHoldingsQuery.closedHoldings)
  const closedHoldingsExchangeRateMissing = isExchangeRateMissing(closedHoldingsQuery.error)
  const closedHoldingsHasError = !!closedHoldingsQuery.error && !closedHoldingsExchangeRateMissing

  const holdingsHasError = !!holdingsQuery.error && !holdingsQuery.isExchangeRateMissing

  // 매매 내역 — 청산 종목 섹션 근처에 별도 카드로 보여준다(docs/backend-request.md 4-1). size를
  // 생략해 전 건을 한 페이지로 받아온 뒤, 화면에는 최근 TRADE_HISTORY_LIMIT건만 남기고 그 사실을
  // 캡션으로 밝힌다.
  const tradesQuery = useGetTrades({})
  const tradeRows = buildTradeRows(tradesQuery.trades, market, TRADE_HISTORY_LIMIT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 실시간 시장 지표 — Yahoo Finance를 매 요청 실시간 조회해 느릴 수 있다. 그래서 로딩 중에는
          '—' 한 줄이 아니라 실제 카드와 같은 자리·같은 높이의 스켈레톤을 깔아, 값이 도착해도 아래
          블록들이 밀려 내려가지 않게 한다. */}
      <Card style={{ padding: '16px 20px' }} aria-busy={indicesQuery.isPending}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>시장 지표</div>
          </div>
        </div>
        {indicesQuery.isPending ? (
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: `repeat(${MARKET_INDEX_COUNT},1fr)`, gap: 12 }}>
            {Array.from({ length: MARKET_INDEX_COUNT }, (_, i) => (
              <div key={i} style={INDEX_TILE_STYLE}>
                <Skeleton width={54} height={13} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <Skeleton width={74} height={15} />
                  <Skeleton width={38} height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : indicesQuery.error ? (
          <div style={ERROR_TEXT_STYLE}>{indicesQuery.error.message}</div>
        ) : indexViews.length === 0 ? (
          <div style={EMPTY_TEXT_STYLE}>불러올 수 있는 시장 지표가 없어요</div>
        ) : (
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: `repeat(${indexViews.length},1fr)`, gap: 12 }}>
            {indexViews.map((marketIndex) => (
              <div key={marketIndex.symbol} style={INDEX_TILE_STYLE}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{marketIndex.label}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{marketIndex.valueText}</div>
                  {marketIndex.changePercentText && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: marketIndex.positive ? 'var(--up)' : 'var(--down)', marginTop: 1 }}>
                      {marketIndex.changePercentText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 요약 + 외화 */}
      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20 }}>
        <DeepCard style={{ padding: 26, width: '100%', height: '100%', justifyContent: 'flex-start' }} aria-busy={holdingsQuery.isPending}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>주식 포트폴리오 요약</div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--deep-divider)', marginBottom: 22 }}>
            <button onClick={showAllStocks} style={stockDeepTabStyle(stockMarketTab === 'all')}>전체</button>
            <button onClick={showDomesticStocks} style={stockDeepTabStyle(stockMarketTab === 'domestic')}>국내 주식</button>
            <button onClick={showForeignStocks} style={stockDeepTabStyle(stockMarketTab === 'foreign')}>해외 주식</button>
          </div>
          {holdingsQuery.isPending ? (
            <div aria-busy style={EMPTY_TEXT_STYLE_DEEP}>—</div>
          ) : holdingsQuery.isExchangeRateMissing ? (
            <div style={EMPTY_TEXT_STYLE_DEEP}>해외 주식 환율 정보가 아직 없어 평가금액을 계산할 수 없어요</div>
          ) : holdingsHasError ? (
            <div style={{ fontSize: 11.5, color: 'var(--deep-down)' }}>{holdingsQuery.error?.message}</div>
          ) : holdingsQuery.holdings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={EMPTY_TEXT_STYLE_DEEP}>아직 보유한 주식이 없어요. 매수하면 포트폴리오 요약이 여기 표시돼요.</div>
              <button
                onClick={openBuy}
                className="qbtn"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '0.5px dashed var(--deep-label)', background: 'transparent', color: 'var(--deep-label)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s' }}
              >
                <Icon name="add" size={16} />
                매수
              </button>
            </div>
          ) : (
            <>
              <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>총 평가금액</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>
                    {portfolioSummary.totalValueText ?? '—'}
                    {portfolioSummary.totalValueText && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--deep-label)' }}>원</span>}
                  </div>
                  <TotalValueKoreanUnitsCaption amountKrw={portfolioSummary.totalValueKrw} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>총 매수금액</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em' }}>
                    {portfolioSummary.totalCostText ?? '—'}
                    {portfolioSummary.totalCostText && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--deep-label)' }}>원</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>평가손익</div>
                  <div className="dk-accent" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: portfolioSummary.pnlPositive ? 'var(--deep-up)' : 'var(--deep-down)', letterSpacing: '-.02em' }}>
                    {portfolioSummary.profitLossText ?? '—'}
                    {portfolioSummary.profitLossText && <span style={{ fontSize: 13, fontWeight: 600 }}>원</span>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--deep-label)' }}>평가 수익률</div>
                  <div className="dk-accent" style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: portfolioSummary.pnlPositive ? 'var(--deep-up)' : 'var(--deep-down)', letterSpacing: '-.02em' }}>
                    {portfolioSummary.returnRateText ?? '—'}
                  </div>
                </div>
              </div>
              {portfolioSummary.hasMissingPrice && (
                <div style={{ ...EMPTY_TEXT_STYLE_DEEP, marginTop: 10 }}>
                  일부 종목은 시세를 아직 확보하지 못해 총 매수금액·평가금액·손익 계산에서 제외했어요
                </div>
              )}
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
                  보유 종목 <b style={{ color: 'var(--deep-value)' }}>{portfolioSummary.holdingCount}종목</b>
                </span>
                {portfolioSummary.sharePercentText && (
                  <span>
                    주식 비중 <b style={{ color: 'var(--deep-value)' }}>총자산의 {portfolioSummary.sharePercentText}</b>
                  </span>
                )}
                <span>
                  평단가 <b style={{ color: 'var(--deep-value)' }}>가중평균</b>
                </span>
              </div>
            </>
          )}
        </DeepCard>

        <Card style={{ padding: 26, justifyContent: 'space-between', height: '100%', width: '100%' }} aria-busy={exchangeSummary.isPending}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>외화 자산 &amp; 가중 평균 환율</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
              {/* 요약(GET /exchanges/summary)이 422로 실패해도(docs/backend-request.md 0-2-1) 이
                  버튼은 항상 눌려야 한다 — 등록한 환전을 최소한 확인·삭제는 할 수 있어야 하기
                  때문이다(같은 문서 0-4-6). */}
              <button
                onClick={() => setState({ openModal: 'exchangeHistory', editingExchangeId: null })}
                className="qbtn"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-mid)',
                  background: 'var(--fill-subtle)',
                  padding: '5px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: 'none',
                  fontFamily: 'inherit',
                }}
              >
                내역
              </button>
              <button
                onClick={() => setState({ openModal: 'exchangeAdd' })}
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
          </div>
          {exchangeSummary.isPending ? (
            <div aria-busy style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>—</div>
          ) : exchangeSummary.isExchangeRateMissing ? (
            <div style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>USD 환율 정보가 아직 없어요</div>
          ) : exchangeSummary.error ? (
            <div style={{ ...ERROR_TEXT_STYLE, marginTop: 16 }}>{exchangeSummary.error.message}</div>
          ) : !exchangeSummary.data ? (
            <div style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>외화 보유 내역이 없어요</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>총 보유 USD</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, letterSpacing: '-.02em', color: 'var(--text-strong)' }}>
                    $ {formatNumber(exchangeSummary.data.heldForeignAmount)}
                  </div>
                  {/* 서버가 직접 계산한 원화 평가액(heldKrwValuation) — 더 이상 GET /indices의
                      USDKRW로 근사하지 않는다(docs/frontend-todo.md A-7). */}
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>
                    ≈ {formatKrw(exchangeSummary.data.heldKrwValuation)}원 ({isoDateToDisplay(exchangeSummary.data.rateAsOf)} 매매기준율 기준)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>평단가 (가중평균)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: 'var(--text-strong)' }}>
                    {exchangeSummary.data.weightedAvgRate === null ? '—' : `${formatNumber(exchangeSummary.data.weightedAvgRate)}원`}
                  </div>
                </div>
              </div>
              <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>환차익</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: signColor(exchangeSummary.data.unrealizedGainKrw), marginTop: 4 }}>
                    {signedAmount(exchangeSummary.data.unrealizedGainKrw)}원
                  </div>
                </div>
                <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)' }}>누적 실현 차익</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: signColor(exchangeSummary.data.realizedGainKrw), marginTop: 4 }}>
                    {signedAmount(exchangeSummary.data.realizedGainKrw)}원
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* 보유 종목 */}
      <Card style={{ padding: 26 }} aria-busy={holdingsQuery.isPending}>
        {/* 좁은 폭에서는 탭 묶음과 버튼 묶음이 줄바꿈으로 위아래로 나뉜다 — 한 줄에 6개(탭 3 + 버튼 3)를
            욱여넣으면 아이폰 폭에서 라벨이 글자 단위로 꺾여 "매/수"처럼 세로로 쪼개진다. 각 버튼에 nowrap을 줘서 꺾이는 대신 줄을 넘기게 한다. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={showAllStocks} style={{ ...stockLightTabStyle(stockMarketTab === 'all'), whiteSpace: 'nowrap' }}>전체</button>
            <button onClick={showDomesticStocks} style={{ ...stockLightTabStyle(stockMarketTab === 'domestic'), whiteSpace: 'nowrap' }}>국내 주식</button>
            <button onClick={showForeignStocks} style={{ ...stockLightTabStyle(stockMarketTab === 'foreign'), whiteSpace: 'nowrap' }}>해외 주식</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={openBuy}
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
                whiteSpace: 'nowrap',
                transition: 'transform .12s',
              }}
            >
              <Icon name="add" size={16} />
              매수
            </button>
            <button
              onClick={openSell}
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
                whiteSpace: 'nowrap',
                transition: 'transform .12s',
              }}
            >
              <Icon name="remove" size={16} />
              매도
            </button>
            <button
              onClick={openAddHoldings}
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
                whiteSpace: 'nowrap',
                transition: 'transform .12s',
              }}
            >
              <Icon name="library_add" size={16} />
              보유 종목 추가
            </button>
          </div>
        </div>
        {holdingsQuery.isPending ? (
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        ) : holdingsQuery.isExchangeRateMissing ? (
          <div style={EMPTY_TEXT_STYLE}>해외 주식 환율 정보가 아직 없어 평가금액을 계산할 수 없어요</div>
        ) : holdingsHasError ? (
          <div style={ERROR_TEXT_STYLE}>{holdingsQuery.error?.message}</div>
        ) : holdingCards.length === 0 ? (
          <div style={EMPTY_TEXT_STYLE}>보유 중인 종목이 없어요. 위 매수 버튼으로 첫 종목을 등록해보세요.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-weak)', marginBottom: 14 }}>수익률 높은 순</div>
            <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {holdingCards.map((h) => (
                <div key={h.stockId} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
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
                        {h.marketLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>{h.sector}</span>
                  </div>
                  {h.ticker && <div style={{ fontSize: 10.5, color: 'var(--text-weak)', marginBottom: 4 }}>{h.ticker}</div>}
                  {h.priceMissing ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {h.costText}
                        <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 600 }}>원 · {h.quantityText}주</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 5 }}>시세를 아직 확보하지 못했어요</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {h.valueText}
                        <span style={{ fontSize: 12, color: 'var(--text-weak)', fontWeight: 600 }}>원 · {h.quantityText}주</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: h.positive ? 'var(--up)' : 'var(--down)', marginTop: 5 }}>
                        {h.gainText ?? '—'}
                      </div>
                      {h.currentPriceText && (
                        <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>현재가 {h.currentPriceText}</span>
                          {h.dayChangePercentText && (
                            <span style={{ fontWeight: 700, color: h.dayChangePositive ? 'var(--up)' : 'var(--down)' }}>
                              전 영업일 대비 {h.dayChangePercentText}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* 청산 종목 — 전량 매도해 GET /stocks/holdings에는 더 이상 잡히지 않는 종목의 실현손익 이력. */}
      <Card style={{ padding: 26 }} aria-busy={closedHoldingsQuery.isPending}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>청산 종목</div>
        {closedHoldingsQuery.isPending ? (
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        ) : closedHoldingsExchangeRateMissing ? (
          <div style={EMPTY_TEXT_STYLE}>해외 주식 환율 정보가 아직 없어 계산할 수 없어요</div>
        ) : closedHoldingsHasError ? (
          <div style={ERROR_TEXT_STYLE}>{closedHoldingsQuery.error?.message}</div>
        ) : closedHoldingCards.length === 0 ? (
          <div style={EMPTY_TEXT_STYLE}>아직 전량 매도한 종목이 없어요</div>
        ) : (
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {closedHoldingCards.map((h) => (
              <div key={h.stockId} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
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
                      {h.marketLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-weak)' }}>{h.sector}</span>
                </div>
                {h.ticker && <div style={{ fontSize: 10.5, color: 'var(--text-weak)', marginBottom: 4 }}>{h.ticker}</div>}
                <div style={{ fontSize: 10.5, color: 'var(--text-weak)', marginBottom: 4 }}>청산일 {h.closedAtText}</div>
                <div style={{ fontSize: 12, color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>원금 {h.principalText}원</span>
                  <span>회수금 {h.proceedsText}원</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: h.positive ? 'var(--up)' : 'var(--down)', marginTop: 8 }}>
                  {h.gainText}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 매매 내역 — GET/PUT/DELETE /trades 훅은 있었지만 호출부가 없어(docs/backend-request.md 4-1)
          오입력한 매수·매도를 되돌릴 방법이 없었다. 행을 누르면 TradeEditModal이 열린다. */}
      <Card style={{ padding: 26 }} aria-busy={tradesQuery.isPending}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>매매 내역</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 18 }}>
          최근 {TRADE_HISTORY_LIMIT}건만 표시돼요 · 행을 눌러 수정·삭제할 수 있어요
        </div>
        {tradesQuery.isPending ? (
          <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
        ) : tradesQuery.error ? (
          <div style={ERROR_TEXT_STYLE}>{tradesQuery.error.message}</div>
        ) : tradeRows.length === 0 ? (
          <div style={EMPTY_TEXT_STYLE}>
            {stockMarketTab === 'all' ? '매매 기록이 없어요' : `${STOCK_MARKET_TAB_LABELS[stockMarketTab]} 주식 매매 기록이 없어요`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tradeRows.map((t) => (
              <div
                key={t.id}
                className="mini-hov"
                onClick={() => setState({ openModal: 'tradeEdit', editingTradeId: t.id })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8, cursor: 'pointer' }}
              >
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.dateLabel}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.stockName}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--fill-subtle)', color: 'var(--text-mid)' }}>
                  {t.tag}
                </span>
                {/* 투자 거래는 ds_rules_v2_5.md §10-4에 따라 "이체"로 취급한다 — 등락색·부호 없이
                    무채색(text-strong)으로만 총액을 보여준다. */}
                <div style={{ fontSize: 13.5, fontWeight: 700, width: 120, textAlign: 'right', color: 'var(--text-strong)' }}>{t.amountText}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="rgrid-outer" style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: 20, width: '100%' }}>
        <Card style={{ padding: 26, width: '100%', height: '100%' }} aria-busy={groupsByTab.isPending}>
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
          {groupsByTab.isPending ? (
            <div aria-busy style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>—</div>
          ) : groupsByTab.isExchangeRateMissing ? (
            <div style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>해외 주식 환율 정보가 아직 없어 계산할 수 없어요</div>
          ) : groupsByTab.error ? (
            <div style={{ ...ERROR_TEXT_STYLE, marginTop: 16 }}>{groupsByTab.error.message}</div>
          ) : groupReturns.length === 0 ? (
            <div style={{ ...EMPTY_TEXT_STYLE, marginTop: 16 }}>보유 중인 종목이 없어요</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignContent: 'center', flex: 1, marginTop: 16 }}>
              {groupReturns.map((gr) => (
                <div
                  key={gr.key}
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{gr.label}</div>
                  {/* 원가가 0이라 수익률을 낼 수 없는 그룹은 가짜 0%가 아니라 계산 불가로 표시한다. */}
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', color: gr.percentText === null ? 'var(--text-weak)' : gr.color }}>
                    {gr.percentText ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card style={{ padding: 26, width: '100%', height: '100%' }} aria-busy={sectorGroups.isPending}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>섹터 비중</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 400, marginTop: 4, marginBottom: 16 }}>
            보유 주식 산업군 분포
          </div>
          {sectorGroups.isPending ? (
            <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
          ) : sectorGroups.isExchangeRateMissing ? (
            <div style={EMPTY_TEXT_STYLE}>해외 주식 환율 정보가 아직 없어 계산할 수 없어요</div>
          ) : sectorGroups.error ? (
            <div style={ERROR_TEXT_STYLE}>{sectorGroups.error.message}</div>
          ) : sectorComposition.length === 0 ? (
            <div style={EMPTY_TEXT_STYLE}>보유 중인 종목이 없어요</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
                <DonutChart segments={sectorComposition} size={118} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, flex: 1 }}>
                  {sectorComposition.map((seg) => (
                    <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 4, background: seg.color }} />
                      <span style={{ color: 'var(--text-mid)', flex: 1 }}>{seg.label}</span>
                      <b>{seg.percent}%</b>
                    </div>
                  ))}
                </div>
              </div>
              {topSector && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)' }}>
                  최대 비중 <b style={{ color: 'var(--text-strong)' }}>{topSector.label}</b>{' '}
                  <b style={{ color: 'var(--text-strong)' }}>{topSector.percent}%</b>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function signColor(n: number): string {
  return n >= 0 ? 'var(--up)' : 'var(--down)'
}

function signedAmount(n: number): string {
  return (n >= 0 ? '+' : '−') + formatKrw(Math.abs(n))
}
