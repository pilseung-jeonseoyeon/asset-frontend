/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 프로젝트 URL (로컬 스택이면 http://127.0.0.1:54321) */
  readonly VITE_SUPABASE_URL: string
  /** Supabase 공개 키(Publishable · sb_publishable_…) — 공개 가능. 데이터 접근은 RLS 가 막는다 */
  readonly VITE_SUPABASE_PUBLIC_KEY: string
  /** 옛 이름(2026-10-31 VITE_SUPABASE_PUBLIC_KEY 로 바꿈). 이미 만든 .env.local 을 위해 잠시 같이 읽는다 */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
