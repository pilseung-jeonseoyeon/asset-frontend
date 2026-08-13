// Source: secret/Asset Manager v14.dc.html L710-731 (logo SVG, light/dark swap via CSS class —
// see SidebarNav.tsx header note on why the hex values stay literal, not tokenized).
// Extracted out of SidebarNav so the boot loading screen (AppShell) can reuse the exact same mark
// instead of a second copy drifting out of sync.

export function MonitLogo() {
  return (
    <>
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
    </>
  )
}
