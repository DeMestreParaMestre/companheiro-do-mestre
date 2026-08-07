import { describe, it, expect } from 'vitest'
import { validateReferenceForm } from './refValidation'

describe('validateReferenceForm', () => {
  it('exige nome', () => {
    const r = validateReferenceForm({ name: '', type: 'texto', content: 'x', url: '' })
    expect(r.ok).toBe(false)
    expect(r.errors.name).toBeTruthy()
  })

  it('exige conteúdo para texto', () => {
    const r = validateReferenceForm({ name: 'Teste', type: 'texto', content: '  ', url: '' })
    expect(r.ok).toBe(false)
    expect(r.errors.content).toBeTruthy()
  })

  it('aceita referência de texto válida', () => {
    const r = validateReferenceForm({ name: 'Teste', type: 'texto', content: 'Corpo', url: '' })
    expect(r.ok).toBe(true)
  })
})
