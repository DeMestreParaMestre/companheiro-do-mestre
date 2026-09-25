/** Reação 5e: uma por rodada; volta no início do turno desta criatura. Estado em memória (não vai à campanha nem à nuvem). */

export function isReactionUsed(spent: Record<number, boolean>, id: number): boolean {
  return !!spent[id]
}

export function toggleReactionUsed(spent: Record<number, boolean>, id: number): void {
  if (spent[id]) delete spent[id]
  else spent[id] = true
}

/** Início do turno desta criatura: a reação volta. */
export function refreshReactionOnTurnStart(spent: Record<number, boolean>, id: number): void {
  delete spent[id]
}

export function clearReactions(spent: Record<number, boolean>): void {
  for (const k of Object.keys(spent)) delete spent[Number(k)]
}
