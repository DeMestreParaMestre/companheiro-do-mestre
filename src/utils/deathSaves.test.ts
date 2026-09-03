import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  tracksDeathSaves,
  resetDeathSaves,
  onPartyDropToZero,
  addDeathSaveSuccess,
  addDeathSaveFailure,
  rollDeathSave,
  DEATH_SAVE_MAX
} from './deathSaves'
import type { Creature } from '../types'

function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 1,
    name: 'Aldric',
    init: 10,
    initReal: 10,
    hp: 0,
    hpMax: 30,
    ac: 16,
    fichaId: '',
    dead: false,
    conditions: [],
    ...overrides
  }
}

describe('deathSaves', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rastreia salvamentos só para PJ a 0 HP', () => {
    expect(tracksDeathSaves(creature(), true)).toBe(true)
    expect(tracksDeathSaves(creature({ hp: 5 }), true)).toBe(false)
    expect(tracksDeathSaves(creature(), false)).toBe(false)
    expect(tracksDeathSaves(creature({ dead: true }), true)).toBe(false)
  })

  it('zera contadores ao cair inconsciente', () => {
    const c = creature({ deathSaveSuccesses: 2, deathSaveFailures: 1, stable: true })
    onPartyDropToZero(c)
    expect(c.deathSaveSuccesses).toBe(0)
    expect(c.deathSaveFailures).toBe(0)
    expect(c.stable).toBeUndefined()
    expect(c.dead).toBe(false)
  })

  it('marca estável com 3 sucessos', () => {
    const c = creature()
    expect(addDeathSaveSuccess(c)).toBeNull()
    expect(addDeathSaveSuccess(c)).toBeNull()
    expect(addDeathSaveSuccess(c)).toBe('stable')
    expect(c.stable).toBe(true)
  })

  it('marca morto com 3 falhas', () => {
    const c = creature()
    addDeathSaveFailure(c, 1)
    addDeathSaveFailure(c, 1)
    expect(addDeathSaveFailure(c, 1)).toBe('dead')
    expect(c.dead).toBe(true)
  })

  it('nat 20 recupera 1 HP', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95) // d20 = 20
    const c = creature({ deathSaveFailures: 2 })
    const r = rollDeathSave(c)
    expect(r.roll).toBe(20)
    expect(r.effect).toBe('revive')
    expect(c.hp).toBe(1)
    expect(c.deathSaveFailures).toBe(0)
  })

  it('nat 1 adiciona 2 falhas', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // d20 = 1
    const c = creature()
    const r = rollDeathSave(c)
    expect(r.roll).toBe(1)
    expect(c.deathSaveFailures).toBe(2)
  })

  it('10+ é sucesso, 9- é falha', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45) // d20 = 10
    const c = creature()
    rollDeathSave(c)
    expect(c.deathSaveSuccesses).toBe(1)

    vi.spyOn(Math, 'random').mockReturnValue(0.4) // d20 = 9
    rollDeathSave(c)
    expect(c.deathSaveFailures).toBe(1)
  })

  it('respeita o máximo de contadores', () => {
    const c = creature()
    c.deathSaveSuccesses = DEATH_SAVE_MAX
    resetDeathSaves(c)
    expect(c.deathSaveSuccesses).toBe(0)
  })
})
