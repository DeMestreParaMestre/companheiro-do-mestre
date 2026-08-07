import { describe, it, expect } from 'vitest'
import { parseTableContent, serializeTableContent, emptyTable } from './refTable'

describe('refTable', () => {
  it('converte formato legado CSV', () => {
    const data = parseTableContent('Nome, Valor\nEspada, +1')
    expect(data.cells).toEqual([
      ['Nome', 'Valor'],
      ['Espada', '+1']
    ])
  })

  it('converte formato legado com ponto e vírgula', () => {
    const data = parseTableContent('A; B\n1; 2')
    expect(data.cells[0]).toEqual(['A', 'B'])
  })

  it('serializa e reparseia JSON', () => {
    const raw = serializeTableContent(emptyTable(2, 2))
    const data = parseTableContent(raw)
    expect(data.v).toBe(1)
    expect(data.cells.length).toBe(2)
    expect(data.align[0][0]).toBe('left')
  })
})
