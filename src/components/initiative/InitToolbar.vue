<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps<{
  round: number
  logCount: number
}>()

const emit = defineEmits<{
  next: []
  reset: []
  party: []
  newCombat: []
  encounters: []
  longRest: []
  refs: []
  toggleLog: []
}>()

const moreOpen = ref(false)

function onMore(action: 'reset' | 'party' | 'newCombat' | 'encounters' | 'longRest' | 'toggleLog') {
  moreOpen.value = false
  if (action === 'reset') emit('reset')
  else if (action === 'party') emit('party')
  else if (action === 'newCombat') emit('newCombat')
  else if (action === 'encounters') emit('encounters')
  else if (action === 'longRest') emit('longRest')
  else emit('toggleLog')
}

function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.tbMore')) moreOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div data-tour="init-toolbar" class="tbBar">
    <button class="btn btnRed sm" @click="$emit('next')">▶ Próximo Turno</button>
    <span v-if="round > 0" class="roundBadge">⏱ Rodada {{ round }}</span>
    <button class="btn btnOut sm" @click="$emit('refs')">📌 Referências</button>
    <slot name="music" />
    <div class="tbMore" style="margin-left: auto">
      <button class="btn btnOut sm" :aria-expanded="moreOpen" @click.stop="moreOpen = !moreOpen">Mais ▾</button>
      <div class="tbMenu" :class="{ open: moreOpen }" @click.stop>
        <button class="btn btnOut sm" @click="onMore('reset')">↺ Reiniciar</button>
        <button class="btn btnOut sm" @click="onMore('party')">⬡ Configurar Party</button>
        <button class="btn btnDng sm" @click="onMore('newCombat')">⬡ Novo Combate</button>
        <button class="btn btnOut sm" @click="onMore('encounters')">⚔ Encontros</button>
        <button class="btn btnOut sm" title="Restaura HP da party e limpa salvamentos" @click="onMore('longRest')">
          ☽ Long Rest
        </button>
        <button class="btn btnOut sm" @click="onMore('toggleLog')">
          📜 Log{{ logCount ? ' (' + logCount + ')' : '' }}
        </button>
      </div>
    </div>
  </div>
</template>
