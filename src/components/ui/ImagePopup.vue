<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ open: boolean; name: string; img: string | null }>()
const emit = defineEmits<{ close: [] }>()

// A imagem é dimensionada em pixels (e não em vw/vh) no momento em que abre.
// Assim o zoom do navegador (Ctrl +) amplia a imagem junto com a página.
// Não recalculamos no resize de propósito: o zoom dispara resize e desfaria o efeito.
const imgEl = ref<HTMLImageElement | null>(null)
const fitWidth = ref<number | null>(null)

function fitToWindow() {
  const el = imgEl.value
  if (!el || !el.naturalWidth || !el.naturalHeight) return
  const scale = Math.min(1, (window.innerWidth * 0.9) / el.naturalWidth, (window.innerHeight * 0.8) / el.naturalHeight)
  fitWidth.value = Math.round(el.naturalWidth * scale)
}

watch(
  () => [props.open, props.img] as const,
  async ([open]) => {
    fitWidth.value = null
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
    <div class="ipScroll">
      <div class="ipContent">
        <p class="ipName">{{ name }}</p>
        <img
          v-if="img"
          ref="imgEl"
          :src="img"
          alt=""
          class="ipImg"
          :style="fitWidth ? { width: fitWidth + 'px' } : { maxWidth: '90vw', maxHeight: '80vh' }"
          @load="fitToWindow"
        />
        <div v-else class="ipEmpty">Sem imagem</div>
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
