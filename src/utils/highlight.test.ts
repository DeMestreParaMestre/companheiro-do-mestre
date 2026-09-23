import { describe, it, expect } from 'vitest'
import { hl } from './highlight'

describe('hl', () => {
  it('escapa HTML do texto do usuário', () => {
    expect(hl('<img src=x onerror=alert(1)>', '')).toBe('&lt;img src=x onerror=alert(1)&gt;')
  })
  it('marca o termo buscado sem liberar HTML', () => {
    expect(hl('<b>Goblin</b>', 'gob')).toBe('&lt;b&gt;<mark class="hl">Gob</mark>lin&lt;/b&gt;')
  })
})
