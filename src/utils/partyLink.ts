import type { Campaign, Creature, PartyMember, Personagem } from '../types'
import { onPartyHealed, resetDeathSaves } from './deathSaves'

export function findPersonagem(camp: Campaign, id: number | undefined | null): Personagem | undefined {
  if (id == null) return undefined
  return (camp.personagens || []).find((p) => String(p.id) === String(id))
}

export function findPersonagemByName(camp: Campaign, name: string): Personagem | undefined {
  return (camp.personagens || []).find((p) => p.name === name)
}

export function findPartyMemberForPersonagem(camp: Campaign, pjId: number): PartyMember | undefined {
  return camp.party.find((m) => m.personagemId != null && String(m.personagemId) === String(pjId))
}

export function findPartyMemberByName(camp: Campaign, name: string): PartyMember | undefined {
  return camp.party.find((m) => m.name === name)
}

export function resolvePersonagemForPartyMember(camp: Campaign, m: PartyMember): Personagem | undefined {
  if (m.personagemId != null) {
    const byId = findPersonagem(camp, m.personagemId)
    if (byId) return byId
  }
  return findPersonagemByName(camp, m.name)
}

export function resolvePersonagemForCreature(camp: Campaign, c: Creature): Personagem | undefined {
  if (c.personagemId != null) {
    const byId = findPersonagem(camp, c.personagemId)
    if (byId) return byId
  }
  const member = findPartyMemberByName(camp, c.name)
  if (member) return resolvePersonagemForPartyMember(camp, member)
  return findPersonagemByName(camp, c.name)
}

export function personagemCurrentHp(pj: Personagem): number {
  if (pj.hp != null) return pj.hp
  if (pj.hpMax != null) return pj.hpMax
  return 1
}

export function personagemMaxHp(pj: Personagem): number {
  return pj.hpMax ?? personagemCurrentHp(pj)
}

export function partyMemberHpLabel(camp: Campaign, m: PartyMember): string {
  const pj = resolvePersonagemForPartyMember(camp, m)
  if (pj) return `${personagemCurrentHp(pj)}/${personagemMaxHp(pj)}`
  return String(m.hpMax)
}

export function isPartyName(camp: Campaign, name: string): boolean {
  return camp.party.some((p) => p.name === name)
}

export function buildCreatureFromPartyMember(
  camp: Campaign,
  m: PartyMember,
  init: number,
  id = Date.now()
): Creature {
  const stats = combatStatsFromPartyMember(camp, m)
  const ficha = camp.fichas.find((f) => f.name === m.name)
  return {
    id,
    name: m.name,
    init,
    initReal: init,
    hp: stats.hp,
    hpMax: stats.hpMax,
    ac: stats.ac,
    fichaId: ficha ? ficha.id : '',
    dead: stats.dead,
    conditions: [],
    initBonus: ficha && ficha.initBonus != null ? ficha.initBonus : null,
    personagemId: stats.personagemId,
    isLegendary: ficha?.isLegendary,
    legActionsMax: ficha?.legActionsMax,
    legActions: ficha?.isLegendary && ficha.legActionsMax ? ficha.legActionsMax : undefined,
    legResistMax: ficha?.legResistMax,
    legResist: ficha?.isLegendary && ficha.legResistMax ? ficha.legResistMax : undefined
  }
}

export function combatStatsFromPartyMember(
  camp: Campaign,
  m: PartyMember
): { hp: number; hpMax: number; ac: number | null; personagemId?: number; dead: boolean } {
  const pj = resolvePersonagemForPartyMember(camp, m)
  const hpMax = pj ? personagemMaxHp(pj) : m.hpMax
  const hp = pj ? personagemCurrentHp(pj) : m.hpMax
  const ac = pj?.ac ?? m.ac
  const personagemId = pj?.id ?? m.personagemId
  return { hp, hpMax, ac, personagemId, dead: false }
}

/** Propaga HP/AC da criatura para personagem vinculado e party. */
export function syncPersonagemFromCreature(camp: Campaign, creature: Creature): void {
  const pj = resolvePersonagemForCreature(camp, creature)
  if (!pj) return

  pj.hp = creature.hp
  if (creature.hpMax > 0) pj.hpMax = creature.hpMax
  if (creature.ac != null) pj.ac = creature.ac

  if (!creature.personagemId) creature.personagemId = pj.id

  const member =
    findPartyMemberForPersonagem(camp, pj.id) ??
    findPartyMemberByName(camp, creature.name)
  if (member) {
    member.personagemId = pj.id
    member.hpMax = pj.hpMax ?? member.hpMax
    member.ac = pj.ac ?? member.ac
  }
}

/** Propaga HP/AC do personagem para party e criatura na iniciativa (se houver). */
export function syncFromPersonagem(camp: Campaign, pj: Personagem): void {
  const hp = personagemCurrentHp(pj)
  const hpMax = personagemMaxHp(pj)

  const member = findPartyMemberForPersonagem(camp, pj.id) ?? findPartyMemberByName(camp, pj.name)
  if (member) {
    member.personagemId = pj.id
    member.hpMax = hpMax
    member.ac = pj.ac ?? member.ac
  }

  const creature =
    camp.creatures.find((c) => c.personagemId != null && String(c.personagemId) === String(pj.id)) ??
    camp.creatures.find((c) => c.name === pj.name && camp.party.some((m) => m.name === c.name))

  if (creature) {
    creature.personagemId = pj.id
    creature.hp = hp
    creature.hpMax = hpMax
    creature.ac = pj.ac
    const inParty =
      !!findPartyMemberForPersonagem(camp, pj.id) || !!findPartyMemberByName(camp, pj.name)
    if (hp > 0) {
      creature.dead = false
      onPartyHealed(creature)
    } else if (!inParty) {
      creature.dead = true
      resetDeathSaves(creature)
    }
  }
}

/** Atualiza personagem vinculado quando party (HP máx / AC) é editada manualmente. */
export function syncPersonagemFromPartyMember(camp: Campaign, member: PartyMember): void {
  const pj = resolvePersonagemForPartyMember(camp, member)
  if (!pj) return
  pj.hpMax = member.hpMax
  if (pj.ac == null && member.ac != null) pj.ac = member.ac
  else if (member.ac != null) pj.ac = member.ac
  if (pj.hp != null && pj.hp > member.hpMax) pj.hp = member.hpMax
  member.personagemId = pj.id
  syncFromPersonagem(camp, pj)
}

/** Migração: inicializa HP atual e vínculos por nome. */
export function migratePartyLinks(camp: Campaign): void {
  ;(camp.personagens || []).forEach((pj) => {
    if (pj.hp == null && pj.hpMax != null) pj.hp = pj.hpMax
  })
  camp.party.forEach((m) => {
    if (m.personagemId == null) {
      const byName = findPersonagemByName(camp, m.name)
      if (byName) m.personagemId = byName.id
    }
    const pj = resolvePersonagemForPartyMember(camp, m)
    if (pj) {
      m.personagemId = pj.id
      if (pj.hpMax != null) m.hpMax = pj.hpMax
      if (pj.ac != null) m.ac = pj.ac
    }
  })
  camp.creatures.forEach((c) => {
    const pj = resolvePersonagemForCreature(camp, c)
    if (pj && !c.personagemId) c.personagemId = pj.id
  })
}

export function unlinkPersonagemFromParty(camp: Campaign, pjId: number): void {
  camp.party.forEach((m) => {
    if (m.personagemId != null && String(m.personagemId) === String(pjId)) {
      delete m.personagemId
    }
  })
  camp.creatures.forEach((c) => {
    if (c.personagemId != null && String(c.personagemId) === String(pjId)) {
      delete c.personagemId
    }
  })
}
