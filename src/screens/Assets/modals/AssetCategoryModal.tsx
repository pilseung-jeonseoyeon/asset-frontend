// Source: secret/Asset Manager v14.dc.html L1517-1556 (자산 카테고리 계좌 목록 모달) — transcribed
// verbatim. Gated by `state.assetCat !== null` (a dedicated state field), NOT `state.modalOpen` like
// the other 13 modalXxx — matches source's own `hasAssetCat`/`closeAssetCat` pattern (L4491-4492).
// z-index 80, width 500px, maxHeight 86vh.
//
// 계좌 목록은 GET /assets/distribution?groupBy=CLASS의 byClass[].accounts에서 온다. 이 응답에는
// 기관명이 없어 GET /accounts 결과와 accountId로 조인한다(src/data/assetsView.ts buildAssetCats) —
// 조인에 실패하면 기관명 자리를 비워둔다.
//
// 계좌 행을 탭하면 AccountDetailModal(z-index 90, §7-1 2단 모달)이 이 모달 위에 열린다
// (`accountDetail: accountId`). 행 컨테이너는 상호작용 요소가 아닌 일반 div이고, 그 안에
// 계좌 정보 버튼과 "계좌 수정" 버튼을 형제로 둔다(중첩 상호작용 요소 회피, WAI-ARIA).
//
// **최근 6개월 추이**(2026-08-27 추가): GET /dashboard/trend?type={AccountType}. 백엔드가 새 주소를
// 만드는 대신 기존 총자산 추이 API에 계좌 유형 필터를 더한 것으로, 계좌 유형과 자산군이 1:1이 된
// 덕에 "그 유형 계좌만 골라 계산한 값 = 그 자산군의 추이"가 성립한다(서버 설명이 이 화면을 콕
// 집어 "자산 구성 상세용"이라고 밝힌다). 여기가 이 API를 쓸 수 있는 유일한 자리다 — 계좌 하나를
// 지정하는 파라미터가 없어 **계좌 상세(AccountDetailModal)에는 쓸 수 없다**(그쪽 헤더 주석 참고).
//
// 그래프는 대시보드의 buildTrendChart가 아니라 assetsView의 buildAssetClassTrendPath로 그린다 —
// 대시보드 쪽은 x축이 올해 1~12월 달력이라 6개월 창에 맞지 않는다(그 함수 주석에 이유가 있다).

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { recentMonthsRange } from '../../../utils/date'
import {
  ASSET_CLASS_ACCOUNT_TYPE_PRESET,
  assetClassFormPreset,
  buildAssetCats,
  buildAssetClassTrendPath,
} from '../../../data/assetsView'
import { describeQueryError } from '../../../data/ledgerView'
import { useGetAccounts } from '@/services/account'
import { useGetAssetDistributionByClass } from '@/services/asset'
import { useGetDashboardTrend } from '@/services/dashboard'

const TREND_RANGE_MONTHS = 6

export function AssetCategoryModal() {
  const { state, setState } = useAppState()
  const isOpen = state.assetCat !== null
  const distribution = useGetAssetDistributionByClass({ enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  // 자산군 → 계좌 유형은 1:1이다(ASSET_CLASS_ACCOUNT_TYPE_PRESET). 모달이 닫혀 있으면 state.assetCat이
  // null이라 유형을 정할 수 없으므로 요청도 보내지 않는다.
  const trendType = state.assetCat ? ASSET_CLASS_ACCOUNT_TYPE_PRESET[state.assetCat] : undefined
  const trendQuery = useGetDashboardTrend(recentMonthsRange(TREND_RANGE_MONTHS), 'MONTH', {
    enabled: isOpen && trendType !== undefined,
    type: trendType,
  })

  // 다른 18개 모달과 동일하게, 훅 호출(위 두 줄) 다음 파생 계산(아래 buildAssetCats)보다 먼저
  // isOpen 가드를 둔다. `enabled: isOpen`은 리페치만 막을 뿐 캐시 데이터는 계속 흘러들어오므로(같은
  // 쿼리키를 Assets 화면도 구독), 이 가드가 없으면 모달이 닫혀 있어도(state.assetCat === null)
  // buildAssetCats가 매 렌더 실행돼 데이터 형태 문제로 던질 경우 ModalErrorBoundary가
  // `assetCat: null`로 리셋해도 다음 렌더에서 즉시 재크래시한다.
  if (!isOpen) return null

  const assetCats = buildAssetCats(distribution.groups, accountsQuery.data ?? [])
  const selectedAssetCat = assetCats.find((c) => c.id === state.assetCat) || null

  if (!selectedAssetCat) return null

  const closeAssetCat = () => setState({ assetCat: null })
  const trendPath = buildAssetClassTrendPath(trendQuery.points)
  const trendError = describeQueryError(trendQuery.error)

  return (
    <Modal onClose={closeAssetCat} zIndex={80} width={500} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--track)', color: selectedAssetCat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={selectedAssetCat.icon} size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{selectedAssetCat.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
              총 {selectedAssetCat.totalFmt}원 · 계좌 {selectedAssetCat.count}개
            </div>
          </div>
        </div>
        <button
          onClick={closeAssetCat}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>
      {accountsQuery.error && (
        <div style={{ fontSize: 11.5, color: 'var(--down)', marginBottom: 14 }}>
          기관명을 불러오지 못했어요: {accountsQuery.error.message}
        </div>
      )}

      <div style={{ background: 'var(--fill-subtle)', borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginBottom: 8 }}>최근 {TREND_RANGE_MONTHS}개월 추이</div>
        {trendQuery.isPending ? (
          <div aria-busy style={{ fontSize: 12, color: 'var(--text-weak)', height: 56, display: 'flex', alignItems: 'center' }}>—</div>
        ) : trendError ? (
          // muted는 "데이터 없음"류 안내(회색), 아니면 실제 오류(빨강) — 다른 화면과 같은 규칙.
          <div style={{ fontSize: 11.5, color: trendError.muted ? 'var(--text-weak)' : 'var(--down)' }}>{trendError.message}</div>
        ) : trendPath ? (
          // 세로 눈금·금액 라벨은 두지 않는다 — 이 자리는 "늘었나 줄었나"를 한눈에 보는 스파크라인이고,
          // 정확한 금액은 바로 위 헤더('총 N원')와 아래 계좌 목록에 이미 있다.
          <svg viewBox="0 0 100 44" style={{ width: '100%', height: 56, display: 'block' }} preserveAspectRatio="none" role="img" aria-label={`${selectedAssetCat.name} 최근 ${TREND_RANGE_MONTHS}개월 추이`}>
            <path d={trendPath} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          // 점이 0~1개면 선을 그릴 수 없다 — 직선을 억지로 긋지 않는다(buildAssetClassTrendPath 주석).
          <div style={{ fontSize: 12, color: 'var(--text-weak)', padding: '10px 0' }}>추이를 표시할 데이터가 아직 없어요.</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedAssetCat.accounts.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '13px 8px' }}>
            이 카테고리에 등록된 계좌가 없어요.
          </div>
        )}
        {selectedAssetCat.accounts.map((ca) => (
          <div
            key={ca.accountId}
            className="mini-hov"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8 }}
          >
            <button
              onClick={() => setState({ accountDetail: ca.accountId })}
              style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ca.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>{ca.inst}</div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{ca.amtFmt}원</div>
            </button>
            <button
              onClick={() => setState({ editAccount: ca.accountId, modalOpen: 'editAccount' })}
              title="계좌 수정"
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}
            >
              <Icon name="edit" size={16} color="var(--text-mid)" />
            </button>
          </div>
        ))}
        <button
          className="qbtn"
          onClick={() =>
            setState({
              modalOpen: 'addAccount',
              // addAccountReturnTo는 null이 맞다 — 이 모달(AssetCategoryModal)은 다른 13개 modalXxx와
              // 달리 modalOpen이 아니라 assetCat(위 주석 참고)으로 열림 여부를 판단한다. "계좌 추가"를
              // 눌러도 assetCat은 건드리지 않으므로 AddAccountModal이 그 위에 겹쳐 열릴 뿐이고,
              // AddAccountModal이 닫히며 modalOpen을 null로 되돌려도 이 모달은 계속 떠 있다 — 되돌아갈
              // "modalOpen 값"이 애초에 필요 없다.
              addAccountReturnTo: null,
              // 어느 자산군 칸에서 열었는지 폼에 반영해야 한다 — 안 하면 기본값(BLANK_ACCOUNT_FORM.type
              // === 'CASH')이 항상 선택되어 주식 칸에서 만든 계좌가 현금으로 저장되는 사고가 난다.
              // 통화(currency)는 여기서 건드리지 않는다 — 자산군과 통화의 연결은 2026-08-27 주식 통합
              // 때 사라졌다(assetClassFormPreset 주석 참고).
              accountForm: { ...BLANK_ACCOUNT_FORM, ...assetClassFormPreset(selectedAssetCat.id) },
            })
          }
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 13, borderRadius: 10, border: '0.5px dashed var(--text-weak)', background: 'transparent', color: 'var(--text-weak)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginTop: 14, transition: 'transform .12s', fontFamily: 'inherit' }}
        >
          <Icon name="add" size={16} />
          계좌 추가
        </button>
      </div>
    </Modal>
  )
}
