// 세로 사이드바: 바깥 aside 96px, 안쪽 surface 박스 64px, 로고(라이트/다크 SVG를 CSS 클래스로
// 교체 — 색은 리터럴 hex 그대로 두고 토큰화하지 않는다), 내비 버튼 5개
// (state/selectors/nav.ts의 sidebarNavItemStyle/sidebarNavHoverStyle),
// 아바타(36px, modalAccount를 연다).
//
// 내비 항목은 <button>이 아니라 진짜 <a>(react-router-dom의 Link)로 렌더해 새 탭으로 열기·링크
// 복사가 동작하게 한다 — 활성 상태는 AppState가 아니라 useLocation()과 NAV_ITEMS의 path로
// 판단한다(현재 화면의 정본은 URL이다, docs/architecture.md).

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { NavItem } from './navItems'
import { NAV_ITEMS } from './navItems'
import { MonitLogo } from './MonitLogo'
import { Avatar } from '../primitives/Avatar/Avatar'
import { useAppState } from '../../state/AppStateContext'
import { sidebarNavHoverStyle, sidebarNavItemStyle } from '../../state/selectors/nav'
import { useProfileName } from '@/services/user'

function NavButton({ path, icon, label }: NavItem) {
  const location = useLocation()
  const [hovered, setHovered] = useState(false)
  const active = location.pathname === path

  return (
    <Link
      to={path}
      className="navbtn"
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textDecoration: 'none', ...sidebarNavItemStyle(active), ...(hovered ? sidebarNavHoverStyle(active) : null) }}
    >
      <span className="ms" style={{ fontSize: 23 }}>
        {icon}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
    </Link>
  )
}

export function SidebarNav() {
  const { setState } = useAppState()
  const profileName = useProfileName()

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
          {/* Avatar 프리미티브 재사용 — 이름이 아직 안 왔을 때(빈 문자열) person 아이콘으로 폴백해
              빈 원만 보이는 문제를 없앤다(13-2/13-4). */}
          <Avatar name={profileName} size="s" />
        </div>
      </div>
    </aside>
  )
}
