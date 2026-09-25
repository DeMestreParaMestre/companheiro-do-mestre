// Aba aberta durante um deploy: os arquivos da versão antiga somem do servidor e
// o próximo import dinâmico falha. Recarregar traz a versão nova.
const STALE = /dynamically imported module|importing a module script failed|failed to fetch dynamically/i
const KEY = 'nc_stale_reload'

export function isStaleChunkError(e: unknown): boolean {
  const msg = (e as { message?: unknown } | null)?.message
  return STALE.test(typeof msg === 'string' ? msg : String(e))
}

/** Recarrega a página, no máximo uma vez a cada 10 s (evita loop se o erro for outro). */
export function reloadForNewVersion(): boolean {
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (Date.now() - last < 10_000) return false
  sessionStorage.setItem(KEY, String(Date.now()))
  location.reload()
  return true
}
