import { describe, it, expect } from 'vitest'
import { APP_VERSION, appVersionLabel } from './appVersion'

describe('appVersion', () => {
  it('reads a semantic version from the package', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(appVersionLabel()).toBe(`v${APP_VERSION}`)
  })
})
