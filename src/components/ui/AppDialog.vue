<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useAppDialog } from '../../composables/useAppDialog'
import BaseModal from './BaseModal.vue'

const { state, accept, dismiss } = useAppDialog()
const promptInput = ref<HTMLInputElement | null>(null)

watch(
  () => state.open,
  async (open) => {
    if (open && state.mode === 'prompt') {
      await nextTick()
      promptInput.value?.focus()
      promptInput.value?.select()
    }
  }
)
</script>

<template>
  <BaseModal :open="state.open" @close="dismiss">
    <div class="modal appDialog" role="alertdialog" aria-labelledby="appDlgTitle" aria-describedby="appDlgMsg">
      <button class="mClose" type="button" title="Fechar" @click="dismiss">✕</button>
      <h3 id="appDlgTitle">{{ state.title }}</h3>
      <p id="appDlgMsg" class="appDialogMsg">{{ state.message }}</p>
      <div v-if="state.mode === 'prompt'" class="fGrp" style="margin-bottom: 1rem">
        <input ref="promptInput" v-model="state.inputValue" type="text" @keyup.enter="accept" />
      </div>
      <div class="appDialogActions">
        <button v-if="state.mode !== 'alert'" class="btn btnOut" type="button" @click="dismiss">
          {{ state.cancelLabel }}
        </button>
        <button class="btn" :class="state.danger ? 'btnDng' : 'btnRed'" type="button" @click="accept">
          {{ state.confirmLabel }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.appDialog {
  min-width: 280px;
  max-width: 420px;
  text-align: left;
}
.appDialogMsg {
  font-family: var(--fB);
  font-size: 0.95rem;
  color: var(--ink);
  line-height: 1.45;
  white-space: pre-line;
  margin: 0 0 1.1rem;
}
.appDialogActions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
