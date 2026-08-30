// 모바일(useIsMobile()이 true)에서 SidebarNav 대신 AppShell이 렌더하는 고정 하단 탭 바
// (docs/mobile.md §3). 항목 목록은 navItems.ts의 NAV_ITEMS를 SidebarNav와 공유한다.
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
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
    </Link>
  )
}

export function BottomTabNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--surface)',
        borderTop: '0.5px solid var(--border)',
        display: 'flex',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <TabButton key={item.screen} {...item} />
      ))}
    </nav>
  )
}
