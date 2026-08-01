// Source: secret/Asset Manager v14.dc.html L704-758 (SIDEBAR) — transcribed verbatim.
// Vertical sidebar: outer aside 96px, inner surface box 64px, logo (light/dark SVG swap via CSS class,
// L710-731 fixed hex — see plan §"Monit 로고 색상" decision: kept literal, not tokenized), 5 nav buttons
// (navStyle/navHover from state/selectors/nav.ts), avatar (36px, opens modalAccount).

import { useState } from 'react'
import type { Screen } from '../../state/types'
import { useAppState } from '../../state/AppStateContext'
import { navHover, navStyle } from '../../state/selectors/nav'
import { getAvatarInitial } from '../primitives/Avatar/Avatar'

const NAV_ITEMS: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'dashboard', icon: 'grid_view', label: '대시보드' },
  { screen: 'asset', icon: 'account_balance_wallet', label: '자산' },
  { screen: 'stock', icon: 'trending_up', label: '주식' },
  { screen: 'ledger', icon: 'receipt_long', label: '가계부' },
  { screen: 'settings', icon: 'settings', label: '설정' },
]

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

function MonitLogo() {
  return (
    <div style={{ marginBottom: 30 }}>
      <svg className="monit-logo-light" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="monit-bg-01" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#363C74" />
            <stop offset="1" stopColor="#1F2247" />
          </linearGradient>
        </defs>
        <path d="M50,0 C14,0 0,14 0,50 C0,86 14,100 50,100 C86,100 100,86 100,50 C100,14 86,0 50,0 Z" fill="url(#monit-bg-01)" />
        <path d="M28,62 L28,34 L50,55 L72,34 L72,74" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="68" r="8.5" fill="#ABA5E4" />
      </svg>
      <svg className="monit-logo-dark" width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="monit-bg-02" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3F75" />
            <stop offset="1" stopColor="#1E2359" />
          </linearGradient>
        </defs>
        <path
          d="M50,0 C14,0 0,14 0,50 C0,86 14,100 50,100 C86,100 100,86 100,50 C100,14 86,0 50,0 Z"
          fill="url(#monit-bg-02)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
        <path d="M28,62 L28,34 L50,55 L72,34 L72,74" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="68" r="8.5" fill="#B9B2F4" />
      </svg>
    </div>
  )
}

export function SidebarNav() {
  const { state, setState } = useAppState()
  const initial = getAvatarInitial(state.profileName)

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
        <MonitLogo />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center', flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.screen} {...item} />
          ))}
        </nav>
        <div
          onClick={() => setState({ modalOpen: 'account', accountModalView: 'main', withdrawConfirmOpen: false })}
          title={state.profileName}
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
