<script setup lang="ts">
defineProps<{ active: string }>()
const emit = defineEmits<{ change: [id: string] }>()

const tabs = [
  { id: 'sInit', label: '⬡ Iniciativa' },
  { id: 'sFichas', label: '⬡ Fichas & Status' },
  { id: 'sPJs', label: '⬡ Personagens' },
  { id: 'sItens', label: '⬡ Itens Mágicos' },
  { id: 'sSpells', label: '⬡ Magias' },
  { id: 'sMusic', label: '⬡ Músicas' },
  { id: 'sRefs', label: '⬡ Referências' },
  { id: 'sDiary', label: '⬡ Diário de Campanha' }
]
</script>

<template>
  <nav class="nav">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="nav-btn"
      :class="{ active: active === t.id }"
      :data-tour="t.id"
      @click="emit('change', t.id)"
    >
      {{ t.label }}
    </button>
  </nav>
</template>
