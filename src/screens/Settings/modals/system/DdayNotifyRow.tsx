// 시스템 관리의 '알림' 묶음 맨 위 줄: D-Day 알림(옛 '자산 · 가계부 맞춤 설정'에서 옮김, 2026-10-31).
// 모닛이 무엇을 알려줄지(예적금 만기)라 서버 사용자 설정에 저장돼 모든 기기에 같다 — 아래 '이 기기에만' 줄들과 다르다.
// 토글 규칙: Switch 프리미티브 + 독립 mutation 인스턴스 + 설정을 못 받아온 구간엔 스위치 대신 '—' 플레이스홀더
// (onMutate가 스냅샷을 못 찍어 롤백 대상이 없다).
// D-Day 알림 일수(서버 ddayNotifyDays)는 화면에서 고르지 않는다 — 우선 30일 전으로 고정한다(2026-09-27 사용자 결정).
// 서버는 여전히 이 값을 읽어 만기 알림을 거르므로, 설명 문구는 서버에 저장된 값을 그대로 적는다.

import { Switch } from '../../../../components/primitives/Switch/Switch'
import { useGetUserSettings, usePatchUserSettings } from '@/services/user'
import { DESCRIPTION_STYLE, ERROR_STYLE, NAME_STYLE, ROW_STYLE, VALUE_PILL_STYLE } from './systemStyles'

export function DdayNotifyRow() {
  const { settings, data: settingsData } = useGetUserSettings()
  const patchDday = usePatchUserSettings()

  return (
    <div style={ROW_STYLE}>
      <div style={{ minWidth: 0 }}>
        <div style={NAME_STYLE}>D-Day 알림</div>
        <div style={DESCRIPTION_STYLE}>{settingsData ? `예적금 만기 ${settingsData.ddayNotifyDays}일 전` : '예적금 만기 알림'}</div>
        {patchDday.error && <div style={ERROR_STYLE}>{patchDday.error.message}</div>}
      </div>
      {settingsData ? (
        <Switch
          label="D-Day 알림"
          checked={settings.ddayNotifyEnabled}
          disabled={patchDday.isPending}
          onChange={(next) => patchDday.mutate({ ddayNotifyEnabled: next })}
        />
      ) : (
        <span style={VALUE_PILL_STYLE}>—</span>
      )}
    </div>
  )
}
