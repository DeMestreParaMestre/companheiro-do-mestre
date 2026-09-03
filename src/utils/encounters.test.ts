import { describe, it, expect, vi, afterEach } from 'vitest'
import { creaturesToSlots, spawnFromTemplate, templateSummary, creatureBaseName } from './encounters'
import type { Creature, EncounterTemplate } from '../types'

const goblin = (id: number, name: string, init: number): Creature => ({
  id,
  name,
  init,
  initReal: init,
  hp: 7,
  hpMax: 7,
  ac: 15,
  fichaId: 'f1',
  dead: false,
  conditions: [],
  initBonus: 2
})

describe('encounters', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extrai nome base numerado', () => {
    expect(creatureBaseName('Goblin 2')).toBe('Goblin')
    expect(creatureBaseName('Boss')).toBe('Boss')
  })

  it('agrupa criaturas numeradas em slots', () => {
    const creatures: Creature[] = [
      goblin(1, 'Goblin 1', 12),
      goblin(2, 'Goblin 2', 10),
      {
        id: 3,
        name: 'Boss',
        init: 18,
        initReal: 18,
        hp: 50,
        hpMax: 50,
        ac: 17,
        fichaId: '',
        dead: false,
        conditions: []
      }
    ]
    const slots = creaturesToSlots(creatures)
    expect(slots).toHaveLength(2)
    expect(slots.find((s) => s.name === 'Goblin')?.qty).toBe(2)
    expect(slots.find((s) => s.name === 'Boss')?.qty).toBe(1)
  })

  it('resume o modelo', () => {
    const enc: EncounterTemplate = {
      id: 1,
      name: 'Emboscada',
      slots: [
        { name: 'Goblin', hpMax: 7, ac: 15, qty: 3 },
        { name: 'Hobgoblin', hpMax: 11, ac: 18, qty: 1 }
      ]
    }
    expect(templateSummary(enc)).toBe('3× Goblin, 1× Hobgoblin')
  })

  it('gera criaturas com init rolado', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // d20 = 11
    const enc: EncounterTemplate = {
      id: 1,
      name: 'Teste',
      slots: [{ name: 'Goblin', hpMax: 7, ac: 15, qty: 2, initBonus: 2 }]
    }
    const spawned = spawnFromTemplate(enc, { rollInit: true })
    expect(spawned).toHaveLength(2)
    expect(spawned[0].name).toBe('Goblin 1')
    expect(spawned[1].name).toBe('Goblin 2')
    expect(spawned[0].init).toBe(13)
  })

  it('gera criatura única sem sufixo numérico', () => {
    const enc: EncounterTemplate = {
      id: 1,
      name: 'Solo',
      slots: [{ name: 'Boss', hpMax: 50, ac: 17, qty: 1 }]
    }
    const spawned = spawnFromTemplate(enc)
    expect(spawned).toHaveLength(1)
    expect(spawned[0].name).toBe('Boss')
    expect(spawned[0].init).toBe(0)
  })
})
