<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ open: boolean; name: string; img: string | null }>()
const emit = defineEmits<{ close: [] }>()

// A imagem é dimensionada em pixels (e não em vw/vh) no momento em que abre.
// Assim o zoom do navegador (Ctrl +) amplia a imagem junto com a página.
// Não recalculamos no resize de propósito: o zoom dispara resize e desfaria o efeito.
const imgEl = ref<HTMLImageElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const fitWidth = ref<number | null>(null)
const zoomed = ref(false)

function fitToWindow() {
  const el = imgEl.value
  if (!el || !el.naturalWidth || !el.naturalHeight) return
  const scale = Math.min(1, (window.innerWidth * 0.9) / el.naturalWidth, (window.innerHeight * 0.8) / el.naturalHeight)
  fitWidth.value = Math.round(el.naturalWidth * scale)
}

const imgWidth = computed(() => {
  if (!fitWidth.value) return null
  // Imagens pequenas já cabem inteiras: sem o mínimo de 2x o clique não ampliaria nada.
  return zoomed.value ? Math.max(imgEl.value?.naturalWidth || 0, fitWidth.value * 2) : fitWidth.value
})

/** Amplia mantendo sob o cursor o ponto clicado; clicar de novo volta ao tamanho da tela. */
async function toggleZoom(e: MouseEvent) {
  const el = imgEl.value
  if (!el || !fitWidth.value) return
  const r = el.getBoundingClientRect()
  const fx = (e.clientX - r.left) / r.width
  const fy = (e.clientY - r.top) / r.height
  zoomed.value = !zoomed.value
  if (!zoomed.value) return
  await nextTick()
  const r2 = el.getBoundingClientRect()
  scrollEl.value?.scrollBy(r2.left + fx * r2.width - e.clientX, r2.top + fy * r2.height - e.clientY)
}

watch(
  () => [props.open, props.img] as const,
  async ([open]) => {
    fitWidth.value = null
    zoomed.value = false
    if (!open) return
    await nextTick()
    // Imagem já carregada (ex.: reaberta): o evento load não dispara de novo.
    if (imgEl.value?.complete) fitToWindow()
  }
)
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <button class="ipClose" title="Fechar" @click="emit('close')">✕</button>
    <div ref="scrollEl" class="ipScroll">
      <div class="ipContent">
        <p class="ipName">{{ name }}</p>
        <img
          v-if="img"
          ref="imgEl"
          :src="img"
          alt=""
          class="ipImg"
          :class="{ zoomed }"
          :title="zoomed ? 'Clique para reduzir' : 'Clique para ampliar'"
          :style="imgWidth ? { width: imgWidth + 'px' } : { maxWidth: '90vw', maxHeight: '80vh' }"
          @load="fitToWindow"
          @click="toggleZoom"
        />
        <div v-else class="ipEmpty">Sem imagem</div>
        <slot />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* Contêiner com rolagem: encolhe ao tamanho do conteúdo e, quando a imagem
   ampliada passa da tela, fica limitado à janela e rola. */
.ipScroll {
  display: flex;
  max-width: 100vw;
  max-height: 100vh;
  overflow: auto;
}
/* margin: auto centraliza quando sobra espaço e vira 0 quando a imagem é maior
   que a tela, evitando que as bordas fiquem cortadas e inacessíveis. */
.ipContent {
  margin: auto;
  padding: 2.5rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}
.ipName {
  font-family: var(--fH);
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}
.ipImg {
  display: block;
  height: auto;
  max-width: none;
  border-radius: 4px;
  border: 2px solid var(--border2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  cursor: zoom-in;
}
.ipImg.zoomed {
  cursor: zoom-out;
}
.ipEmpty {
  background: var(--bg2);
  border: 2px solid var(--border);
  border-radius: 4px;
  padding: 1.5rem 2.5rem;
  color: var(--muted);
  font-style: italic;
}
/* Fixo no canto da tela para continuar acessível com a imagem ampliada e rolada. */
.ipClose {
  position: fixed;
  top: 0.8rem;
  right: 1rem;
  z-index: 1;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(0, 0, 0, 0.55);
  color: #eee;
  font-size: 1.1rem;
  cursor: pointer;
}
.ipClose:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
