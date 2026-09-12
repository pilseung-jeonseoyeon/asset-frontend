import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 서버(pnpm dev)가 `/api` 요청을 대신 전달할 백엔드 주소.
//
// 기본값이 운영 API인 이유: 로컬에 백엔드(스프링)를 띄우지 않는 사람도 `git pull` → `pnpm dev`만으로
// 화면을 볼 수 있어야 해서다. 브라우저는 같은 출처(localhost:5173)로만 요청하고 개발 서버가 대신
// 운영 API를 부르므로, 백엔드의 CORS 허용 목록이나 refresh_token 쿠키의 SameSite 설정과 무관하게
// 로그인 유지가 동작한다. VITE_API_BASE_URL이 비어 있으면 코드 기본값이 상대 경로 /api/v1이라
// (src/services/api.ts의 API_BASE_URL) .env 파일 없이도 이 프록시를 탄다. 반대로 .env에 절대 URL을 넣으면
// 브라우저가 프록시를 건너뛰고 직접 부르니, 로컬 개발에서는 그 변수를 비워 둔다.
//
// 로컬 백엔드로 개발할 때는 .env.local(gitignore됨)에 한 줄만 넣으면 된다:
//   VITE_DEV_PROXY_TARGET=http://localhost:8080
//
// 주의: 기본값으로 붙는 곳은 운영 DB다 — 로컬 화면에서 등록·삭제하면 실제 데이터가 바뀐다.
const DEFAULT_DEV_PROXY_TARGET = 'https://api.monit.io.kr'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || DEFAULT_DEV_PROXY_TARGET

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          // Host 헤더를 대상 도메인으로 바꾼다. 안 바꾸면 운영 Nginx가 localhost 호스트를 몰라
          // 다른 사이트나 404로 보낼 수 있다.
          changeOrigin: true,
          secure: true,
          // 서버가 Set-Cookie에 Domain=monit.io.kr을 붙여도 localhost 쿠키로 저장되게 Domain을 지운다.
          cookieDomainRewrite: '',
          configure(proxy) {
            // 브라우저가 붙이는 Origin 헤더를 떼고 보낸다. 운영 백엔드는 허용 목록에 없는 Origin을
            // 403 "Invalid CORS request"로 거부하는데(2026-09-12 확인: localhost:5173만 허용), 개발 서버
            // 포트가 5174·5175로 밀리면 그대로 막힌다. Origin이 없으면 같은 출처 요청으로 취급되어 통과한다.
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
            })
            // 개발 서버는 http라, `Secure`가 붙은 쿠키를 브라우저에 따라(특히 Safari) 저장하지 않는다.
            // refresh_token 쿠키가 저장되지 않으면 새로고침할 때마다 로그인이 풀리므로 개발 서버에서만 떼어낸다.
            proxy.on('proxyRes', (proxyRes) => {
              const cookies = proxyRes.headers['set-cookie']
              if (!cookies) return
              proxyRes.headers['set-cookie'] = cookies.map((cookie) => cookie.replace(/;\s*secure(?=;|$)/gi, ''))
            })
          },
        },
      },
    },
  }
})
