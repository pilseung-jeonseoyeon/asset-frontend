// Source: docs/mobile.md §3 — fixed bottom tab bar rendered by AppShell instead of SidebarNav when
// useIsMobile() is true. Reuses NAV_ITEMS from navItems.ts (shared with SidebarNav) so the item list
// isn't duplicated. z-index 50 keeps it below the header dropdown scrim (55), dropdown menus (60), the
// global openDropdown scrim (70) and modals (80+) per §3.

import type { Screen } from '../../state/types'
import { NAV_ITEMS } from './navItems'
import { Icon } from '../primitives/Icon/Icon'
import { useAppState } from '../../state/AppStateContext'

function TabButton({ screen, icon, label }: { screen: Screen; icon: string; label: string }) {
  const { state, setState } = useAppState()
  const active = state.screen === screen

  return (
    <button
      onClick={() => setState({ screen })}
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
      }}
    >
      <Icon name={icon} size={22} />
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
    </button>
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
