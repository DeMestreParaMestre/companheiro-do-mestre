/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_RELEASE?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.json' {
  const value: { version: string }
  export const version: string
  export default value
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
