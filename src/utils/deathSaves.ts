import type { Creature } from '../types'

export const DEATH_SAVE_MAX = 3

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

export function tracksDeathSaves(creature: Creature, isPartyMember: boolean): boolean {
  return isPartyMember && creature.hp === 0 && !creature.dead
}

export function resetDeathSaves(creature: Creature): void {
  creature.deathSaveSuccesses = 0
  creature.deathSaveFailures = 0
  delete creature.stable
}

/** PJ cai a 0 HP — inconsciente, mas ainda não morto. */
export function onPartyDropToZero(creature: Creature): void {
  creature.dead = false
  resetDeathSaves(creature)
}

/** Monstro/NPC a 0 HP — morto imediatamente. */
export function onCreatureDropToZero(creature: Creature): void {
  creature.dead = true
  resetDeathSaves(creature)
}

export function onPartyHealed(creature: Creature): void {
  creature.dead = false
  resetDeathSaves(creature)
}

export function addDeathSaveSuccess(creature: Creature): 'stable' | null {
  if (creature.stable) return null
  const next = Math.min(DEATH_SAVE_MAX, (creature.deathSaveSuccesses ?? 0) + 1)
  creature.deathSaveSuccesses = next
  if (next >= DEATH_SAVE_MAX) {
    creature.stable = true
    return 'stable'
  }
  return null
}

export function addDeathSaveFailure(creature: Creature, count = 1): 'dead' | null {
  const next = Math.min(DEATH_SAVE_MAX, (creature.deathSaveFailures ?? 0) + count)
  creature.deathSaveFailures = next
  if (next >= DEATH_SAVE_MAX) {
    creature.dead = true
    return 'dead'
  }
  return null
}

export type DeathSaveRollResult = {
  roll: number
  message: string
  effect?: 'revive' | 'stable' | 'dead'
}

/** Rola 1d20 e aplica as regras de salvamento contra morte (5e). */
export function rollDeathSave(creature: Creature): DeathSaveRollResult {
  if (creature.stable) {
    return { roll: 0, message: 'estável — sem novos salvamentos até sofrer dano' }
  }

  const roll = rollD20()

  if (roll === 20) {
    creature.hp = 1
    onPartyHealed(creature)
    return { roll, message: '20 natural! recupera 1 HP e acorda', effect: 'revive' }
  }

  if (roll === 1) {
    const effect = addDeathSaveFailure(creature, 2)
    if (effect === 'dead') {
      return { roll, message: '1 natural — 2 falhas. Morreu', effect: 'dead' }
    }
    return { roll, message: '1 natural — 2 falhas' }
  }

  if (roll >= 10) {
    const effect = addDeathSaveSuccess(creature)
    if (effect === 'stable') {
      return { roll, message: 'sucesso — 3 sucessos, estável', effect: 'stable' }
    }
    return { roll, message: 'sucesso' }
  }

  const effect = addDeathSaveFailure(creature, 1)
  if (effect === 'dead') {
    return { roll, message: 'falha. Morreu', effect: 'dead' }
  }
  return { roll, message: 'falha' }
}
