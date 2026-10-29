// 자동 업데이트(electron-updater + GitHub Releases). 앱 시작 10초 뒤 한 번 조용히 확인하고, 있으면 렌더러에 알린다
// (설정 화면 하단 "새 버전" 한 줄). 내려받기·설치는 사용자가 누를 때만. 개발 중(패키징 안 됨)에는 확인하지 않는다.
// 맥은 코드 서명이 없으면 자동 설치가 되지 않는다 — 그때는 릴리스 페이지를 연다.
import { app, type BrowserWindow, ipcMain, shell } from 'electron'
import log from 'electron-log/main'
import updater from 'electron-updater'

const { autoUpdater } = updater
const RELEASES_URL = 'https://github.com/pilseung-jeonseoyeon/asset-frontend/releases/latest'
const FIRST_CHECK_DELAY_MS = 10_000

export function setupUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    getWindow()?.webContents.send('monit:update-available', { version: info.version })
  })
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall()
  })
  autoUpdater.on('error', (error) => {
    log.warn('[updater]', String(error))
  })

  ipcMain.handle('monit:check-update', async () => {
    if (!app.isPackaged) return null
    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.isUpdateAvailable ? { version: result.updateInfo.version } : null
    } catch (e) {
      log.warn('[updater] check failed', String(e))
      return null
    }
  })

  ipcMain.handle('monit:install-update', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (e) {
      // 미서명 맥·네트워크 오류 등 — 사람이 직접 받게 릴리스 페이지로
      log.warn('[updater] download failed, opening releases page', String(e))
      await shell.openExternal(RELEASES_URL)
    }
  })

  if (app.isPackaged) {
    setTimeout(() => {
      void autoUpdater.checkForUpdates().catch((e) => log.warn('[updater] startup check failed', String(e)))
    }, FIRST_CHECK_DELAY_MS)
  }
}
