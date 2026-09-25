import { describe, it, expect, vi } from 'vitest'
import {
  parseSemver,
  isPublishedNewer,
  readPublishedVersion,
  fetchPublishedVersion,
  checkForcedUpdate,
  applyAppUpdate,
  publishedVersionUrl
} from './appUpdate'

describe('parseSemver', () => {
  it('aceita com ou sem v', () => {
    expect(parseSemver('2.0.0')).toEqual([2, 0, 0])
    expect(parseSemver('v2.1.3')).toEqual([2, 1, 3])
  })

  it('rejeita lixo', () => {
    expect(parseSemver('')).toBeNull()
    expect(parseSemver('latest')).toBeNull()
  })
})

describe('isPublishedNewer', () => {
  it('só força quando a publicada é maior', () => {
    expect(isPublishedNewer('2.0.0', '2.0.1')).toBe(true)
    expect(isPublishedNewer('2.0.0', 'v2.1.0')).toBe(true)
    expect(isPublishedNewer('2.0.0', '3.0.0')).toBe(true)
    expect(isPublishedNewer('2.0.0', '2.0.0')).toBe(false)
    expect(isPublishedNewer('2.0.1', '2.0.0')).toBe(false)
  })

  it('não força se alguma versão for inválida', () => {
    expect(isPublishedNewer('2.0.0', 'nope')).toBe(false)
  })
})

describe('readPublishedVersion', () => {
  it('lê o JSON do deploy', () => {
    expect(readPublishedVersion({ version: '2.0.1' })).toBe('2.0.1')
    expect(readPublishedVersion({ version: 'v2.0.1' })).toBe('v2.0.1')
    expect(readPublishedVersion({ version: 2 })).toBeNull()
    expect(readPublishedVersion(null)).toBeNull()
  })
})

describe('fetchPublishedVersion', () => {
  it('usa cache: no-store e devolve a versão', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.1.0' })
    })
    await expect(fetchPublishedVersion(fetcher)).resolves.toBe('2.1.0')
    expect(fetcher.mock.calls[0][0]).toContain(publishedVersionUrl())
    expect(fetcher.mock.calls[0][1]).toEqual({ cache: 'no-store' })
  })

  it('ignora HTTP de erro', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false })
    await expect(fetchPublishedVersion(fetcher)).resolves.toBeNull()
  })
})

describe('checkForcedUpdate', () => {
  it('devolve as duas versões quando a aba está atrasada', async () => {
    await expect(checkForcedUpdate('2.0.0', async () => '2.0.1')).resolves.toEqual({
      running: '2.0.0',
      published: '2.0.1'
    })
  })

  it('não pede atualização se já está na última', async () => {
    await expect(checkForcedUpdate('2.0.1', async () => '2.0.1')).resolves.toBeNull()
  })
})

describe('applyAppUpdate', () => {
  it('pede update do SW e recarrega', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: async () => ({ update }) }
    })
    const reload = vi.fn()
    await applyAppUpdate(reload)
    expect(update).toHaveBeenCalled()
    expect(reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
