import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// 백엔드는 Supabase 다. 개발 서버 프록시는 없다 — 브라우저가 .env.local 의 VITE_SUPABASE_URL(기본 로컬 스택
// http://127.0.0.1:54321)을 직접 부른다(supabase-js, CORS 는 Supabase 가 허용). 운영 프로젝트에 붙이려면 .env.local 의
// 두 값만 바꾼다(그때 등록·삭제는 운영 데이터를 실제로 바꾼다).
// https://vite.dev/config/
// ELECTRON=1 (pnpm dev:desktop · build:desktop) 일 때만 Electron 메인·프리로드를 함께 빌드하고 개발 중엔 Electron 창을 띄운다.
// 그냥 pnpm dev / pnpm build 는 지금처럼 브라우저용이다(web 빌드 유지).
const desktop = process.env.ELECTRON === '1'

export default defineConfig({
  plugins: [
    react(),
    ...(desktop
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  // electron-updater·electron-log 는 번들하지 않고 node_modules 에서 읽는다(dependencies 에 있어야 설치 파일에 들어간다)
                  rollupOptions: { external: ['electron-updater', /^electron-log/] },
                },
              },
            },
            preload: {
              input: 'electron/preload.ts',
              vite: {
                build: {
                  outDir: 'dist-electron',
                  // sandbox: true 인 렌더러의 프리로드는 CommonJS 여야 한다. package.json 이 type: module 이라 .cjs 로 낸다
                  rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
                },
              },
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Electron 개발 창이 5173 을 보므로 포트를 고정한다(밀리면 빈 창). clearScreen: Electron 메인 로그가 Vite 화면 지우기에 묻히지 않게.
  clearScreen: false,
  server: {
    host: false,
    port: 5173,
    strictPort: true,
  },
})
