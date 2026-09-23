import { describe, it, expect } from 'vitest'
import {
  CUSTOM_COND,
  isCustomCond,
  condMeta,
  condLabel,
  customCondKeys,
  newCustomCondKey,
  addCustomCondition
} from './conditions'

describe('conditions', () => {
  it('reconhece a chave antiga e as novas chaves de "Outros"', () => {
    expect(isCustomCond('Outros')).toBe(true)
    expect(isCustomCond('Outros:123')).toBe(true)
    expect(isCustomCond('Prone')).toBe(false)
    expect(condMeta('Outros:123')?.custom).toBe(true)
    expect(condMeta('Prone')?.l).toBe('Caído')
  })

  it('permite adicionar vários "Outros", cada um com seu nome', () => {
    const c = { conditions: [] as string[], customConditionLabel: undefined as Record<string, string> | undefined }
    const a = addCustomCondition(c, 'Marcado', 100)
    const b = addCustomCondition(c, 'Amaldiçoado', 100)
    expect(a).not.toBe(b)
    expect(customCondKeys(c)).toEqual([a, b])
    expect(condLabel(c, a!)).toBe('Marcado')
    expect(condLabel(c, b!)).toBe('Amaldiçoado')
  })

  it('ignora nomes vazios', () => {
    const c = { conditions: [] as string[] }
    expect(addCustomCondition(c, '   ')).toBeNull()
    expect(c.conditions).toEqual([])
  })

  it('mantém o rótulo de dados antigos com a chave "Outros" sem sufixo', () => {
    const c = { conditions: ['Outros'], customConditionLabel: { Outros: 'Envenenado por magia' } }
    expect(condLabel(c, 'Outros')).toBe('Envenenado por magia')
    expect(customCondKeys(c)).toEqual(['Outros'])
  })

  it('gera chaves sem colidir com as existentes', () => {
    expect(newCustomCondKey([`${CUSTOM_COND}:5`], 5)).toBe(`${CUSTOM_COND}:6`)
  })

  it('usa o rótulo padrão das condições normais', () => {
    expect(condLabel({}, 'Blinded')).toBe('Cego')
  })
})
