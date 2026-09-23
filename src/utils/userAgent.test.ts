import { describe, it, expect } from 'vitest'
import { parseUserAgent } from './userAgent'

describe('parseUserAgent', () => {
  it.each([
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      { browser: 'Chrome', os: 'Windows', kind: 'desktop' }
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      { browser: 'Edge', os: 'Windows', kind: 'desktop' }
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      { browser: 'Safari', os: 'iOS', kind: 'mobile' }
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      { browser: 'Chrome', os: 'Android', kind: 'mobile' }
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:130.0) Gecko/20100101 Firefox/130.0',
      { browser: 'Firefox', os: 'macOS', kind: 'desktop' }
    ],
    ['', { browser: 'Navegador desconhecido', os: 'sistema desconhecido', kind: 'desktop' }]
  ])('%s', (ua, expected) => {
    expect(parseUserAgent(ua)).toEqual(expected)
  })
})
