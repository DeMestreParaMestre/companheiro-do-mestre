<script setup lang="ts">
import { computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { appAlert } from '../../composables/useAppDialog'

defineEmits<{
  close: []
}>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

function clearLog() {
  camp.value.combatLog = []
}

async function sendLogToDiary() {
  const entries = (camp.value.combatLog || []).slice().reverse()
  if (!entries.length) {
    await appAlert('O log está vazio.')
    return
  }
  const body = entries.map((e) => (e.round ? `R${e.round}: ` : '') + e.text).join('\n')
  camp.value.diary.unshift({
    id: Date.now(),
    day: 'Combate',
    title: 'Resumo de combate',
    body,
    date: new Date().toLocaleDateString('pt-BR')
  })
  await appAlert('Resumo enviado ao Diário!', { title: 'Diário' })
}
</script>

<template>
  <div class="card" style="max-height: 240px; overflow-y: auto">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
      <span style="font-family: var(--fH); font-weight: 700; color: var(--red)">Log de Combate</span>
      <span style="display: flex; gap: 0.4rem">
        <button class="btn btnRed sm" @click="sendLogToDiary">Enviar ao Diário</button>
        <button class="btn btnOut sm" @click="clearLog">Limpar</button>
        <button class="btn btnOut sm" title="Fechar" @click="$emit('close')">✕</button>
      </span>
    </div>
    <div v-if="!(camp.combatLog || []).length" class="empty" style="padding: 0.8rem">Sem registros ainda.</div>
    <div
      v-for="l in camp.combatLog"
      :key="l.id"
      style="font-family: var(--fB); font-size: 0.9rem; padding: 0.15rem 0; border-bottom: 1px dashed var(--bg3)"
    >
      <span v-if="l.round" style="color: var(--muted); font-family: var(--fN); font-size: 0.72rem">R{{ l.round }} · </span>{{ l.text }}
    </div>
  </div>
</template>
