// Source: docs/mobile.md §3 — fixed bottom tab bar rendered by AppShell instead of SidebarNav when
// useIsMobile() is true. Reuses NAV_ITEMS from navItems.ts (shared with SidebarNav) so the item list
// isn't duplicated. z-index 50 keeps it below the header dropdown scrim (55), dropdown menus (60), the
// global openDropdown scrim (70) and modals (80+) per §3.
//
// Tabs render as real <a> (react-router-dom's Link) — active state comes from useLocation() against
// NAV_ITEMS' path, same reasoning as SidebarNav.

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
