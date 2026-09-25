import { describe, it, expect } from 'vitest'
import {
  isReactionUsed,
  toggleReactionUsed,
  refreshReactionOnTurnStart,
  clearReactions
} from './reaction'

describe('reaction', () => {
  it('marca e desmarca a reação de uma criatura', () => {
    const spent: Record<number, boolean> = {}
    expect(isReactionUsed(spent, 7)).toBe(false)
    toggleReactionUsed(spent, 7)
    expect(isReactionUsed(spent, 7)).toBe(true)
    toggleReactionUsed(spent, 7)
    expect(isReactionUsed(spent, 7)).toBe(false)
  })

  it('volta só para quem começou o turno', () => {
    const spent: Record<number, boolean> = {}
    toggleReactionUsed(spent, 1)
    toggleReactionUsed(spent, 2)
    refreshReactionOnTurnStart(spent, 1)
    expect(isReactionUsed(spent, 1)).toBe(false)
    expect(isReactionUsed(spent, 2)).toBe(true)
  })

  it('limpa todas no novo combate', () => {
    const spent: Record<number, boolean> = { 1: true, 2: true }
    clearReactions(spent)
    expect(isReactionUsed(spent, 1)).toBe(false)
    expect(isReactionUsed(spent, 2)).toBe(false)
  })
})
