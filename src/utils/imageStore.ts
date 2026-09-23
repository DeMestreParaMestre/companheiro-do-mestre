import type { SupabaseClient } from '@supabase/supabase-js'
import type { Campaign } from '../types'
import { readAsDataUrl } from './image'

// Neste navegador as imagens ficam dentro da campanha (data URL): telas, modo
// offline e backup não mudam. Só na nuvem viram "sbimg:<sha256>", com o
// arquivo no Storage em <user_id>/<sha256>.
const BUCKET = 'images'
export const REF_PREFIX = 'sbimg:'

type Holder = { img?: string | null }

export function imageHolders(c: Campaign): Holder[] {
  return [...(c.fichas || []), ...(c.personagens || []), ...(c.itens || []), ...(c.references || [])]
}

const hashes = new Map<string, string>()
async function sha256(s: string): Promise<string> {
  const cached = hashes.get(s)
  if (cached) return cached
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  hashes.set(s, hex)
  return hex
}

/** Cópia da campanha no formato da nuvem + as imagens que ela referencia (hash → data URL). */
export async function toRemote(c: Campaign): Promise<{ data: Campaign; blobs: Map<string, string> }> {
  const data = JSON.parse(JSON.stringify(c)) as Campaign
  const blobs = new Map<string, string>()
  for (const h of imageHolders(data)) {
    if (!h.img?.startsWith('data:')) continue
    const hash = await sha256(h.img)
    blobs.set(hash, h.img)
    h.img = REF_PREFIX + hash
  }
  return { data, blobs }
}

/** Sobe as imagens que ainda não estão na nuvem. `uploaded` evita reenviar a cada sincronização. */
export async function uploadMissing(sb: SupabaseClient, uid: string, blobs: Map<string, string>, uploaded: Set<string>) {
  for (const [hash, dataUrl] of blobs) {
    if (uploaded.has(hash)) continue
    const blob = await (await fetch(dataUrl)).blob()
    const { error } = await sb.storage.from(BUCKET).upload(`${uid}/${hash}`, blob, { contentType: blob.type, upsert: false })
    // Já existe = subiu antes (por outro aparelho ou antes de limpar o navegador).
    if (error && !/already exists|duplicate/i.test(error.message)) throw error
    uploaded.add(hash)
  }
}

/**
 * Troca as referências pelas imagens, em `data` (modificado no lugar). Usa as que
 * já estão em `local` antes de baixar. Lança erro se alguma falhar, para a
 * sincronização tentar de novo em vez de gravar a campanha sem imagem.
 */
export async function fromRemote(sb: SupabaseClient, uid: string, data: Campaign, local: Campaign[]): Promise<Campaign> {
  const pending = imageHolders(data).filter((h) => h.img?.startsWith(REF_PREFIX))
  if (!pending.length) return data
  const known = new Map<string, string>()
  for (const h of local.flatMap(imageHolders)) {
    if (h.img?.startsWith('data:')) known.set(await sha256(h.img), h.img)
  }
  for (const h of pending) {
    const hash = h.img!.slice(REF_PREFIX.length)
    let url = known.get(hash)
    if (!url) {
      const { data: blob, error } = await sb.storage.from(BUCKET).download(`${uid}/${hash}`)
      if (error) throw error
      url = await readAsDataUrl(blob)
      known.set(hash, url)
    }
    h.img = url
  }
  return data
}

/** Apaga todos os arquivos do usuário (antes de excluir a conta). */
export async function removeAllImages(sb: SupabaseClient, uid: string) {
  const bucket = sb.storage.from(BUCKET)
  for (;;) {
    const { data: files, error } = await bucket.list(uid, { limit: 1000 })
    if (error) throw error
    if (!files.length) return
    const { data: removed, error: rmError } = await bucket.remove(files.map((f) => `${uid}/${f.name}`))
    if (rmError) throw rmError
    // Sem permissão de apagar, o Storage não dá erro: só não remove nada.
    if (!removed?.length) throw new Error('Não foi possível apagar as imagens da conta.')
  }
}
