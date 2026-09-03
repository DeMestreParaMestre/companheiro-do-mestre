import { describe, it, expect } from 'vitest'
import { createDevSeedCampaign, DEV_CAMPAIGN_ID } from './seedCampaign'

describe('createDevSeedCampaign', () => {
  it('returns a populated sandbox campaign', () => {
    const c = createDevSeedCampaign()
    expect(c.id).toBe(DEV_CAMPAIGN_ID)
    expect(c.fichas.length).toBeGreaterThan(0)
    expect(c.personagens.length).toBeGreaterThan(0)
    expect(c.party.length).toBeGreaterThan(0)
    expect(c.creatures.length).toBeGreaterThan(0)
    expect(c.itens.length).toBeGreaterThan(0)
    expect(c.references?.length).toBeGreaterThan(0)
    expect(c.diary.length).toBeGreaterThan(0)
  })
})
