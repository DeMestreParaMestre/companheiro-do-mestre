import type { Creature } from '../types'

export type LegendarySheet = {
  isLegendary?: boolean
  legActionsMax?: number
  legResistMax?: number
}

const DEFAULT_LEG = 3

function parseMax(raw: number | string | undefined, fallback = DEFAULT_LEG): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
  return n > 0 ? n : fallback
}

/** Campos persistidos na ficha (sem usos correntes). */
export function legendaryFromForm(
  isLegendary: boolean,
  actionsMax?: number | string,
  resistMax?: number | string
): LegendarySheet {
  if (!isLegendary) return { isLegendary: false, legActionsMax: undefined, legResistMax: undefined }
  return {
    isLegendary: true,
    legActionsMax: parseMax(actionsMax),
    legResistMax: parseMax(resistMax)
  }
}

/** Liga ou desliga ações/resistências lendárias na criatura da iniciativa. */
export function applyLegendaryFields(
  c: Creature,
  opts: { isLegendary: boolean; actionsMax?: number | string; resistMax?: number | string }
): Creature {
  if (!opts.isLegendary) {
    c.isLegendary = false
    c.legActionsMax = undefined
    c.legActions = undefined
    c.legResistMax = undefined
    c.legResist = undefined
    return c
  }
  const became = !c.isLegendary || !c.legActionsMax
  const actionsMax = parseMax(opts.actionsMax)
  const resistMax = parseMax(opts.resistMax)
  c.isLegendary = true
  c.legActionsMax = actionsMax
  if (became || c.legActions == null) c.legActions = actionsMax
  else if (c.legActions > actionsMax) c.legActions = actionsMax
  c.legResistMax = resistMax
  if (became || c.legResist == null) c.legResist = resistMax
  else if (c.legResist > resistMax) c.legResist = resistMax
  return c
}
