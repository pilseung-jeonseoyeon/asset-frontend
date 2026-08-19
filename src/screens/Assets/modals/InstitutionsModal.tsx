// Source: secret/Asset Manager v14.dc.html L2112-2143 (modalInstitutions) + L3976-3983
// (institutionsAll) — read-only list transcribed verbatim. width 440px, maxHeight 86vh. Uses the
// BankIcon primitive (tokenKey lookup) instead of duplicating each glyph's raw SVG path.
//
// 기관 추가/수정/삭제는 사용자에게 노출할 기능이 아니라는 결정으로 되돌려졌다 — 원본 프로토타입도
// 읽기 전용 목록이었다. API 레이어(src/services/institution)의 CRUD 훅은 그대로 남아 있다.
//
// 목록은 GET /assets/distribution?groupBy=INSTITUTION(금액)과 GET /institutions(아이콘 키)를
// institutionId로 조인해 만든다 — 보유 자산이 0인(distribution에 안 잡히는) 기관도 전부 보여준다
// (금액 없는 기관은 0원으로 표기).

import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { fmt } from '../../../utils/format'
import { useGetAssetDistributionByInstitution } from '@/services/asset'
import { useGetInstitutions } from '@/services/institution'

export function InstitutionsModal() {
  const { state, setState } = useAppState()
  const isOpen = state.modalOpen === 'institutions'

  const distribution = useGetAssetDistributionByInstitution({ enabled: isOpen })
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })

  if (!isOpen) return null

  const closeModal = () => setState({ modalOpen: null })

  const institutions = institutionsQuery.data ?? []
  const rows = institutions
    .map((inst) => {
      const distRow = distribution.groups.find((g) => g.institutionId === inst.id)
      return {
        institutionId: inst.id,
        name: inst.name,
        tokenKey: inst.icon ?? '',
        totalValueKrw: distRow?.totalValueKrw ?? 0,
      }
    })
    .sort((a, b) => b.totalValueKrw - a.totalValueKrw)

  return (
    <Modal onClose={closeModal} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="account_balance" title="금융기관" onClose={closeModal} />
      {distribution.isPending || institutionsQuery.isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : distribution.error || institutionsQuery.error ? (
        <div style={{ fontSize: 11.5, color: 'var(--down)' }}>
          {(distribution.error ?? institutionsQuery.error)?.message}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>등록된 금융기관이 없어요.</div>
          )}
          {rows.map((inst) => (
            <div
              key={inst.institutionId}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <BankIcon tokenKey={inst.tokenKey} size={32} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inst.name}
                </span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.02em', textAlign: 'right', flex: 'none' }}>
                {inst.totalValueKrw > 0 ? (
                  <>
                    {fmt(inst.totalValueKrw)}
                    <span style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 600 }}>원</span>
                  </>
                ) : (
                  <span style={{ fontSize: 11.5, color: 'var(--text-weak)', fontWeight: 600 }}>0원</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
