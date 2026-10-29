// 패키징된 앱은 dist/ 를 `app://monit` 커스텀 스킴으로 서빙한다 — file:// 로 열면 BrowserRouter 경로(/dashboard)가 깨지고
// localStorage 오리진도 애매해진다. 없는 경로는 index.html(SPA 폴백). 운영 CSP 는 이 응답 헤더로 넣는다.
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'

export const APP_SCHEME = 'app'
export const APP_HOST = 'monit'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
export const APP_URL = `${APP_ORIGIN}/`

/** app ready **전에** 한 번. standard 라야 상대 경로·localStorage 가 동작하고, secure 라야 isSecureContext(알림·crypto)가 참이 된다. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ])
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

/** index.html 의 인라인 <script>(테마 섬광 방지 5줄)에 CSP 해시를 준다 — 'unsafe-inline' 을 열지 않고도 동작하도록. */
async function inlineScriptHashes(indexHtml: string): Promise<string[]> {
  const html = await readFile(indexHtml, 'utf8')
  const hashes: string[] = []
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    hashes.push(`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`)
  }
  return hashes
}

/** 빌드에 박힌 Supabase 주소(로컬 스택이면 http://127.0.0.1:54321)를 connect-src 에 넣는다 — 운영은 https/wss, 로컬은 http/ws. */
function supabaseConnectSources(): string[] {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return ['https://*.supabase.co', 'wss://*.supabase.co']
  const origin = new URL(url).origin
  const ws = origin.replace(/^http/, 'ws')
  return [...new Set([origin, ws, 'https://*.supabase.co', 'wss://*.supabase.co'])]
}

async function buildCsp(distDir: string): Promise<string> {
  const scriptHashes = await inlineScriptHashes(path.join(distDir, 'index.html'))
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    `connect-src 'self' ${supabaseConnectSources().join(' ')}`,
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/** app ready **후**. dist/ 안의 파일만 내보내고(경로 탈출 차단), 확장자 없는 경로·없는 파일은 index.html. */
export async function serveDist(distDir: string): Promise<void> {
  const root = path.resolve(distDir)
  const csp = await buildCsp(root)
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== APP_HOST) return new Response('not found', { status: 404 })
    const relative = path.posix.normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, '')
    let filePath = path.resolve(root, relative)
    if (!filePath.startsWith(root + path.sep) && filePath !== root) return new Response('forbidden', { status: 403 })
    if (path.extname(filePath) === '' || !(await isFile(filePath))) filePath = path.join(root, 'index.html')
    const fileResponse = await net.fetch(pathToFileURL(filePath).toString())
    const headers = new Headers(fileResponse.headers)
    headers.set('Content-Security-Policy', csp)
    return new Response(fileResponse.body, { status: fileResponse.status, headers })
  })
}
