import { describe, it, expect } from 'vitest'
import {
  isInInitiative,
  partyMembersNotInInitiative,
  sortCreaturesPreservingTurn,
  adjustTurnAfterRemove
} from './initiative'
import type { Creature, PartyMember } from '../types'

const party: PartyMember[] = [
  { name: 'Aldric', hpMax: 30, ac: 18 },
  { name: 'Lyra', hpMax: 22, ac: 14 }
]

const creatures: Creature[] = [
  {
    id: 1,
    name: 'Goblin',
    init: 15,
    initReal: 15,
    hp: 7,
    hpMax: 7,
    ac: 15,
    fichaId: '',
    dead: false,
    conditions: []
  },
  {
    id: 2,
    name: 'Aldric',
    init: 12,
    initReal: 12,
    hp: 30,
    hpMax: 30,
    ac: 18,
    fichaId: '',
    dead: false,
    conditions: []
  }
]

describe('initiative utils', () => {
  it('detects who is already in initiative', () => {
    expect(isInInitiative('Aldric', creatures)).toBe(true)
    expect(isInInitiative('Lyra', creatures)).toBe(false)
  })

  it('lists party members absent from initiative', () => {
    expect(partyMembersNotInInitiative(party, creatures)).toEqual([{ name: 'Lyra', hpMax: 22, ac: 14 }])
  })

  it('preserves active turn after sorting', () => {
    const list: Creature[] = [
      { ...creatures[0], init: 10, initReal: 10 },
      { ...creatures[1], init: 18, initReal: 18 }
    ]
    const turn = sortCreaturesPreservingTurn(list, 0)
    expect(list[turn].name).toBe('Goblin')
  })

  it('adjusts turn index when removing a creature', () => {
    expect(adjustTurnAfterRemove(2, 0, 3)).toBe(1)
    expect(adjustTurnAfterRemove(1, 1, 2)).toBe(1)
    expect(adjustTurnAfterRemove(2, 2, 2)).toBe(1)
    expect(adjustTurnAfterRemove(0, 0, 0)).toBe(-1)
  })
})
