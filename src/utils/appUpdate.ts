// 데스크톱 앱 자동 업데이트의 렌더러 쪽(스펙 6장). 메인 프로세스(electron/updater.ts)가 GitHub Releases 를 확인하고,
// 여기서는 "새 버전이 있는가"를 묻고 "설치"를 부탁할 뿐이다. 브라우저에서는 항상 null.
import { desktopApi } from './platform'

export interface AvailableUpdate {
  version: string
  /** 내려받아 설치하고 재시작한다. 맥에서 서명이 없으면 메인이 릴리스 페이지를 대신 연다. */
  install: () => Promise<void>
}

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const desktop = desktopApi()
  if (!desktop) return null
  try {
    const info = await desktop.checkForUpdate()
    return info ? { version: info.version, install: () => desktop.installUpdate() } : null
  } catch {
    return null
  }
}

/** 메인이 시작 10초 뒤 스스로 확인해 알려 올 때. 구독 해제 함수를 돌려준다(브라우저면 아무 일도 안 함). */
export function onUpdateAvailable(callback: (update: AvailableUpdate) => void): () => void {
  const desktop = desktopApi()
  if (!desktop) return () => {}
  return desktop.onUpdateAvailable((info) => callback({ version: info.version, install: () => desktop.installUpdate() }))
}
