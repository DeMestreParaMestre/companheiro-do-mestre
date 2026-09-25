<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps<{ open: boolean; persistent?: boolean; elevated?: boolean }>()
const emit = defineEmits<{ close: [] }>()

let downTarget: EventTarget | null = null

function onMouseDown(e: MouseEvent) {
  downTarget = e.target
}
function onClick(e: MouseEvent) {
  if (props.persistent) return
  const overlay = e.currentTarget as HTMLElement
  if (e.target === overlay && downTarget === overlay) emit('close')
  downTarget = null
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && !props.persistent) emit('close')
}

watch(
  () => props.open,
  (o) => {
    if (o) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  }
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="mOv" :class="{ open, elevated }" @mousedown="onMouseDown" @click="onClick">
    <slot />
  </div>
</template>
