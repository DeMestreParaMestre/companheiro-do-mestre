import type { Campaign } from '../types'

const COMBAT_LOG_MAX = 200

export function appendCombatLog(camp: Campaign, text: string) {
  if (!camp.combatLog) camp.combatLog = []
  camp.combatLog.unshift({ id: Date.now() + Math.random(), round: camp.round || 0, text })
  if (camp.combatLog.length > COMBAT_LOG_MAX) camp.combatLog.pop()
}
