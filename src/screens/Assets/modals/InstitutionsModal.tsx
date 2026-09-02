// 금융기관 목록(읽기 전용) 모달. 너비 440px, maxHeight 86vh.
// 아이콘은 BankIcon 프리미티브(tokenKey 조회)를 쓴다 — 기관마다 SVG 경로를 복붙하지 않는다.
//
// 기관 추가/수정/삭제는 사용자에게 노출하지 않기로 한 기능이라 이 화면은 목록만 보여준다.
//
// 목록은 GET /assets/distribution?groupBy=INSTITUTION(금액 기준 그룹)을 기준으로 순회하고,
// GET /institutions(아이콘 키)는 institutionId로 보조 조인만 한다 — institutions를 기준으로 순회하면
// 기관 미연결 버킷(institutionId: null, '미지정')이 영원히 빠진다(buildDashboardInstitutions의 주석
// 참고). 이 화면의 목적이 '내 자산이 어디에 있나'이므로 보유액이 0원인 항목은 제외한다
// (buildDashboardInstitutions가 이미 필터링).
// 대시보드 '주요 자산 보관처' 카드와 조인 규칙이 완전히 같아(limit만 다름) buildDashboardInstitutions를
// 그대로 재사용한다 — 같은 규칙을 두 곳에 따로 구현하지 않기 위해서다.

import { Modal, ModalHeader } from '../../../components/primitives/Modal/Modal'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { buildDashboardInstitutions, DASHBOARD_INSTITUTIONS_EMPTY_TEXT } from '../../../data/dashboardView'
import { describeQueryError } from '../../../data/ledgerView'
import { useGetAssetDistributionByInstitution } from '@/services/asset'
import { useGetInstitutions } from '@/services/institution'
import type { CSSProperties } from 'react'

// GeneralModal.tsx/AddAccountModal.tsx의 재시도 배너와 동일한 텍스트 버튼 규격.
const RETRY_BTN_STYLE: CSSProperties = {
  border: 'none', background: 'transparent', padding: 0, fontSize: 12, fontWeight: 700,
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8,
}

export function InstitutionsModal() {
  const { state, setState } = useAppState()
  const isOpen = state.openModal === 'institutions'

  const distribution = useGetAssetDistributionByInstitution({ enabled: isOpen })
  const institutionsQuery = useGetInstitutions({ enabled: isOpen })

  if (!isOpen) return null

  const closeModal = () => setState({ openModal: null })

  const isPending = distribution.isPending || institutionsQuery.isPending
  const err = describeQueryError(distribution.error) ?? describeQueryError(institutionsQuery.error)
  const retry = () => {
    if (distribution.error) void distribution.refetch()
    if (institutionsQuery.error) void institutionsQuery.refetch()
  }

  const rows = buildDashboardInstitutions(
    distribution.groups,
    institutionsQuery.data ?? [],
    Number.POSITIVE_INFINITY,
  )

  return (
    <Modal onClose={closeModal} zIndex={80} width={440} panelStyle={{ maxHeight: '86vh', overflow: 'auto' }}>
      <ModalHeader icon="account_balance" title="자산 보관처" onClose={closeModal} />
      {isPending ? (
        <div aria-busy style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>—</div>
      ) : err ? (
        <div style={{ fontSize: 11.5, color: 'var(--down)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          {err.message}
          <button type="button" onClick={retry} style={RETRY_BTN_STYLE}>다시 시도</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-weak)' }}>{DASHBOARD_INSTITUTIONS_EMPTY_TEXT}</div>
          )}
          {rows.map((institution) => (
            <div
              key={institution.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <BankIcon tokenKey={institution.tokenKey} size={32} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {institution.name}
                </span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.02em', textAlign: 'right', flex: 'none' }}>
                {institution.amountText}
                <span style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 600 }}>원</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
