import { CONDS } from '../constants'
import type { Creature } from '../types'

/**
 * Condição personalizada ("Outros"). Cada efeito adicionado ganha a própria
 * chave `Outros:<id>`, o que permite várias por criatura, cada uma com seu nome.
 * A chave antiga sem sufixo (`Outros`) continua reconhecida.
 */
export const CUSTOM_COND = 'Outros'

type CondHolder = Pick<Creature, 'conditions' | 'customConditionLabel'>

export function isCustomCond(k: string): boolean {
  return k === CUSTOM_COND || k.startsWith(CUSTOM_COND + ':')
}

export function condMeta(k: string) {
  return CONDS.find((x) => x.k === (isCustomCond(k) ? CUSTOM_COND : k))
}

export function condLabel(c: Pick<Creature, 'customConditionLabel'>, k: string): string {
  const cd = condMeta(k)
  if (cd?.custom) return c.customConditionLabel?.[k] || CUSTOM_COND
  return cd ? cd.l : k
}

/** Chaves das condições personalizadas da criatura, na ordem em que foram adicionadas. */
export function customCondKeys(c: Pick<Creature, 'conditions'>): string[] {
  return (c.conditions || []).filter(isCustomCond)
}

export function newCustomCondKey(existing: string[], seed = Date.now()): string {
  let n = seed
  while (existing.includes(`${CUSTOM_COND}:${n}`)) n++
  return `${CUSTOM_COND}:${n}`
}

/** Adiciona um novo efeito "Outros" com o nome dado. Retorna a chave criada, ou null se o nome for vazio. */
export function addCustomCondition(c: CondHolder, label: string, seed = Date.now()): string | null {
  const name = label.trim()
  if (!name) return null
  if (!c.conditions) c.conditions = []
  const key = newCustomCondKey(c.conditions, seed)
  c.conditions.push(key)
  if (!c.customConditionLabel) c.customConditionLabel = {}
  c.customConditionLabel[key] = name
  return key
}
