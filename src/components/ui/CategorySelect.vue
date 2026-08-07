<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useToast } from '../../composables/useToast'
import BaseModal from './BaseModal.vue'

const CREATE = '__create_new__'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: string[]
    createLabel?: string
    modalTitle?: string
    modalHint?: string
    emptyLabel?: string
    namePlaceholder?: string
  }>(),
  {
    createLabel: '+ Criar nova categoria...',
    modalTitle: 'Nova categoria',
    modalHint: 'Digite o nome da nova categoria.',
    emptyLabel: '— nenhuma —',
    namePlaceholder: 'Nome da categoria'
  }
)
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const toast = useToast()

const selectRef = ref<HTMLSelectElement | null>(null)
const createOpen = ref(false)
const newName = ref('')

const allOptions = computed(() => {
  const list = [...props.options]
  const cur = props.modelValue?.trim()
  if (cur && !list.includes(cur)) list.push(cur)
  return list.sort((a, b) => a.localeCompare(b))
})

async function onSelectChange(e: Event) {
  const el = e.target as HTMLSelectElement
  const v = el.value
  if (v === CREATE) {
    createOpen.value = true
    newName.value = ''
    await nextTick()
    el.value = props.modelValue || ''
    return
  }
  emit('update:modelValue', v)
}

function confirmCreate() {
  const name = newName.value.trim()
  if (!name) {
    toast.show('Digite um nome para a categoria.', 'error')
    return
  }
  emit('update:modelValue', name)
  createOpen.value = false
  newName.value = ''
}

function cancelCreate() {
  createOpen.value = false
  newName.value = ''
  if (selectRef.value) selectRef.value.value = props.modelValue || ''
}
</script>

<template>
  <select ref="selectRef" class="catSelect" :value="modelValue || ''" @change="onSelectChange">
    <option :value="CREATE">{{ createLabel }}</option>
    <option value="">{{ emptyLabel }}</option>
    <option v-for="o in allOptions" :key="o" :value="o">{{ o }}</option>
  </select>

  <BaseModal :open="createOpen" @close="cancelCreate">
    <div class="modal" style="max-width: 380px; width: 92vw">
      <button class="mClose" type="button" @click="cancelCreate">✕</button>
      <h3>{{ modalTitle }}</h3>
      <p style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); margin-bottom: 0.75rem">{{ modalHint }}</p>
      <div class="fGrp">
        <label>Nome</label>
        <input v-model="newName" type="text" :placeholder="namePlaceholder" @keyup.enter="confirmCreate" />
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.9rem">
        <button type="button" class="btn btnOut sm" @click="cancelCreate">Cancelar</button>
        <button type="button" class="btn btnRed sm" @click="confirmCreate">Criar</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.catSelect {
  width: 100%;
  font-family: var(--fH);
  font-size: 0.88rem;
  background: var(--light);
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 0.4rem 0.55rem;
  border-radius: 3px;
}
.catSelect option[value='__create_new__'] {
  font-weight: 700;
  color: var(--red);
}
</style>
