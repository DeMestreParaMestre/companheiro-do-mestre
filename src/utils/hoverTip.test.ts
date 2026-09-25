import { describe, it, expect } from 'vitest'
import { placeHoverTip } from './hoverTip'

describe('placeHoverTip', () => {
  it('abre abaixo quando há espaço', () => {
    const p = placeHoverTip({ top: 40, left: 20, bottom: 60 }, { width: 200, height: 80 }, { w: 800, h: 600 })
    expect(p.top).toBe(66)
    expect(p.left).toBe(20)
  })

  it('abre acima quando não cabe no rodapé', () => {
    const p = placeHoverTip({ top: 520, left: 20, bottom: 540 }, { width: 200, height: 80 }, { w: 800, h: 560 })
    expect(p.top).toBe(434)
  })

  it('não sai pela direita nem pela esquerda', () => {
    const p = placeHoverTip({ top: 10, left: 700, bottom: 30 }, { width: 200, height: 40 }, { w: 800, h: 400 })
    expect(p.left).toBe(592)
    const q = placeHoverTip({ top: 10, left: -20, bottom: 30 }, { width: 200, height: 40 }, { w: 800, h: 400 })
    expect(q.left).toBe(8)
  })
})
