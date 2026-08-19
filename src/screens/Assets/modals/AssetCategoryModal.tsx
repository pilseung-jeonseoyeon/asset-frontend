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

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { BLANK_ACCOUNT_FORM } from '../../../state/initialState'
import { assetClassFormPreset, buildAssetCats } from '../../../data/assetsView'
import { useGetAccounts } from '@/services/account'
import { useGetAssetDistributionByClass } from '@/services/asset'

export function AssetCategoryModal() {
  const { state, setState } = useAppState()
  const isOpen = state.assetCat !== null
  const distribution = useGetAssetDistributionByClass({ enabled: isOpen })
  const accountsQuery = useGetAccounts({}, { enabled: isOpen })
  const assetCats = buildAssetCats(distribution.groups, accountsQuery.data ?? [])
  const selectedAssetCat = assetCats.find((c) => c.id === state.assetCat) || null

  if (!selectedAssetCat) return null

  const closeAssetCat = () => setState({ assetCat: null })

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
              // === 'CASH')이 항상 선택되어 해외주식 칸에서 만든 계좌가 현금으로 저장되는 사고가 난다.
              // 해외주식은 currency까지 같이 넣어준다 — AccountType 자체가 DOMESTIC_STOCK/FOREIGN_STOCK로
              // 갈리지만(assetClassOfAccountType), 계좌 통화(currency)는 별도 필드라 폼에 함께 채워야
              // AddAccountModal이 기본 선택 통화를 맞게 보여준다(assetClassFormPreset 참고).
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
