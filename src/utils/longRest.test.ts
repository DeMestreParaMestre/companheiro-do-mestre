import { describe, it, expect } from 'vitest'
import { applyLongRestToPersonagem, applyLongRestToParty } from './longRest'
import type { Campaign, Creature } from '../types'

function baseCamp(): Campaign {
  return {
    id: 'c1',
    name: 'Test',
    diary: [],
    fichas: [],
    personagens: [
      { id: 1, name: 'Aldric', hpMax: 32, hp: 8, ac: 18, type: null, pp: null, cristais: 0, attunados: [], bg: null, img: null },
      { id: 2, name: 'Lyra', hpMax: 24, hp: 5, ac: 14, type: null, pp: null, cristais: 0, attunados: [], bg: null, img: null }
    ],
    party: [
      { name: 'Aldric', hpMax: 32, ac: 18, personagemId: 1 },
      { name: 'Lyra', hpMax: 24, ac: 14, personagemId: 2 }
    ],
    creatures: [],
    itens: [],
    currentTurn: -1
  }
}

describe('longRest', () => {
  it('restaura HP de um personagem', () => {
    const camp = baseCamp()
    applyLongRestToPersonagem(camp, camp.personagens[0])
    expect(camp.personagens[0].hp).toBe(32)
  })

  it('sincroniza criatura na iniciativa e limpa death saves / temp HP', () => {
    const camp = baseCamp()
    const creature: Creature = {
      id: 99,
      name: 'Aldric',
      init: 10,
      initReal: 10,
      hp: 0,
      hpMax: 32,
      ac: 18,
      fichaId: '',
      dead: false,
      conditions: [],
      personagemId: 1,
      deathSaveSuccesses: 1,
      deathSaveFailures: 2,
      tempHp: 5,
      stable: true
    }
    camp.creatures.push(creature)
    applyLongRestToPersonagem(camp, camp.personagens[0])
    expect(creature.hp).toBe(32)
    expect(creature.tempHp).toBe(0)
    expect(creature.deathSaveSuccesses).toBe(0)
    expect(creature.deathSaveFailures).toBe(0)
    expect(creature.stable).toBeUndefined()
    expect(creature.dead).toBe(false)
    expect(camp.personagens[0].hp).toBe(32)
  })

  it('aplica long rest a toda a party', () => {
    const camp = baseCamp()
    const { restored } = applyLongRestToParty(camp)
    expect(restored).toEqual(['Aldric', 'Lyra'])
    expect(camp.personagens[0].hp).toBe(32)
    expect(camp.personagens[1].hp).toBe(24)
  })
})
