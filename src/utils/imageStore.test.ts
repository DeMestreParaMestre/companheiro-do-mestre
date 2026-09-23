import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Campaign } from '../types'
import { toRemote, fromRemote, uploadMissing, REF_PREFIX } from './imageStore'

const IMG = 'data:image/png;base64,iVBORw0KGgo='
const camp = (img: string | null) =>
  ({ id: 'c1', name: 'X', fichas: [{ id: 1, name: 'Goblin', img }], personagens: [], itens: [], references: [] }) as unknown as Campaign

function fakeStorage() {
  const files = new Map<string, Blob>()
  const bucket = {
    upload: async (path: string, blob: Blob) => {
      if (files.has(path)) return { error: { message: 'The resource already exists' } }
      files.set(path, blob)
      return { error: null }
    },
    download: async (path: string) => (files.has(path) ? { data: files.get(path), error: null } : { data: null, error: new Error('Object not found') })
  }
  return { sb: { storage: { from: () => bucket } } as unknown as SupabaseClient, files }
}

describe('imageStore', () => {
  it('troca a imagem por referência e restaura com a que já está no navegador', async () => {
    const local = camp(IMG)
    const { data, blobs } = await toRemote(local)
    expect(data.fichas[0].img!.startsWith(REF_PREFIX)).toBe(true)
    expect(local.fichas[0].img).toBe(IMG)
    expect([...blobs.values()]).toEqual([IMG])

    await fromRemote(fakeStorage().sb, 'u1', data, [local])
    expect(data.fichas[0].img).toBe(IMG)
  })

  it('sobe cada imagem uma vez e aceita arquivo que já existe na nuvem', async () => {
    const { sb, files } = fakeStorage()
    const { blobs } = await toRemote(camp(IMG))
    const uploaded = new Set<string>()
    await uploadMissing(sb, 'u1', blobs, uploaded)
    await uploadMissing(sb, 'u1', blobs, new Set())
    expect(files.size).toBe(1)
    expect(uploaded.size).toBe(1)
  })

  it('falha se a imagem referenciada não existir (a sincronização tenta de novo)', async () => {
    const { data } = await toRemote(camp(IMG))
    await expect(fromRemote(fakeStorage().sb, 'u1', data, [])).rejects.toThrow()
  })
})
