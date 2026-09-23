import { describe, it, expect } from 'vitest'
import { decide, hashString, isEmptyCampaign, canonicalJson } from './syncPlan'
import type { Campaign } from '../types'

const synced = { version: 3, hash: 'h1' }
const alive = (version: number) => ({ version, deleted: false })
const gone = (version: number) => ({ version, deleted: true })

describe('decide — campanha existe neste navegador', () => {
  it('nunca sincronizada e ausente na nuvem: sobe', () => expect(decide('h1', undefined, undefined, false)).toBe('upload'))
  it('sem mudanças dos dois lados: nada', () => expect(decide('h1', synced, alive(3), false)).toBe('none'))
  it('só mudou aqui: sobe', () => expect(decide('h2', synced, alive(3), false)).toBe('upload'))
  it('só mudou na nuvem: baixa', () => expect(decide('h1', synced, alive(4), false)).toBe('download'))
  it('mudou dos dois lados: conflito', () => expect(decide('h2', synced, alive(4), false)).toBe('conflict'))
  it('existe nos dois sem histórico (1º login): conflito, nunca sobrescreve', () =>
    expect(decide('h1', undefined, alive(1), false)).toBe('conflict'))
  it('apagada em outro computador e intacta aqui: apaga aqui', () => expect(decide('h1', synced, gone(4), false)).toBe('deleteLocal'))
  it('apagada em outro computador mas editada aqui: conflito', () => expect(decide('h2', synced, gone(4), false)).toBe('conflict'))
})

describe('decide — campanha não existe neste navegador', () => {
  it('só na nuvem: baixa', () => expect(decide(null, undefined, alive(2), false)).toBe('download'))
  it('sumiu daqui sem exclusão explícita (ex.: importação): restaura da nuvem', () =>
    expect(decide(null, synced, alive(3), false)).toBe('download'))
  it('apagada aqui e intacta na nuvem: apaga na nuvem', () => expect(decide(null, synced, alive(3), true)).toBe('deleteRemote'))
  it('apagada aqui mas editada em outro computador: restaura', () => expect(decide(null, synced, alive(4), true)).toBe('download'))
  it('apagada nos dois lados: esquece', () => expect(decide(null, synced, gone(4), false)).toBe('forget'))
  it('não existe em lugar nenhum: nada', () => expect(decide(null, undefined, undefined, false)).toBe('none'))
})

describe('canonicalJson', () => {
  it('ignora a ordem das chaves (jsonb reordena)', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } })).toBe(canonicalJson({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }))
  })
  it('trata undefined como ausente, igual ao JSON', () => expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 })))
  it('diferencia conteúdo', () => expect(canonicalJson({ a: 1 })).not.toBe(canonicalJson({ a: 2 })))
})

describe('hashString / isEmptyCampaign', () => {
  it('hash estável e sensível a mudanças', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc')).not.toBe(hashString('abd'))
  })
  it('detecta campanha vazia', () => {
    const c = { id: 'c1', name: 'Campanha Principal', diary: [], fichas: [], party: [], creatures: [], personagens: [], itens: [], currentTurn: -1 } as Campaign
    expect(isEmptyCampaign(c)).toBe(true)
    expect(isEmptyCampaign({ ...c, diary: [{ id: 1, day: '', title: '', body: 'x', date: '' }] })).toBe(false)
  })
})
