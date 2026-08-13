// Centered app mark used while we can't render anything real yet: (1) AppShell shows this instead
// of a blank `—` while a *returning* visitor's silent session refresh is in flight (first-time
// visitors skip straight to the login screen — see AppShell.tsx), and (2) it doubles as the
// Suspense fallback for the lazy-loaded authenticated app chunk so the transition doesn't flash a
// different placeholder.

import { MonitLogo } from './MonitLogo'

export function BootScreen() {
  return (
    <div
      aria-busy="true"
      aria-label="불러오는 중"
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas)',
      }}
    >
      <div style={{ width: 40, height: 40 }}>
        <MonitLogo />
      </div>
    </div>
  )
}
