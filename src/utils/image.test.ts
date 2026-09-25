import { describe, it, expect } from 'vitest'
import { IMAGE_TYPE_ERROR, isAllowedImageDataUrl, normalizeImageMime, sniffImageMime } from './image'

const PNG = 'data:image/png;base64,iVBORw0KGgo='
const SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='
const HTML_AS_PNG = 'data:image/png;base64,PGh0bWw+PHNjcmlwdD48L3NjcmlwdD48L2h0bWw+'

describe('image allowlist', () => {
  it('normaliza jpeg e recusa svg', () => {
    expect(normalizeImageMime('image/jpg')).toBe('image/jpeg')
    expect(normalizeImageMime('image/png')).toBe('image/png')
    expect(normalizeImageMime('image/svg+xml')).toBeNull()
    expect(normalizeImageMime('text/html')).toBeNull()
  })

  it('reconhece assinatura PNG e rejeita HTML', () => {
    expect(sniffImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageMime(new TextEncoder().encode('<svg'))).toBeNull()
  })

  it('só aceita data URL de imagem real permitida', () => {
    expect(isAllowedImageDataUrl(PNG)).toBe(true)
    expect(isAllowedImageDataUrl(SVG)).toBe(false)
    expect(isAllowedImageDataUrl(HTML_AS_PNG)).toBe(false)
    expect(IMAGE_TYPE_ERROR).toMatch(/JPEG/)
  })
})
