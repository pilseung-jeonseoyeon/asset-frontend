// Centered app mark used while we can't render anything real yet: (1) AppShell shows this instead
// of a blank `—` while a *returning* visitor's silent session refresh is in flight (first-time
// visitors skip straight to the login screen — see AppShell.tsx), and (2) it doubles as the
// Suspense fallback for the lazy-loaded authenticated app chunk so the transition doesn't flash a
// different placeholder.
//
// 홈 화면 앱(iOS standalone)에서는 이 화면 직전에 iOS가 스플래시 이미지(public/pwa/splash/)를
// 보여주는데, 그 이미지는 *기기 화면 전체* 높이 기준 정중앙에 로고가 있다. 반면 웹뷰는 iOS가
// 상태바 아래부터 시작시키는 경우가 있어(측정: 393×852 기기에서 innerHeight 793 = 852 − 59),
// 웹뷰 기준으로 가운데를 잡으면 스플래시보다 (852−793)/2 ≈ 30pt 아래에 로고가 놓여 "로고가
// 아래로 튀는" 것처럼 보였다(2026-09-03, 프레임 픽셀 측정으로 확인). 그래서 standalone일 때는
// 화면 높이와 웹뷰 높이의 차이 절반만큼 로고를 위로 올려 스플래시와 같은 자리에 맞춘다.
// 상태바가 투명하게 겹쳐 그려져 웹뷰가 화면 전체를 차지하는 기기에서는 차이가 0이라 그대로다.
// navigator.standalone은 iOS 사파리 전용 속성이다 — 일반 브라우저 탭(주소창 때문에 innerHeight가
// 훨씬 작다)이나 안드로이드에서는 스플래시가 없거나 다른 방식이라 보정을 적용하지 않는다.

import { MonitLogo } from './MonitLogo'

function splashAlignmentShiftPx(): number {
  if (typeof window === 'undefined') return 0
  const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!standalone) return 0
  const gap = window.screen.height - window.innerHeight
  return gap > 0 ? gap / 2 : 0
}

export function BootScreen() {
  const shift = splashAlignmentShiftPx()

  return (
    <div
      aria-busy="true"
      aria-label="불러오는 중"
      className="full-height-center"
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas)',
      }}
    >
      <div style={{ width: 40, height: 40, transform: shift ? `translateY(-${shift}px)` : undefined }}>
        <MonitLogo />
      </div>
    </div>
  )
}
