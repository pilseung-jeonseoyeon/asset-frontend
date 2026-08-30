// Source: secret/Asset Manager v14.dc.html L1517-1556 (자산 카테고리 계좌 목록 모달) — transcribed
// verbatim. Gated by `state.assetClassDetail !== null` (a dedicated state field), NOT `state.modalOpen` like
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
// **"최근 6개월 추이" 칸은 없다**(2026-08-28, 사용자 결정 — "상세에 6개월 추이 그래프 없애줘").
// 2026-08-27에 GET /dashboard/trend?type={AccountType}로 한 번 넣었다가 걷어냈다. 다시 넣자는
// 이야기가 나오면 사용자에게 먼저 확인할 것 — API는 그대로 있으니 되살리는 건 어렵지 않다.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { assetClassFormPreset, buildAssetCats } from '../../../data/assetsView'
import { useGetAccounts } from '@/services/account'
import { useGetAssetDistributionByClass } from '@/services/asset'

export function AssetCategoryModal() {
  const { state, setState } = useAppState()
  const isOpen = state.assetClassDetail !== null
  const distribution = useGetAssetDistributionByClass({ enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })

  // 다른 18개 모달과 동일하게, 훅 호출(위 두 줄) 다음 파생 계산(아래 buildAssetCats)보다 먼저
  // isOpen 가드를 둔다. `enabled: isOpen`은 리페치만 막을 뿐 캐시 데이터는 계속 흘러들어오므로(같은
  // 쿼리키를 Assets 화면도 구독), 이 가드가 없으면 모달이 닫혀 있어도(state.assetClassDetail === null)
  // buildAssetCats가 매 렌더 실행돼 데이터 형태 문제로 던질 경우 ModalErrorBoundary가
  // `assetClassDetail: null`로 리셋해도 다음 렌더에서 즉시 재크래시한다.
  if (!isOpen) return null

  const assetCats = buildAssetCats(distribution.groups, accountsQuery.data ?? [])
  const selectedAssetClass = assetCats.find((c) => c.id === state.assetClassDetail) || null

  if (!selectedAssetClass) return null

  const closeAssetCat = () => setState({ assetClassDetail: null })

  return (
    <Modal onClose={closeAssetCat} zIndex={80} width={500} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--track)', color: selectedAssetClass.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={selectedAssetClass.icon} size={20} />
          </span>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>{selectedAssetClass.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-weak)', marginTop: 2 }}>
              총 {selectedAssetClass.totalFmt}원 · 계좌 {selectedAssetClass.count}개
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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedAssetClass.accounts.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-weak)', padding: '13px 8px' }}>
            이 카테고리에 등록된 계좌가 없어요.
          </div>
        )}
        {selectedAssetClass.accounts.map((ca) => (
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
              // 달리 modalOpen이 아니라 assetClassDetail(위 주석 참고)으로 열림 여부를 판단한다. "계좌 추가"를
              // 눌러도 assetCat은 건드리지 않으므로 AddAccountModal이 그 위에 겹쳐 열릴 뿐이고,
              // AddAccountModal이 닫히며 modalOpen을 null로 되돌려도 이 모달은 계속 떠 있다 — 되돌아갈
              // "modalOpen 값"이 애초에 필요 없다.
              addAccountReturnTo: null,
              // 어느 자산군 칸에서 열었는지 폼에 반영해야 한다 — 안 하면 기본값(BLANK_ACCOUNT_FORM.type
              // === 'CASH')이 항상 선택되어 주식 칸에서 만든 계좌가 현금으로 저장되는 사고가 난다.
              // 통화(currency)는 여기서 건드리지 않는다 — 자산군과 통화의 연결은 2026-08-27 주식 통합
              // 때 사라졌다(assetClassFormPreset 주석 참고).
              accountForm: { ...BLANK_ACCOUNT_FORM, ...assetClassFormPreset(selectedAssetClass.id) },
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
