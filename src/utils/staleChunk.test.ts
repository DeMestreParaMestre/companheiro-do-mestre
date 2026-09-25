import { describe, it, expect } from 'vitest'
import { isStaleChunkError } from './staleChunk'

describe('isStaleChunkError', () => {
  it('reconhece a falha de import dinâmico nos principais navegadores', () => {
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module: https://x/assets/dist-a.js'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('ignora outros erros', () => {
    expect(isStaleChunkError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isStaleChunkError({ message: 'Invalid login credentials' })).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})
