<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="toastHost" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="'toast-' + t.type"
      role="status"
      @click="dismiss(t.id)"
    >
      <span class="toastIcon">{{ t.type === 'success' ? '✔' : t.type === 'error' ? '✕' : 'ℹ' }}</span>
      <span class="toastMsg">{{ t.message }}</span>
    </div>
  </div>
</template>
