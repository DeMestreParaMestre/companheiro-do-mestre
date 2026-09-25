import { describe, it, expect } from 'vitest'
import {
  personagemCurrentHp,
  combatStatsFromPartyMember,
  buildCreatureFromPartyMember,
  isPartyName,
  syncPersonagemFromCreature,
  syncFromPersonagem,
  migratePartyLinks
} from './partyLink'
import type { Campaign, Creature } from '../types'

const camp: Campaign = {
  id: 'c1',
  name: 'Test',
  diary: [],
  fichas: [],
  personagens: [
    { id: 1, name: 'Aldric', hpMax: 32, hp: 28, ac: 18, type: null, pp: null, cristais: 0, attunados: [], bg: null, img: null }
  ],
  party: [{ name: 'Aldric', hpMax: 32, ac: 18, personagemId: 1 }],
  creatures: [],
  itens: [],
  currentTurn: -1
}

describe('partyLink', () => {
  it('reads current HP from personagem', () => {
    expect(personagemCurrentHp(camp.personagens[0])).toBe(28)
  })

  it('builds combat stats from linked party member', () => {
    const stats = combatStatsFromPartyMember(camp, camp.party[0])
    expect(stats).toEqual({ hp: 28, hpMax: 32, ac: 18, personagemId: 1, dead: false })
  })

  it('detects party names and builds a creature from the member', () => {
    expect(isPartyName(camp, 'Aldric')).toBe(true)
    expect(isPartyName(camp, 'Goblin')).toBe(false)
    const creature = buildCreatureFromPartyMember(camp, camp.party[0], 14, 7)
    expect(creature).toMatchObject({
      id: 7,
      name: 'Aldric',
      init: 14,
      initReal: 14,
      hp: 28,
      hpMax: 32,
      ac: 18,
      personagemId: 1,
      dead: false
    })
  })

  it('syncs creature damage to personagem', () => {
    const creature: Creature = {
      id: 99,
      name: 'Aldric',
      init: 10,
      initReal: 10,
      hp: 15,
      hpMax: 32,
      ac: 18,
      fichaId: '',
      dead: false,
      conditions: [],
      personagemId: 1
    }
    syncPersonagemFromCreature(camp, creature)
    expect(camp.personagens[0].hp).toBe(15)
  })

  it('syncs personagem heal to creature in initiative', () => {
    camp.creatures.push({
      id: 99,
      name: 'Aldric',
      init: 10,
      initReal: 10,
      hp: 15,
      hpMax: 32,
      ac: 18,
      fichaId: '',
      dead: false,
      conditions: [],
      personagemId: 1
    })
    camp.personagens[0].hp = 24
    syncFromPersonagem(camp, camp.personagens[0])
    expect(camp.creatures[0].hp).toBe(24)
    expect(camp.creatures[0].dead).toBe(false)
  })

  it('auto-links party to personagem by name on migration', () => {
    const c: Campaign = {
      ...camp,
      party: [{ name: 'Aldric', hpMax: 32, ac: 18 }],
      personagens: [{ ...camp.personagens[0], hp: undefined }]
    }
    migratePartyLinks(c)
    expect(c.party[0].personagemId).toBe(1)
    expect(c.personagens[0].hp).toBe(32)
  })
})
