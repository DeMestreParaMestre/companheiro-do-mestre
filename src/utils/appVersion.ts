import { version } from '../../package.json'

/** Versão semântica do app (`package.json`). */
export const APP_VERSION = version

export function appVersionLabel(): string {
  return APP_VERSION.startsWith('v') ? APP_VERSION : `v${APP_VERSION}`
}
