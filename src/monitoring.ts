import { watch, type App } from 'vue'
import { useAuthStore } from './stores/auth'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

/**
 * Relatório de erros (Sentry). Só liga com VITE_SENTRY_DSN definido (build de produção).
 * Carregado depois do app montar para não pesar na primeira tela.
 * Nada de dado pessoal: sem e-mail, IP, conteúdo de campanha nem gravação de sessão.
 */
export async function initMonitoring(app: App) {
  if (!DSN) return
  const Sentry = await import('@sentry/vue')
  Sentry.init({
    app,
    dsn: DSN,
    release: import.meta.env.VITE_RELEASE || undefined,
    environment: import.meta.env.MODE,
    // Os padrões do SDK coletam tudo isso; aqui fica tudo desligado.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Falhas de rede (offline, conexão instável) não são bugs do app.
      /^Failed to fetch$/,
      /^NetworkError when attempting to fetch resource\.?$/,
      /^Load failed$/,
      /^AbortError/,
      // Aba aberta durante um deploy; o app recarrega sozinho (utils/staleChunk).
      /dynamically imported module|importing a module script failed/i
    ],
    denyUrls: [/^(chrome|moz|safari(-web)?)-extension:\/\//i, /extensions\//i],
    beforeBreadcrumb: (b) => (b.category === 'console' ? null : b),
    beforeSend(event) {
      if (!navigator.onLine) return null
      if (event.user) event.user = { id: event.user.id }
      return event
    }
  })

  const auth = useAuthStore()
  watch(
    () => auth.user?.id,
    (id) => Sentry.setUser(id ? { id } : null),
    { immediate: true }
  )

  // Abrir o site com ?sentry-test envia um erro de teste.
  if (new URLSearchParams(location.search).has('sentry-test')) {
    setTimeout(() => {
      throw new Error('Teste do Sentry: se isto aparece no painel, está funcionando.')
    })
  }
}
