// 자산 화면. 탭 없이 한 화면에 쭉 흐르는 구조이고, 트리맵은 항상 자산군 기준으로 정렬한다.
//
// 데이터: GET /assets/distribution?groupBy=CLASS(자산 구성 카드 + 트리맵),
// GET /assets/liquidity(유동성 뷰), GET /transactions/summary?period=MONTH
// (유동성 캡션의 "월 지출 기준 약 N개월치" 계산). 파생 로직은 src/data/assetsView.ts.

import type { CSSProperties } from 'react'
import { Icon } from '../../components/primitives/Icon/Icon'
import { Card } from '../../components/primitives/Card/Card'
import { Treemap } from '../../components/primitives/Treemap/Treemap'
import { useAppState } from '../../state/AppStateContext'
import { useIsMobile } from '../../utils/useMediaQuery'
import { buildAssetClassCards, buildLiquidityView, buildMapTiers, liquidityMonthsOfExpense, pickNearestMaturity } from '../../data/assetsView'
import { useGetAccounts } from '@/services/account'
import { useGetAssetDistributionByClass, useGetAssetLiquidity } from '@/services/asset'
import { useGetPeriodSummary } from '@/services/transaction'

function EmptyAccountsState({ onAdd, style }: { onAdd: () => void; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>
        등록된 계좌가 없어요. 계좌를 추가하면 자산 구성을 볼 수 있어요.
      </div>
      <button
        className="qbtn"
        onClick={onAdd}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'transform .12s', fontFamily: 'inherit' }}
      >
        <Icon name="add" size={16} />
        계좌 추가
      </button>
    </div>
  )
}

export function Assets() {
  const { setState } = useAppState()
  const isMobile = useIsMobile()
  const distribution = useGetAssetDistributionByClass()
  const accountsQuery = useGetAccounts()
  const liquidity = useGetAssetLiquidity()

  const accounts = accountsQuery.data ?? []
  const assetClassCards = buildAssetClassCards(distribution.groups, accounts)
  const mapBlocks = buildMapTiers(distribution.groups, (assetClass) => setState({ assetClassDetail: assetClass }))
  // 서버는 6개 자산군을 항상 고정 배열로 내려준다(계좌가 하나도 없어도 totalValueKrw:0인 빈 항목들이 옴).
  // groups.length만으로는 "데이터 없음"을 판별할 수 없어 합계 금액까지 함께 확인한다.
  const hasDistributionData =
    distribution.groups.length > 0 && distribution.groups.some((g) => g.totalValueKrw > 0)

  const liquidityData = liquidity.data
  const liquidityView = liquidityData
    ? buildLiquidityView(liquidityData.liquidAccounts, liquidityData.lockedAccounts)
    : null
  const nearestMaturity = liquidityData ? pickNearestMaturity(liquidityData.lockedAccounts) : null
  const hasLiquidityData =
    !!liquidityData && (liquidityData.liquidAccounts.length > 0 || liquidityData.lockedAccounts.length > 0)

  // "월 지출 기준 약 N개월치" 캡션 절반. 월 지출이 0이거나 조회 실패면 이 절반을
  // 렌더하지 않는다 — 옆의 "만기까지 D−N" 절반과 달리 이건 없어도 캡션 전체가 의미를 잃지 않는다.
  const periodSummaryQuery = useGetPeriodSummary('MONTH')
  const liquidityMonths = liquidityView
    ? liquidityMonthsOfExpense(liquidityView.liquidAmt, periodSummaryQuery.data?.expenseTotal ?? null)
    : null

  const openAddAccount = () => setState({ quickAddOpen: false, openModal: 'addAccount' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 자산 구성 (메인 카드) */}
      <Card style={{ padding: 26 }} aria-busy={distribution.isPending}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>자산 구성</div>
          <button
            className="qbtn"
            onClick={openAddAccount}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'transform .12s' }}
          >
            <Icon name="add" size={16} />
            계좌 추가
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 18 }}>카테고리 블록을 클릭하면 소속 계좌 목록을 확인하고 수정할 수 있어요</div>
        {distribution.isPending ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
        ) : distribution.error ? (
          <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{distribution.error.message}</div>
        ) : !hasDistributionData ? (
          <EmptyAccountsState onAdd={openAddAccount} />
        ) : (
          <div className="rgrid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {assetClassCards.map((ac) => (
              <button
                key={ac.id}
                className="dkblk-hov"
                onClick={() => setState({ assetClassDetail: ac.id })}
                style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--fill-subtle)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 18, fontFamily: 'inherit', color: 'var(--text-strong)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Icon name={ac.icon} size={17} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{ac.name}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
                  {ac.totalText}
                  <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 600 }}>원</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 3 }}>계좌 {ac.count}개</div>
              </button>
            ))}
            {/* 부동산: 서버에 자산군이 아직 없어 계좌를 붙일 수 없다(RealEstateSoonModal 주석 참고).
                그래서 서버 응답에서 만들어지는 위 카드들과 달리 화면이 직접 그리는 칸이고, 금액 자리에는
                0원 대신 "준비 중" 배지를 둔다 — 0원이라고 적으면 "부동산이 0원인 사람"으로 읽힌다.
                맵(트리맵) 뷰와 대시보드 도넛에는 넣지 않는다: 둘은 비중을 그리는 화면이라 금액 없는
                항목이 낄 자리가 없고, 서버 값만 그리는 게 이 저장소 규칙이다. */}
            <button
              className="dkblk-hov"
              onClick={() => setState({ openModal: 'realEstateSoon' })}
              style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--fill-subtle)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 18, fontFamily: 'inherit', color: 'var(--text-strong)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Icon name="home" size={17} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>부동산</span>
              </div>
              {/* 다른 카드의 금액(18px)+계좌 수(11px) 두 줄과 높이를 맞추려 배지 아래에 안내 줄을 둔다 —
                  그리드 한 칸만 짧으면 줄이 어긋나 보인다. 배지 규격은 Dashboard/AccountModal과 동일. */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-weak)', background: 'var(--track)', borderRadius: 8, padding: '5px 10px', display: 'inline-block' }}>
                준비 중
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 6 }}>곧 등록할 수 있어요</div>
            </button>
          </div>
        )}
        {!distribution.isPending &&
          accountsQuery.error &&
          accountsQuery.error.message !== distribution.error?.message && (
            <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 12 }}>
              계좌 상세 정보를 불러오지 못했어요: {accountsQuery.error.message}
            </div>
          )}
      </Card>

      {/* 자산 분포 + 유동성 뷰 (2단) */}
      <div className="asset-2col" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <Card style={{ padding: 26 }} aria-busy={distribution.isPending}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>자산 분포</div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginBottom: 18 }}>블록 크기는 금액 비중에 비례합니다 · 5% 미만이 여럿이면 '기타'로 묶여요</div>
          {distribution.isPending ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
          ) : distribution.error ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)' }}>{distribution.error.message}</div>
          ) : !hasDistributionData ? (
            <EmptyAccountsState onAdd={openAddAccount} />
          ) : isMobile ? (
            // 좁은 폭에서는 블록의 최소 너비(Treemap 내부 고정값)가 카드 폭을 넘어설 수 있어 잘라내는
            // 대신 가로 스크롤로 감싼다 — 렌더 티어·5% 미만 '기타' 병합 로직 자체는 그대로 둔다.
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', flex: 1 }}>
              <Treemap blocks={mapBlocks} />
            </div>
          ) : (
            <Treemap blocks={mapBlocks} />
          )}
        </Card>

        <Card style={{ padding: 26 }} aria-busy={liquidity.isPending}>
          <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>유동성 뷰</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-mid)', marginTop: 4 }}>즉시 현금화 가능한 자산과 만기·락업으로 묶여있는 자산의 비중이에요</div>
          {liquidity.isPending ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)', marginTop: 18 }}>—</div>
          ) : liquidity.error ? (
            <div style={{ fontSize: 11.5, color: 'var(--down)', marginTop: 18 }}>{liquidity.error.message}</div>
          ) : !hasLiquidityData || !liquidityView ? (
            <EmptyAccountsState onAdd={openAddAccount} style={{ marginTop: 18 }} />
          ) : (
            <>
              <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', background: 'var(--track)', marginTop: 18 }}>
                <div style={{ width: `${liquidityView.liquidPercent}%`, background: 'var(--accent)' }} />
                <div style={{ width: `${liquidityView.lockedPercent}%`, background: 'var(--ramp-4)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18, flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--accent)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>즉시 현금화 가능</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>파킹통장 등</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{liquidityView.liquidPercent}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{liquidityView.liquidAmountText}원</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill-subtle)', borderRadius: 10, padding: '14px 16px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 4, background: 'var(--ramp-4)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>묶여있음</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>적금·락업 등</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{liquidityView.lockedPercent}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 2 }}>{liquidityView.lockedAmountText}원</div>
                  </div>
                </div>
              </div>
              {(liquidityMonths !== null || nearestMaturity) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--track)', fontSize: 12.5, color: 'var(--text-mid)', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
                  <Icon name="check_circle" size={17} color="var(--accent)" style={{ flex: 'none' }} />
                  <span>
                    {liquidityMonths !== null && `즉시 현금화 가능 자산은 월 지출 기준 약 ${liquidityMonths}개월치예요`}
                    {liquidityMonths !== null && nearestMaturity && ' · '}
                    {nearestMaturity && (
                      <>
                        {nearestMaturity.name} 만기까지{' '}
                        <b>{nearestMaturity.dDay >= 0 ? `D−${nearestMaturity.dDay}` : '만기 경과'}</b>
                      </>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
