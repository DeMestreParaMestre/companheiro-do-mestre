import { describe, it, expect } from 'vitest'
import type { Creature } from '../types'
import { applyLegendaryFields, legendaryFromForm } from './legendary'

function goblin(extra: Partial<Creature> = {}): Creature {
  return {
    id: 1,
    name: 'Goblin',
    init: 10,
    initReal: 10,
    hp: 7,
    hpMax: 7,
    ac: 15,
    fichaId: '',
    dead: false,
    conditions: [],
    ...extra
  }
}

describe('legendaryFromForm', () => {
  it('grava 3/3 quando a ficha é lendária sem máximos', () => {
    expect(legendaryFromForm(true, '', '')).toEqual({
      isLegendary: true,
      legActionsMax: 3,
      legResistMax: 3
    })
  })
  it('desliga na ficha', () => {
    expect(legendaryFromForm(false).isLegendary).toBe(false)
  })
})

describe('applyLegendaryFields', () => {
  it('liga com 3 usos quando os máximos vêm vazios', () => {
    const c = goblin()
    applyLegendaryFields(c, { isLegendary: true, actionsMax: '', resistMax: '' })
    expect(c.isLegendary).toBe(true)
    expect(c.legActionsMax).toBe(3)
    expect(c.legActions).toBe(3)
    expect(c.legResistMax).toBe(3)
    expect(c.legResist).toBe(3)
  })
  it('respeita os máximos informados', () => {
    const c = goblin()
    applyLegendaryFields(c, { isLegendary: true, actionsMax: 2, resistMax: 1 })
    expect(c.legActions).toBe(2)
    expect(c.legResist).toBe(1)
  })
  it('não recarrega usos já gastos ao só editar', () => {
    const c = goblin({ isLegendary: true, legActionsMax: 3, legActions: 1, legResistMax: 3, legResist: 2 })
    applyLegendaryFields(c, { isLegendary: true, actionsMax: 3, resistMax: 3 })
    expect(c.legActions).toBe(1)
    expect(c.legResist).toBe(2)
  })
  it('desliga e limpa os usos', () => {
    const c = goblin({ isLegendary: true, legActionsMax: 3, legActions: 2, legResistMax: 3, legResist: 1 })
    applyLegendaryFields(c, { isLegendary: false })
    expect(c.isLegendary).toBe(false)
    expect(c.legActionsMax).toBeUndefined()
    expect(c.legActions).toBeUndefined()
    expect(c.legResist).toBeUndefined()
  })
})
