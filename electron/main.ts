// Electron 메인 프로세스 — 창 하나(1180×800, 최소 960×640), 보안 기본값(contextIsolation·sandbox, Node 비노출),
// 렌더러가 부를 수 있는 IPC 다섯 가지(파일 저장·외부 링크·배지·업데이트 확인/설치·버전), 자동 업데이트.
// 개발(pnpm dev:desktop)은 Vite 개발 서버(VITE_DEV_SERVER_URL)를, 패키징된 앱은 app://monit(protocol.ts)을 연다.
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import log from 'electron-log/main'
import { APP_ORIGIN, APP_URL, registerAppScheme, serveDist } from './protocol.ts'
import { setupUpdater } from './updater.ts'

const here = path.dirname(fileURLToPath(import.meta.url)) // dist-electron/
const DEV_URL = process.env.VITE_DEV_SERVER_URL // vite-plugin-electron 이 개발 중에만 넣어 준다
const DIST_DIR = path.join(here, '..', 'dist')
const PRELOAD = path.join(here, 'preload.cjs')
const APP_ID = 'kr.io.monit.desktop'
/** 개발 확인용: PNG 경로를 주면 첫 화면이 뜨고 3초 뒤 창을 찍어 저장하고 종료한다(창을 눈으로 볼 수 없는 자동 검증에 쓴다). */
const SMOKE_PNG = process.env.MONIT_SMOKE

/** 저장 창의 파일 종류 라벨(src/utils/saveFile.ts 와 같은 표). */
const FILTER_NAMES: Record<string, string> = { xlsx: '엑셀 파일', png: 'PNG 이미지' }

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = 'info'

app.setAppUserModelId(APP_ID)
registerAppScheme()

let mainWindow: BrowserWindow | null = null

function isAllowedOrigin(url: string): boolean {
  try {
    const origin = new URL(url).origin
    return origin === APP_ORIGIN || (DEV_URL !== undefined && origin === new URL(DEV_URL).origin)
  } catch {
    return false
  }
}

/** https 만. 그 밖(javascript:, file:, 커스텀 스킴)은 거부 — 렌더러가 넘긴 값을 믿지 않는다. */
async function openExternalHttps(url: string): Promise<void> {
  const parsed = new URL(String(url))
  if (parsed.protocol !== 'https:') throw new Error('https 링크만 열 수 있어요')
  await shell.openExternal(parsed.toString())
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: 'Monit',
    width: 1180,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#F4F5F7',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  win.once('ready-to-show', () => win.show())
  // 새 창(target=_blank)·외부 이동은 모두 막고, https 면 기본 브라우저로 넘긴다
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void openExternalHttps(url).catch((e) => log.warn('openExternal', String(e)))
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (isAllowedOrigin(url)) return
    event.preventDefault()
    if (url.startsWith('https://')) void openExternalHttps(url).catch((e) => log.warn('openExternal', String(e)))
  })
  // 렌더러 콘솔을 메인 로그로 — 개발·스모크 때 CSP 위반이나 오류를 터미널에서 본다
  win.webContents.on('console-message', (event) => {
    const { level, message, sourceId, lineNumber } = event as unknown as { level: string; message: string; sourceId: string; lineNumber: number }
    log.info(`[renderer:${level}] ${message} (${sourceId}:${lineNumber})`)
  })
  if (SMOKE_PNG) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await win.webContents.capturePage()
          await writeFile(SMOKE_PNG, image.toPNG())
          log.info('[smoke] saved', SMOKE_PNG, image.getSize())
        } catch (e) {
          log.error('[smoke] failed', String(e))
        } finally {
          app.quit()
        }
      }, 3000)
    })
  }
  void win.loadURL(DEV_URL ?? APP_URL)
  win.on('closed', () => {
    mainWindow = null
  })
  return win
}

// ----- IPC(프리로드 api 와 1:1) -----
ipcMain.handle('monit:version', () => app.getVersion())

ipcMain.handle('monit:save-file', async (event, filename: unknown, bytes: unknown) => {
  const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
  // 렌더러가 준 이름은 파일 이름으로만 쓴다(경로 구분자·금지 문자 제거)
  const safeName = path.basename(String(filename)).replace(/[\\/:*?"<>|]/g, '_') || 'monit-file'
  const extension = path.extname(safeName).slice(1).toLowerCase()
  const { canceled, filePath } = await dialog.showSaveDialog(owner!, {
    defaultPath: path.join(app.getPath('downloads'), safeName),
    filters: extension ? [{ name: FILTER_NAMES[extension] ?? '파일', extensions: [extension] }] : undefined,
  })
  if (canceled || !filePath) return 'cancelled'
  if (!(bytes instanceof Uint8Array)) throw new Error('bytes 가 필요해요')
  await writeFile(filePath, bytes)
  return 'saved'
})

ipcMain.handle('monit:open-external', (_event, url: unknown) => openExternalHttps(String(url)))

ipcMain.handle('monit:set-badge', (_event, count: unknown) => {
  const n = Number(count)
  app.setBadgeCount(Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)
})

// ----- 앱 생명주기 -----
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    if (!DEV_URL) await serveDist(DIST_DIR)
    mainWindow = createWindow()
    setupUpdater(() => mainWindow)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
