// Source: secret/monit-symbol-spec.md §3-1(라이트) / §3-2(다크) — 확정 심볼 "볼 터미널 M".
// 좌표·두께·색은 규격 그대로이고 width/height만 사이드바 크기(40px)로 유지한다.
// 라이트/다크 전환은 base.css의 .monit-logo-light / .monit-logo-dark 표시 규칙을 그대로 쓴다.
// Extracted out of SidebarNav so the boot loading screen (AppShell) can reuse the exact same mark
// instead of a second copy drifting out of sync.
//
// 그라데이션·clipPath의 id는 useId()로 인스턴스마다 다르게 만든다. 정적 id로는 충돌한다 —
// AppShell의 <Suspense fallback={<BootScreen/>}>는 라우트 전환 중 기존 트리를 DOM에 남긴 채
// fallback을 함께 마운트하므로, SidebarNav의 로고와 BootScreen의 로고가 동시에 존재한다.
// id가 겹치면 나중 정의가 이겨 그라데이션이 엉뚱한 요소에 적용된다(규격 §4).

import { useId } from 'react'

export function MonitLogo() {
  // useId()는 «r0» 같은 특수문자를 포함한다 — url(#…) 참조가 깨지지 않도록 영숫자만 남긴다.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const overlayGradientLight = `monit-ov-${uid}L`
  const clipPathLight = `monit-clip-${uid}L`
  const backgroundGradientDark = `monit-bg-${uid}D`
  const overlayGradientDark = `monit-ov-${uid}D`
  const clipPathDark = `monit-clip-${uid}D`

  return (
    <>
      <svg className="monit-logo-light" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={overlayGradientLight} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipPathLight}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill="#2A2E5C" />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${overlayGradientLight})`} clipPath={`url(#${clipPathLight})`} />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
      </svg>
      <svg className="monit-logo-dark" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={backgroundGradientDark} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3F75" />
            <stop offset="1" stopColor="#1E2359" />
          </linearGradient>
          <linearGradient id={overlayGradientDark} gradientUnits="userSpaceOnUse" x1="38.48" y1="62.89" x2="47.46" y2="53.91">
            <stop offset="0" stopColor="#6761CD" stopOpacity="0" />
            <stop offset="1" stopColor="#6761CD" stopOpacity=".76" />
          </linearGradient>
          <clipPath id={clipPathDark}>
            <rect width="100" height="100" rx="24.26" ry="24.26" />
          </clipPath>
        </defs>
        <rect width="100" height="100" rx="24.26" ry="24.26" fill={`url(#${backgroundGradientDark})`} />
        <path d="M47.75 44.92 L47.75 91.8 L0.88 91.8 Z" fill={`url(#${overlayGradientDark})`} clipPath={`url(#${clipPathDark})`} />
        <circle cx="78.22" cy="27.15" r="5.57" fill="#6979F8" />
        <g fill="none" stroke="#FFFFFF" strokeWidth="14.16" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.95 67.38 L40.62 45.61" />
          <path d="M48.63 67.38 L71.48 45.61 L73.54 67.38" />
        </g>
        <rect x=".5" y=".5" width="99" height="99" rx="23.76" ry="23.76" fill="none" stroke="#FFFFFF" strokeOpacity=".08" strokeWidth="1" />
      </svg>
    </>
  )
}
