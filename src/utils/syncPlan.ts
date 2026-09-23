import type { Campaign } from '../types'

/** Estado da campanha na nuvem (lista leve, sem o JSON). */
export interface RemoteMeta {
  version: number
  deleted: boolean
}

/** O que este navegador sabia na última sincronização bem-sucedida. */
export interface SyncedMeta {
  version: number
  hash: string
}

export type SyncAction = 'none' | 'upload' | 'download' | 'deleteLocal' | 'deleteRemote' | 'conflict' | 'forget'

/**
 * Decide o que fazer com uma campanha. Regra de ouro: na dúvida, nunca apagar
 * nem sobrescrever sem perguntar (conflict) e, sem pedido explícito de exclusão,
 * restaurar da nuvem em vez de apagar lá.
 *
 * localHash: hash do JSON local atual (null = não existe neste navegador).
 * tombstoned: o mestre apagou esta campanha aqui desde a última sincronização.
 */
export function decide(localHash: string | null, synced: SyncedMeta | undefined, remote: RemoteMeta | undefined, tombstoned: boolean): SyncAction {
  if (localHash !== null) {
    if (!remote) return 'upload'
    const localChanged = !synced || localHash !== synced.hash
    if (remote.deleted) return synced && !localChanged ? 'deleteLocal' : 'conflict'
    const remoteChanged = !synced || remote.version !== synced.version
    if (!localChanged && !remoteChanged) return 'none'
    if (!localChanged) return 'download'
    if (!remoteChanged) return 'upload'
    return 'conflict'
  }
  if (!remote || remote.deleted) return synced ? 'forget' : 'none'
  // Apagada aqui e ninguém mexeu na nuvem desde então: apaga lá. Se mudou lá, restaura.
  if (tombstoned && synced && synced.version === remote.version) return 'deleteRemote'
  return 'download'
}

/** Hash rápido (cyrb53) — só para detectar mudança, não é criptográfico. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/** JSON com chaves ordenadas: o jsonb do Postgres reordena as chaves, então só assim dá para comparar conteúdo. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']'
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return (
      '{' +
      Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonicalJson(o[k]))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(v) ?? 'null'
}

const CONTENT_KEYS = [
  'diary',
  'fichas',
  'party',
  'creatures',
  'personagens',
  'itens',
  'references',
  'songs',
  'playlists',
  'encounters',
  'combatLog'
] as const

/** Campanha sem nenhum conteúdo (ex.: a "Campanha Principal" criada automaticamente num navegador novo). */
export function isEmptyCampaign(c: Campaign): boolean {
  return CONTENT_KEYS.every((k) => !(c[k] as unknown[] | undefined)?.length)
}
