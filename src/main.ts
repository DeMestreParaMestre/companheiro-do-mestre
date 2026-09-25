import { createApp } from 'vue'
import './assets/styles.css'

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
