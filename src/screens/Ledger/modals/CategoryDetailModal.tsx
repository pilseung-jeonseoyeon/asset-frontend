// 분류별 지출 상세 모달. z-index 80, 너비 460px, maxHeight 86vh.
// 가계부의 '전월 대비 분류별 지출' 줄에서 열린다.
// 데이터는 GET /transactions/categories/{categoryId}/detail.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { sheetStickyHeaderStyle } from '../../../components/primitives/Modal/sheetHeader'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { useAppState } from '../../../state/AppStateContext'
import { formatNumber } from '../../../utils/format'
import { describeQueryError, formatCategoryDetailChange } from '../../../data/ledgerView'
import { useGetCategoryDetail } from '@/services/transaction'

export function CategoryDetailModal() {
  const isMobile = useIsMobile()
  const { state, setState } = useAppState()
  const isOpen = state.openModal === 'categoryDetail'
  const detail = useGetCategoryDetail(state.categoryDetailId, {}, { enabled: isOpen })

  if (!isOpen) return null

  const closeCategoryDetail = () => setState({ openModal: null })
  const err = describeQueryError(detail.error)

  return (
    <Modal onClose={closeCategoryDetail} zIndex={80} width={460} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      {detail.isPending ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={closeCategoryDetail}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
        </>
      ) : err ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={closeCategoryDetail}
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="close" size={19} color="var(--text-mid)" />
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: err.muted ? 'var(--text-weak)' : 'var(--down)' }}>{err.message}</div>
        </>
      ) : (
        detail.data && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, ...sheetStickyHeaderStyle(isMobile, 6) }}>
              <div style={{ fontSize: 16.5, fontWeight: 700 }}>{detail.data.categoryName} 상세</div>
              <button
                onClick={closeCategoryDetail}
                style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Icon name="close" size={19} color="var(--text-mid)" />
              </button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--exp-text)', marginBottom: 18 }}>
              {formatNumber(detail.data.expenseTotal)}원 · {formatCategoryDetailChange(detail.data.expenseTotal, detail.data.expenseTotalPrevious)}
            </div>
            {detail.data.subcategories.length === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>이 카테고리엔 아직 지출 내역이 없어요.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {detail.data.subcategories.map((subcategory) => (
                    <span key={subcategory.subcategoryId} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '5px 10px', borderRadius: 8 }}>
                      {subcategory.subcategoryName}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>내역</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {detail.data.subcategories.map((subcategory) => (
                    <div key={subcategory.subcategoryId}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-weak)', marginBottom: 4 }}>{subcategory.subcategoryName}</div>
                      {subcategory.transactions.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-weak)', padding: '8px 8px' }}>내역이 없어요.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {subcategory.transactions.map((t) => (
                            <div key={t.transactionId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8 }}>
                              <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.date.slice(5).replace('-', '.')}</div>
                              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--exp-text)' }}>−{formatNumber(t.amount)}원</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )
      )}
    </Modal>
  )
}
