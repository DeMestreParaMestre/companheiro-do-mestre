export interface DeviceInfo {
  browser: string
  os: string
  kind: 'mobile' | 'tablet' | 'desktop'
}

// A ordem importa: Edge/Opera também dizem "Chrome"; iPhone diz "like Mac OS X"; Android diz "Linux".
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Version\/[\d.]+.*Safari\//, 'Safari']
]
const SYSTEMS: [RegExp, string][] = [
  [/iPad/, 'iPadOS'],
  [/iPhone|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux']
]

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua || ''
  const browser = BROWSERS.find(([re]) => re.test(s))?.[1] || 'Navegador desconhecido'
  const os = SYSTEMS.find(([re]) => re.test(s))?.[1] || 'sistema desconhecido'
  const kind = /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s)) ? 'tablet' : /Mobi|iPhone|Android/.test(s) ? 'mobile' : 'desktop'
  return { browser, os, kind }
}
