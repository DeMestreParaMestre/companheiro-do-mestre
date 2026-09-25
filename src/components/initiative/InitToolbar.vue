<script setup lang="ts">
defineProps<{
  round: number
  logCount: number
}>()

defineEmits<{
  next: []
  reset: []
  party: []
  newCombat: []
  encounters: []
  longRest: []
  refs: []
  toggleLog: []
}>()
</script>

<template>
  <div data-tour="init-toolbar" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; align-items: center">
    <button class="btn btnOut sm" @click="$emit('next')">▶ Próximo Turno</button>
    <button class="btn btnOut sm" @click="$emit('reset')">↺ Reiniciar</button>
    <button class="btn btnOut sm" @click="$emit('party')">⬡ Configurar Party</button>
    <button class="btn btnDng sm" @click="$emit('newCombat')">⬡ Novo Combate</button>
    <button class="btn btnOut sm" @click="$emit('encounters')">⚔ Encontros</button>
    <button class="btn btnOut sm" title="Restaura HP da party e limpa salvamentos" @click="$emit('longRest')">☽ Long Rest</button>
    <button class="btn btnOut sm" @click="$emit('refs')">📌 Referências</button>
    <span v-if="round > 0" class="roundBadge">⏱ Rodada {{ round }}</span>
    <button class="btn btnOut sm" style="margin-left: auto" @click="$emit('toggleLog')">
      📜 Log{{ logCount ? ' (' + logCount + ')' : '' }}
    </button>
  </div>
</template>
