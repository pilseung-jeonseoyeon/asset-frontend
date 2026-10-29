// 설정 화면 맨 아래 "새 버전" 한 줄(스펙 6장). 데스크톱 앱에서만 뜨고, 메인 프로세스가 시작 10초 뒤 확인한 결과를 받는다.
// 누르면 내려받아 설치·재시작한다(맥 미서명이면 릴리스 페이지가 열린다). 브라우저에서는 아무것도 그리지 않는다.
import { useEffect, useState } from 'react'
import { isDesktopApp } from '../../utils/platform'
import { onUpdateAvailable, type AvailableUpdate } from '../../utils/appUpdate'

export function UpdateNotice() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => onUpdateAvailable(setUpdate), [])

  if (!isDesktopApp() || !update) return null
  return (
    <div style={{ marginBottom: 6 }}>
      새 버전 {update.version}이 있어요.{' '}
      <button
        type="button"
        className="tap-44"
        disabled={installing}
        aria-busy={installing}
        onClick={() => {
          setInstalling(true)
          void update.install().finally(() => setInstalling(false))
        }}
        style={{ border: 'none', background: 'transparent', padding: '4px 2px', font: 'inherit', color: 'var(--accent)', cursor: installing ? 'default' : 'pointer' }}
      >
        {installing ? '내려받는 중…' : '지금 업데이트'}
      </button>
    </div>
  )
}
