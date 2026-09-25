import { describe, it, expect } from 'vitest'
import { appendCombatLog } from './combatLog'
import type { Campaign } from '../types'

function emptyCamp(): Campaign {
  return {
    id: 'c1',
    name: 'Test',
    diary: [],
    fichas: [],
    party: [],
    creatures: [],
    personagens: [],
    itens: [],
    currentTurn: -1,
    round: 2
  }
}

describe('appendCombatLog', () => {
  it('prepends entries and keeps the current round', () => {
    const camp = emptyCamp()
    appendCombatLog(camp, 'Aldric sofreu 4 de dano')
    expect(camp.combatLog).toHaveLength(1)
    expect(camp.combatLog?.[0]).toMatchObject({ round: 2, text: 'Aldric sofreu 4 de dano' })
  })

  it('caps the log at 200 entries', () => {
    const camp = emptyCamp()
    for (let i = 0; i < 205; i++) appendCombatLog(camp, String(i))
    expect(camp.combatLog).toHaveLength(200)
    expect(camp.combatLog?.[0].text).toBe('204')
    expect(camp.combatLog?.[199].text).toBe('5')
  })
})
