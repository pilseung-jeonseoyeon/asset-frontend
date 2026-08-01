// Source: secret/Asset Manager v14.dc.html L2072-2109 (분류별 지출 상세 모달, catDetailModal) —
// transcribed verbatim. z-index 80, width 460px, maxHeight 86vh. Opened from Ledger's 전월 대비 분류별
// 지출 rows (cat.open, see Ledger.tsx). catDetailGroups (L4057-4066) is a deterministic pseudo-random
// generator seeded from the category/sub name lengths — not real transaction data, transcribed exactly.

import { Icon } from '../../../components/primitives/Icon/Icon'
import { Modal } from '../../../components/primitives/Modal/Modal'
import { useAppState } from '../../../state/AppStateContext'
import { fmt } from '../../../utils/format'
import { ledgerCategories } from '../../../data/mockLedger'

export function CategoryDetailModal() {
  const { state, setState } = useAppState()

  if (state.modalOpen !== 'categoryDetail') return null

  const catDetailName = state.catDetailName
  const catDetailCat = ledgerCategories.find((c) => c.name === catDetailName)
  const catDetailMajor = state.customCats['지출'].find((c) => c.major === catDetailName)
  const catDetailSubs = catDetailMajor ? catDetailMajor.subs : []
  const catDetailGroups = catDetailSubs.map((sub, si) => {
    const seed = (catDetailName || '').length * 13 + sub.length * 7 + si * 31
    const items = [0, 1].map((ni) => {
      const day = 3 + ((seed * 7 + ni * 11) % 24)
      const amt = 8000 + ((seed * 4231 + ni * 977) % 120000)
      return { date: '06.' + String(day).padStart(2, '0'), desc: sub + ' 결제', amtFmt: fmt(Math.round(amt / 100) * 100) }
    })
    return { sub, items }
  })

  const closeCatDetail = () => setState({ modalOpen: null })

  if (!catDetailCat) return null

  return (
    <Modal onClose={closeCatDetail} zIndex={80} width={460} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 16.5, fontWeight: 700 }}>{catDetailName} 상세</div>
        <button
          onClick={closeCatDetail}
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="close" size={19} color="var(--text-mid)" />
        </button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--exp-text)', marginBottom: 18 }}>
        {catDetailCat.amtFmt}원 · 전월 대비 {catDetailCat.changeSign}{catDetailCat.changePctFmt}%
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {catDetailSubs.map((sub) => (
          <span key={sub} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '5px 10px', borderRadius: 8 }}>
            {sub}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>내역</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {catDetailGroups.map((grp) => (
          <div key={grp.sub}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-weak)', marginBottom: 4 }}>{grp.sub}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {grp.items.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '0.5px solid var(--track)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-weak)', width: 44, flex: 'none' }}>{t.date}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.desc}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--exp-text)' }}>−{t.amtFmt}원</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
