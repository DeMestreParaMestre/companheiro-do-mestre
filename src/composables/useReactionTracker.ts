import { reactive } from 'vue'
import {
  clearReactions,
  isReactionUsed,
  refreshReactionOnTurnStart,
  toggleReactionUsed
} from '../utils/reaction'

const spent = reactive<Record<number, boolean>>({})

/** Em memória: não persiste nem sincroniza. */
export function useReactionTracker() {
  return {
    enabled: true,
    isSpent: (id: number) => isReactionUsed(spent, id),
    toggle: (id: number) => toggleReactionUsed(spent, id),
    onTurnStart: (id: number) => refreshReactionOnTurnStart(spent, id),
    clear: () => clearReactions(spent)
  }
}
