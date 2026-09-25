import { createApp } from 'vue'
import './assets/styles.css'
import { isStaleChunkError, reloadForNewVersion } from './utils/staleChunk'

window.addEventListener('vite:preloadError', (e) => {
  if (reloadForNewVersion()) e.preventDefault()
})
window.addEventListener('unhandledrejection', (e) => {
  if (isStaleChunkError(e.reason)) reloadForNewVersion()
})

// Modo "tela de jogador": janela pop-up separada (segundo monitor) que apenas
// espelha o combate recebido via BroadcastChannel, sem a interface do mestre.
if (location.hash === '#player') {
  import('./player/PlayerWindow.vue').then((m) => {
    createApp(m.default).mount('#app')
  })
} else {
  Promise.all([import('./App.vue'), import('pinia')]).then(([app, pinia]) => {
    const vueApp = createApp(app.default).use(pinia.createPinia())
    vueApp.mount('#app')
    void import('./monitoring').then((m) => m.initMonitoring(vueApp))
  })
}
