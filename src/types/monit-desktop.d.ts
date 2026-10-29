// Electron 프리로드(electron/preload.ts)가 contextBridge 로 노출하는 window.monit 의 모양. 브라우저에선 undefined 다.
// 두 파일을 같이 고친다.
interface MonitDesktopUpdateInfo {
  version: string
}

interface MonitDesktopApi {
  platform: string
  version(): Promise<string>
  saveFile(filename: string, bytes: Uint8Array): Promise<'saved' | 'cancelled'>
  openExternal(url: string): Promise<void>
  setBadgeCount(count: number): Promise<void>
  checkForUpdate(): Promise<MonitDesktopUpdateInfo | null>
  installUpdate(): Promise<void>
  onUpdateAvailable(callback: (info: MonitDesktopUpdateInfo) => void): () => void
}

interface Window {
  monit?: MonitDesktopApi
}
