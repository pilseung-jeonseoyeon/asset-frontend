// 렌더러(앱 화면)에 노출하는 데스크톱 기능 — 이 다섯 가지뿐이다. sandbox: true 라 Node 는 쓸 수 없고 ipcRenderer 로 메인에 부탁한다.
// 프론트는 window.monit 의 존재로 데스크톱인지 안다(src/utils/platform.ts). 타입은 src/types/monit-desktop.d.ts 와 같아야 한다.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

interface UpdateInfo {
  version: string
}

const api = {
  platform: process.platform,
  version: (): Promise<string> => ipcRenderer.invoke('monit:version'),
  /** 저장 창을 띄워 고른 경로에 쓴다. 사용자가 취소하면 'cancelled'. */
  saveFile: (filename: string, bytes: Uint8Array): Promise<'saved' | 'cancelled'> => ipcRenderer.invoke('monit:save-file', filename, bytes),
  /** https 링크만 기본 브라우저로 연다. */
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('monit:open-external', url),
  /** 독 아이콘 배지(맥·리눅스). 0 이면 지운다. */
  setBadgeCount: (count: number): Promise<void> => ipcRenderer.invoke('monit:set-badge', count),
  checkForUpdate: (): Promise<UpdateInfo | null> => ipcRenderer.invoke('monit:check-update'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('monit:install-update'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on('monit:update-available', handler)
    return () => ipcRenderer.removeListener('monit:update-available', handler)
  },
}

contextBridge.exposeInMainWorld('monit', api)
