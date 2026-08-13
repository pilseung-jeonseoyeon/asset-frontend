// Source: secret/Asset Manager v14.dc.html L704-758 (SIDEBAR) — transcribed verbatim.
// Vertical sidebar: outer aside 96px, inner surface box 64px, logo (light/dark SVG swap via CSS class,
// L710-731 fixed hex — see plan §"Monit 로고 색상" decision: kept literal, not tokenized), 5 nav buttons
// (navStyle/navHover from state/selectors/nav.ts), avatar (36px, opens modalAccount).

import { useState } from 'react'
import type { Screen } from '../../state/types'
import { NAV_ITEMS } from './navItems'
import { MonitLogo } from './MonitLogo'
import { getAvatarInitial } from '../primitives/Avatar/Avatar'
import { useAppState } from '../../state/AppStateContext'
import { navHover, navStyle } from '../../state/selectors/nav'
import { useProfileName } from '@/services/user'

function NavButton({ screen, icon, label }: { screen: Screen; icon: string; label: string }) {
  const { state, setState } = useAppState()
  const [hovered, setHovered] = useState(false)
  const active = state.screen === screen

  return (
    <button
      className="navbtn"
      onClick={() => setState({ screen })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...navStyle(active), ...(hovered ? navHover(active) : null) }}
    >
      <span className="ms" style={{ fontSize: 23 }}>
        {icon}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
    </button>
  )
}

export function SidebarNav() {
  const { setState } = useAppState()
  const profileName = useProfileName()
  const initial = getAvatarInitial(profileName)

  return (
    <aside
      style={{
        width: 96,
        flex: 'none',
        padding: '18px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div
        style={{
          width: 64,
          height: '100%',
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '22px 0',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <MonitLogo />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center', flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.screen} {...item} />
          ))}
        </nav>
        <div
          onClick={() => setState({ modalOpen: 'account', accountModalView: 'main', withdrawConfirmOpen: false })}
          title={profileName}
          style={{ position: 'relative', width: 36, height: 36, flex: 'none', cursor: 'pointer' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'var(--deep-bg)',
              color: 'var(--deep-value)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '-0.01em',
              boxSizing: 'border-box',
              border: '0.5px solid var(--deep-border)',
            }}
          >
            {initial}
          </div>
        </div>
      </div>
    </aside>
  )
}
