// 모바일(useIsMobile()이 true)에서 SidebarNav 대신 AppShell이 렌더하는 하단 탭 바
// (docs/mobile.md §3). 항목 목록은 navItems.ts의 NAV_ITEMS를 SidebarNav와 공유한다.
// 화면 좌우·아래에서 띄운 알약 모양으로 콘텐츠 위에 떠 있다(2026-09-04 사용자 결정) — 곡률
// 999px는 디자인 시스템 §5에 없는 값이라 하단탭에만 두는 예외다(§3).
// z-index 50 — 헤더 드롭다운 스크림(55), 드롭다운 메뉴(60), 전역 openDropdown 스크림(70),
// 모달(80+)보다 아래에 있어야 한다(§3).
//
// 탭은 진짜 <a>(react-router-dom의 Link)로 렌더한다 — 활성 상태는 useLocation()과 NAV_ITEMS의
// path를 맞춰 판단한다(SidebarNav와 같은 이유).

import { Link, useLocation } from 'react-router-dom'
import type { NavItem } from './navItems'
import { NAV_ITEMS } from './navItems'
import { Icon } from '../primitives/Icon/Icon'

function TabButton({ path, icon, label }: NavItem) {
  const location = useLocation()
  const active = location.pathname === path

  return (
    <Link
      to={path}
      aria-current={active ? 'page' : undefined}
      style={{
        flex: 1,
        minWidth: 44,
        minHeight: 44,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-weak)',
        fontFamily: 'inherit',
        textDecoration: 'none',
      }}
    >
      <Icon name={icon} size={22} />
      {/* nowrap — 좁은 기기(320~375px)에서 "대시보드"가 두 줄로 꺾여 알약 밖으로 잘리는 대신
          한 줄을 유지한다. */}
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  )
}

export function BottomTabNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        // 홈 인디케이터(env) 위로 12px 더 띄운다. 일반 브라우저 탭에서는 env가 0이라 12px.
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        zIndex: 50,
        height: 60,
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 999,
        boxShadow: 'var(--shadow-pop)',
        // 탭의 터치 영역(각 항목이 높이 100%를 채운다)이 알약 곡률 밖으로 삐져나오지 않게 한다.
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <TabButton key={item.screen} {...item} />
      ))}
    </nav>
  )
}
