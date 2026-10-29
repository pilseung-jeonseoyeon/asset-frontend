/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 프로젝트 URL (로컬 스택이면 http://127.0.0.1:54321) */
  readonly VITE_SUPABASE_URL: string
  /** Supabase anon(publishable) 키 — 공개 가능. 데이터 접근은 RLS 가 막는다 */
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
