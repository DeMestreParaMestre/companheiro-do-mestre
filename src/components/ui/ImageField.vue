<script setup lang="ts">
import { ref } from 'vue'
import { fileToDataUrl } from '../../utils/image'

const model = defineModel<string | null>({ required: true })
defineProps<{ top?: boolean }>()

const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')

async function onPick() {
  const file = input.value?.files?.[0]
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    model.value = await fileToDataUrl(file)
  } catch {
    error.value = 'Não foi possível ler esta imagem. Tente outro arquivo.'
  } finally {
    busy.value = false
    input.value!.value = ''
  }
}
</script>

<template>
  <div class="imgField">
    <input ref="input" type="file" accept="image/*" @change="onPick" />

    <div v-if="busy" class="imgFieldBox imgFieldBusy" role="status">⟳ Carregando imagem…</div>

    <div v-else-if="model" class="imgFieldCurrent">
      <img :src="model" alt="Imagem atual" :class="{ top }" />
      <div class="imgFieldInfo">
        <strong>✔ Imagem atual</strong>
        <small>Só uma imagem por vez. Trocar substitui esta.</small>
        <div class="imgFieldActions">
          <button type="button" class="btn btnOut sm" @click="input?.click()">⇄ Trocar imagem</button>
          <button type="button" class="btn btnOut sm" @click="model = null">✕ Remover</button>
        </div>
      </div>
    </div>

    <button v-else type="button" class="imgFieldBox" @click="input?.click()">⬡ Adicionar imagem</button>

    <p v-if="error" class="imgFieldError" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.imgField {
  margin-top: 0.5rem;
}
.imgFieldBox {
  display: block;
  width: 100%;
  padding: 0.65rem;
  border: 2px dashed var(--border);
  border-radius: 3px;
  background: none;
  color: var(--muted);
  font-family: var(--fB);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s;
}
.imgFieldBox:hover {
  border-color: var(--red);
  color: var(--red);
}
.imgFieldBusy {
  cursor: wait;
  border-style: solid;
}
.imgFieldCurrent {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.55rem;
  border: 1.5px solid var(--border);
  border-radius: 3px;
  background: var(--light);
}
.imgFieldCurrent img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.imgFieldCurrent img.top {
  object-position: top;
}
.imgFieldInfo {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.imgFieldInfo strong {
  font-family: var(--fH);
  color: var(--red);
}
.imgFieldInfo small {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
}
.imgFieldActions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.3rem;
}
.imgFieldError {
  margin-top: 0.35rem;
  font-family: var(--fN);
  font-size: 0.8rem;
  color: var(--danger);
}
</style>
