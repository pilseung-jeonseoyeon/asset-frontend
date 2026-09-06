// 주요 자산 보관처 카드 — GET /assets/distribution?groupBy=INSTITUTION + GET /institutions.
// 기관 타일 그리드는 데스크톱 4열, 모바일(<=767px) 2열(.rgrid-institutions, base.css).

import { Card } from '../../../components/primitives/Card/Card'
import { BankIcon } from '../../../components/primitives/BankIcon/BankIcon'
import { useAppState } from '../../../state/AppStateContext'
import { useIsMobile } from '../../../utils/useMediaQuery'
import { buildDashboardInstitutions, DASHBOARD_INSTITUTIONS_EMPTY_TEXT } from '../../../data/dashboardView'
import { useGetAssetDistributionByInstitution } from '@/services/asset'
import { useGetInstitutions } from '@/services/institution'
import { CARD_LINK_STYLE, CARD_TITLE_STYLE, EMPTY_TEXT_STYLE, ERROR_TEXT_STYLE } from './cardStyles'
import { EmptyState } from './shared'

export function InstitutionsCard() {
  const { setState } = useAppState()
  const isMobile = useIsMobile()
  const institutionDistribution = useGetAssetDistributionByInstitution()
  const institutionsQuery = useGetInstitutions()
  const dashboardInstitutions = buildDashboardInstitutions(
    institutionDistribution.groups,
    institutionsQuery.data ?? [],
  )
  const institutionsPending = institutionDistribution.isPending || institutionsQuery.isPending
  const institutionsError = institutionDistribution.error ?? institutionsQuery.error

  return (
    <Card style={{ padding: 24 }} aria-busy={institutionsPending}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={CARD_TITLE_STYLE}>주요 자산 보관처</div>
        {/* 로딩 중에는 아직 목록 길이를 알 수 없어 숨긴 채로 시작하고(깜빡임 방지), 데이터가
            없다고 확정된 경우(빈 배열)에만 계속 숨긴다 — 에러 상태는 목록 길이와 무관하게
            "다시 볼 것"이 있을 수 있으므로 그대로 노출한다. */}
        {!institutionsPending && (institutionsError || dashboardInstitutions.length > 0) && (
          <button
            type="button"
            onClick={() => setState({ openModal: 'institutions' })}
            style={
              isMobile
                ? { ...CARD_LINK_STYLE, display: 'inline-block', padding: '15px 10px', margin: '-15px -10px' }
                : CARD_LINK_STYLE
            }
          >
            전체 보기 ›
          </button>
        )}
      </div>
      {institutionsPending ? (
        <div aria-busy style={EMPTY_TEXT_STYLE}>—</div>
      ) : institutionsError ? (
        <div style={ERROR_TEXT_STYLE}>{institutionsError.message}</div>
      ) : dashboardInstitutions.length === 0 ? (
        <EmptyState text={DASHBOARD_INSTITUTIONS_EMPTY_TEXT} />
      ) : (
        // rgrid-cards가 아니라 전용 클래스를 쓴다 — 그 클래스의 <=900px 규칙(1fr로 강제)이
        // 여기서 원하는 모바일(<=767px) 2열 규칙과 달라, 같이 쓰면 !important 우선순위 때문에
        // 모바일 2열이 항상 이겨야 할 규칙에 절대 도달하지 못한다(base.css 참고).
        <div className="rgrid-institutions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {dashboardInstitutions.map((institution) => (
            <div key={institution.key} style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <BankIcon tokenKey={institution.tokenKey} size={30} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{institution.name}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>
                {institution.amountText}
                <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>원</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
