import { APP_VERSION } from './appVersion'

export const VERSION_JSON = 'version.json'
export const UPDATE_CHECK_MS = 5 * 60 * 1000

/** `2.0.1` ou `v2.0.1` → tupla; lixo → null. */
export function parseSemver(raw: string): [number, number, number] | null {
  const m = raw.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** True se a versão publicada é estritamente maior que a que esta aba carregou. */
export function isPublishedNewer(running: string, published: string): boolean {
  const a = parseSemver(running)
  const b = parseSemver(published)
  if (!a || !b) return false
  if (b[0] !== a[0]) return b[0] > a[0]
  if (b[1] !== a[1]) return b[1] > a[1]
  return b[2] > a[2]
}

export function publishedVersionUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}${VERSION_JSON}`
}

export function readPublishedVersion(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const version = (data as { version?: unknown }).version
  return typeof version === 'string' && parseSemver(version) ? version : null
}

export async function fetchPublishedVersion(
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const res = await fetcher(`${publishedVersionUrl()}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return null
  return readPublishedVersion(await res.json())
}

export async function checkForcedUpdate(
  running = APP_VERSION,
  load: () => Promise<string | null> = fetchPublishedVersion
): Promise<{ running: string; published: string } | null> {
  const published = await load()
  if (!published || !isPublishedNewer(running, published)) return null
  return { running, published }
}

/** Recarrega depois de pedir o service worker para buscar a build nova. */
export async function applyAppUpdate(
  reload: () => void = () => location.reload()
): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch {
    /* offline ou sem SW: o reload ainda tenta a rede */
  }
  reload()
}
