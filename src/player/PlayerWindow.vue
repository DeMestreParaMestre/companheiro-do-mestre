<script setup lang="ts">
import { reactive, onMounted, onBeforeUnmount } from 'vue'
import PlayerBoard from '../components/ui/PlayerBoard.vue'
import UpdateRequiredModal from '../components/ui/UpdateRequiredModal.vue'
import { PLAYER_CHANNEL, type PlayerMessage, type PlayerState } from '../utils/playerChannel'

const state = reactive<PlayerState>({
  campaignName: '',
  round: 0,
  currentTurn: -1,
  creatures: [],
  partyNames: [],
  theme: 'light'
})
const connected = reactive({ ok: false })

let channel: BroadcastChannel | null = null

onMounted(() => {
  document.title = 'Tela de Jogador'
  channel = new BroadcastChannel(PLAYER_CHANNEL)
  channel.onmessage = (e: MessageEvent<PlayerMessage>) => {
    if (e.data?.type === 'state') {
      Object.assign(state, e.data.payload)
      document.documentElement.setAttribute('data-theme', state.theme || 'light')
      connected.ok = true
    }
  }
  // Avisa a tela do mestre que a janela está pronta para receber o estado atual.
  channel.postMessage({ type: 'ready' } as PlayerMessage)
})

onBeforeUnmount(() => channel?.close())
</script>

<template>
  <div v-if="!connected.ok" class="pvWaiting">Aguardando a tela do mestre…</div>
  <PlayerBoard
    v-else
    :campaign-name="state.campaignName"
    :round="state.round"
    :current-turn="state.currentTurn"
    :creatures="state.creatures"
    :party-names="state.partyNames"
  />
  <UpdateRequiredModal />
</template>

<style scoped>
.pvWaiting {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--muted);
  font-family: var(--fB);
  font-size: 1.3rem;
}
</style>
