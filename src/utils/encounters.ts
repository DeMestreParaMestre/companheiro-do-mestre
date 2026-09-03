import type { Creature, EncounterSlot, EncounterTemplate } from '../types'
import { rollInitiative } from './dice'

/** Remove sufixo numérico ("Goblin 2" → "Goblin"). */
export function creatureBaseName(name: string): string {
  const m = name.match(/^(.+?)\s+(\d+)$/)
  return m ? m[1].trim() : name
}

function slotKey(c: Creature): string {
  return [
    creatureBaseName(c.name),
    String(c.fichaId ?? ''),
    c.hpMax,
    c.ac ?? '',
    c.initBonus ?? '',
    c.isLegendary ? '1' : '0',
    c.legActionsMax ?? ''
  ].join('|')
}

function creatureToSlot(c: Creature): EncounterSlot {
  return {
    name: creatureBaseName(c.name),
    fichaId: c.fichaId,
    hpMax: c.hpMax,
    ac: c.ac,
    qty: 1,
    initBonus: c.initBonus ?? null,
    resist: c.resist?.length ? [...c.resist] : undefined,
    vuln: c.vuln?.length ? [...c.vuln] : undefined,
    immune: c.immune?.length ? [...c.immune] : undefined,
    isLegendary: c.isLegendary,
    legActionsMax: c.legActionsMax
  }
}

/** Agrupa criaturas iguais (incl. "Goblin 1", "Goblin 2") em slots com quantidade. */
export function creaturesToSlots(creatures: Creature[]): EncounterSlot[] {
  const map = new Map<string, EncounterSlot>()
  for (const c of creatures) {
    const key = slotKey(c)
    const existing = map.get(key)
    if (existing) {
      existing.qty++
    } else {
      map.set(key, creatureToSlot(c))
    }
  }
  return Array.from(map.values())
}

export function templateSummary(enc: EncounterTemplate): string {
  if (!enc.slots.length) return 'Vazio'
  return enc.slots.map((s) => `${s.qty}× ${s.name}`).join(', ')
}

export function slotFromFicha(f: { id: number; name: string; hpMax: number | null; ac: number | null; initBonus: number | null }, qty = 1): EncounterSlot {
  return {
    name: f.name,
    fichaId: f.id,
    hpMax: f.hpMax ?? 1,
    ac: f.ac,
    qty,
    initBonus: f.initBonus
  }
}

/** Gera criaturas a partir de um modelo salvo. */
export function spawnFromTemplate(
  template: EncounterTemplate,
  options: { rollInit?: boolean } = {}
): Creature[] {
  const creatures: Creature[] = []
  let id = Date.now()
  for (const slot of template.slots) {
    for (let i = 0; i < slot.qty; i++) {
      const bonus = slot.initBonus ?? 0
      const init = options.rollInit ? rollInitiative(bonus) : 0
      creatures.push({
        id: id++,
        name: slot.qty > 1 ? `${slot.name} ${i + 1}` : slot.name,
        init,
        initReal: init,
        hp: slot.hpMax,
        hpMax: slot.hpMax,
        ac: slot.ac,
        fichaId: slot.fichaId ?? '',
        dead: false,
        conditions: [],
        initBonus: slot.initBonus ?? null,
        resist: slot.resist?.length ? [...slot.resist] : undefined,
        vuln: slot.vuln?.length ? [...slot.vuln] : undefined,
        immune: slot.immune?.length ? [...slot.immune] : undefined,
        isLegendary: slot.isLegendary,
        legActionsMax: slot.legActionsMax,
        legActions: slot.isLegendary && slot.legActionsMax ? slot.legActionsMax : undefined
      })
    }
  }
  return creatures
}
