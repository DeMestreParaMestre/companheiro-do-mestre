import type { Campaign, Personagem } from '../types'
import { onPartyHealed } from './deathSaves'
import {
  findPartyMemberByName,
  findPartyMemberForPersonagem,
  personagemMaxHp,
  resolvePersonagemForPartyMember,
  syncFromPersonagem
} from './partyLink'

/** Descanso longo em um personagem: HP cheio + limpa salvamentos / temp HP na iniciativa. */
export function applyLongRestToPersonagem(camp: Campaign, pj: Personagem): void {
  const max = personagemMaxHp(pj)
  pj.hp = max
  syncFromPersonagem(camp, pj)

  const creature =
    camp.creatures.find((c) => c.personagemId != null && String(c.personagemId) === String(pj.id)) ??
    camp.creatures.find((c) => c.name === pj.name && camp.party.some((m) => m.name === c.name))

  if (creature) {
    creature.hp = creature.hpMax
    creature.tempHp = 0
    creature.dead = false
    onPartyHealed(creature)
  }
}

/** Descanso longo da party (iniciativa): todos os membros da party. */
export function applyLongRestToParty(camp: Campaign): { restored: string[] } {
  const restored: string[] = []
  const seen = new Set<number | string>()

  for (const m of camp.party) {
    const pj = resolvePersonagemForPartyMember(camp, m)
    if (pj) {
      if (seen.has(pj.id)) continue
      seen.add(pj.id)
      applyLongRestToPersonagem(camp, pj)
      restored.push(pj.name)
      continue
    }

    const creature = camp.creatures.find((c) => c.name === m.name)
    if (creature) {
      creature.hp = creature.hpMax
      creature.tempHp = 0
      creature.dead = false
      onPartyHealed(creature)
      restored.push(m.name)
    } else {
      // Sem combate e sem personagem: nada a restaurar além do vínculo.
      restored.push(m.name)
    }
  }

  return { restored }
}

/** Garante vínculo personagem↔party ao aplicar descanso a partir da ficha. */
export function applyLongRestFromPersonagemCard(camp: Campaign, pj: Personagem): void {
  const member = findPartyMemberForPersonagem(camp, pj.id) ?? findPartyMemberByName(camp, pj.name)
  if (member) member.personagemId = pj.id
  applyLongRestToPersonagem(camp, pj)
}
