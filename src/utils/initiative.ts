import type { Creature, PartyMember } from '../types'

export function isInInitiative(name: string, creatures: Creature[]): boolean {
  return creatures.some((c) => c.name === name)
}

export function partyMembersNotInInitiative(party: PartyMember[], creatures: Creature[]): PartyMember[] {
  const inCombat = new Set(creatures.map((c) => c.name))
  return party.filter((p) => !inCombat.has(p.name))
}

/** Reordena por iniciativa e mantém o turno apontando para a mesma criatura (se houver). */
export function sortCreaturesPreservingTurn(creatures: Creature[], currentTurn: number): number {
  const activeId =
    currentTurn >= 0 && currentTurn < creatures.length ? creatures[currentTurn].id : null
  creatures.sort((a, b) => (b.initReal || b.init) - (a.initReal || a.init))
  if (activeId == null) return currentTurn
  const idx = creatures.findIndex((c) => c.id === activeId)
  return idx >= 0 ? idx : currentTurn
}

export function adjustTurnAfterRemove(currentTurn: number, removedIndex: number, newLength: number): number {
  if (currentTurn < 0) return currentTurn
  if (newLength === 0) return -1
  if (removedIndex < currentTurn) return currentTurn - 1
  if (removedIndex === currentTurn) {
    return currentTurn >= newLength ? newLength - 1 : currentTurn
  }
  return currentTurn
}
