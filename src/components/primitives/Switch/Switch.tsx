// 저장소 최초의 재사용 토글 프리미티브. 기존에는 같은 정적 마크업(TOGGLE_ON_STYLE/TOGGLE_KNOB_STYLE)이
// GeneralModal.tsx·CustomModal.tsx 두 곳에 복붙되어 있었고 둘 다 onClick이 없는 장식용이었다.
// 이 컴포넌트는 그 시각 규격(트랙 42×24/radius 8, 노브 20×20/radius 999)을 그대로 유지하면서
// `role="switch"` + 네이티브 button으로 키보드 조작(Enter/Space)과 포커스를 갖춘다.
//
// 꺼짐(OFF) 상태 색: 대비비 근거로 확정함(라이트 6.0:1 / 다크 7.13:1). 기존 마크업에는 OFF
// 스타일 자체가 없었고 secret/ds_rules_v2_5.md에도 스위치 규격이 없어(문서에 없는 세부는 추측
// 금지 원칙 — CLAUDE.md 절대 규칙 4), 트랙 색은 흰 노브/카드 대비 기준으로 골랐다. `--text-weak`는
// 라이트 모드에서 2.63:1로 UI 컴포넌트 권장 3:1에 못 미쳐 `--text-mid`로 확정했다(토큰 실값:
// 라이트 --text-mid #5B6470/--text-weak #9AA0AC, 다크 --text-mid #A6ADB8/--text-weak #6D7480).
// 노브 `var(--surface)`는 라이트/다크 두 테마 모두에서 트랙 대비 명도차가 뚜렷해 그대로 둔다.

import type { CSSProperties } from 'react'
import { useIsMobile } from '../../../utils/useMediaQuery'

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}

const TRACK_STYLE: CSSProperties = {
  // <span>은 기본 display가 inline이라 width/height가 무시된다 — 트랙 42×24가 그려지려면
  // block(또는 inline-flex 등 크기를 갖는 display)이 필요하다. StatBadge.tsx의 <span>이
  // inline-flex를 명시하는 것과 같은 이유(리뷰 #1).
  display: 'block',
  position: 'relative',
  width: 42,
  height: 24,
  borderRadius: 8,
  transition: 'background .15s',
}

const KNOB_STYLE: CSSProperties = {
  position: 'absolute',
  top: 2,
  width: 20,
  height: 20,
  background: 'var(--surface)',
  borderRadius: 999,
  transition: 'left .15s, right .15s',
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  const isMobile = useIsMobile()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        // 데스크톱은 패딩 없이 트랙 그대로가 버튼 크기다. 모바일은 44px 터치 타깃 확보를 위해
        // 세로로만 패딩을 준다 — GeneralModal.tsx 헤더 주석이 명시한 기존 방침(데스크톱 불변,
        // 모바일만 세로 확장)과 동일하게 트랙 자체의 시각 크기는 바꾸지 않는다.
        padding: isMobile ? '10px 0' : 0,
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        fontFamily: 'inherit',
        display: 'block',
      }}
    >
      <span style={{ ...TRACK_STYLE, background: checked ? 'var(--accent)' : 'var(--text-mid)' }}>
        <span style={{ ...KNOB_STYLE, left: checked ? undefined : 2, right: checked ? 2 : undefined }} />
      </span>
    </button>
  )
}
