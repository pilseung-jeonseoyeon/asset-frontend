// 시스템 관리의 '자산' 묶음: 자산 목표(옛 '자산 · 가계부 맞춤 설정') · 기준 통화(옛 '일반 및 디스플레이'), 2026-10-31.
// - 자산 목표 진행률은 대시보드 위젯과 완전히 같은 계산식(D-Day·초과 저축액)을 쓴다 — 두 벌로 두면 한쪽만 고쳤을 때
//   같은 화면의 두 자리에서 다른 숫자가 나오므로 공용 buildAssetGoals를 쓴다. 목표 창을 닫으면 시스템 관리 창으로 돌아온다(addGoalReturnTo).
// - 기준 통화: 서버 값을 읽기 전용으로 보여준다. USD를 골라도 대시보드 등 모든 응답이 원화 고정 필드(totalAssetKrw 등)라
//   화면 금액이 하나도 바뀌지 않으므로(다통화 표기 미지원, 백엔드 요청 항목) 드롭다운 대신 '추후 업데이트' 배지를 붙인다.

import type { CSSProperties } from 'react'
import { Icon } from '../../../../components/primitives/Icon/Icon'
import { useAppState } from '../../../../state/AppStateContext'
import { buildAssetGoals } from '../../../../data/dashboardView'
import { useGetGoal } from '@/services/goal'
import { useGetUserSettings } from '@/services/user'
import type { Currency } from '@/services/common.type'
import { DESCRIPTION_STYLE, LAST_ROW_STYLE, NAME_STYLE, VALUE_PILL_STYLE } from './systemStyles'

const CURRENCY_LABELS: Record<Currency, string> = { KRW: 'KRW ₩', USD: 'USD $' }
const CAPTION_STYLE: CSSProperties = { fontSize: 11.5, color: 'var(--text-weak)', lineHeight: 1.6 }

export function AssetSection() {
  const { setState } = useAppState()
  const { data: settingsData } = useGetUserSettings()
  const { goal, isUnset: isGoalUnset, error: goalError, isPending: isGoalPending } = useGetGoal({})
  const goalRows = !isGoalUnset && goal ? buildAssetGoals(goal) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 0', borderBottom: '0.5px solid var(--track)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={NAME_STYLE}>자산 목표</div>
            <div style={DESCRIPTION_STYLE}>총 자산 기준 연간·월간 목표 진행률</div>
          </div>
          <button
            className="qbtn"
            onClick={() => setState({ openModal: 'addGoal', addGoalReturnTo: 'system' })}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .12s', flex: 'none' }}
          >
            <Icon name="edit" size={15} />
            {isGoalUnset ? '목표 설정' : '목표 수정'}
          </button>
        </div>
        {goalError ? (
          <div style={{ fontSize: 11.5, color: 'var(--down)' }}>목표를 불러오지 못했어요: {goalError.message}</div>
        ) : isGoalPending ? (
          // 로딩과 "목표 미설정"을 반드시 구분한다 — 목표를 저장하고 돌아오면 쿼리가 무효화되어 다시 로딩 상태가 되는데,
          // 그 순간 "아직 목표를 설정하지 않았어요"가 뜨면 방금 한 저장이 실패한 것처럼 보인다.
          <div aria-busy style={CAPTION_STYLE}>불러오는 중…</div>
        ) : isGoalUnset ? (
          <div style={CAPTION_STYLE}>아직 목표를 설정하지 않았어요. 목표를 설정하면 연간·월간 진행률을 여기서 볼 수 있어요.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {goalRows.map((ag) => (
              <div key={ag.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ag.name}</div>
                  {ag.hasProgressData && <div style={{ fontSize: 12, fontWeight: 700, color: ag.color }}>{ag.percent}%</div>}
                </div>
                {ag.hasProgressData ? (
                  <>
                    <div style={{ height: 7, background: 'var(--track)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${ag.barPercent}%`, background: ag.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 6 }}>
                      {ag.currentText} / {ag.targetText}원
                    </div>
                  </>
                ) : null}
                <div style={{ fontSize: 11, color: 'var(--text-weak)', marginTop: 3 }}>{ag.subCaption}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={LAST_ROW_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div style={NAME_STYLE}>기준 통화</div>
          <div style={DESCRIPTION_STYLE}>원화 환산 기준</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <span style={VALUE_PILL_STYLE}>{settingsData ? CURRENCY_LABELS[settingsData.baseCurrency] : '—'}</span>
          {/* 다른 통화를 골라도 모든 응답이 원화 단일 필드라 화면이 하나도 안 바뀐다 — 통화 전환을 실제로 구현하려면
              백엔드가 응답에 적용 환율을 함께 내려줘야 한다. 그때까지는 "추후 업데이트" 배지로 표시한다. */}
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-mid)', background: 'var(--fill-subtle)', padding: '4px 9px', borderRadius: 8 }}>
            추후 업데이트
          </span>
        </div>
      </div>
    </div>
  )
}
