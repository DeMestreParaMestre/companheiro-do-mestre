<script setup lang="ts">
import { DEATH_SAVE_MAX } from '../../utils/deathSaves'

defineProps<{
  successes: number
  failures: number
  stable?: boolean
}>()

defineEmits<{
  success: []
  failure: []
}>()
</script>

<template>
  <div class="dsBar" :class="{ stable }">
    <span class="dsTitle">{{ stable ? 'Estável' : 'Salv. morte' }}</span>
    <div class="dsGroup" title="Sucessos">
      <span
        v-for="i in DEATH_SAVE_MAX"
        :key="'s' + i"
        class="dsDot succ"
        :class="{ filled: i <= successes }"
      ></span>
    </div>
    <div class="dsGroup" title="Falhas">
      <span
        v-for="i in DEATH_SAVE_MAX"
        :key="'f' + i"
        class="dsDot fail"
        :class="{ filled: i <= failures }"
      ></span>
    </div>
    <button class="btn btnOut sm dsBtn" title="+1 sucesso" :disabled="stable" @click="$emit('success')">+✓</button>
    <button class="btn btnOut sm dsBtn" title="+1 falha" @click="$emit('failure')">+✕</button>
  </div>
</template>

<style scoped>
.dsBar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.2rem 0.45rem;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 3px;
}
.dsBar.stable {
  border-color: #2d6e2d;
  background: rgba(45, 110, 45, 0.08);
}
.dsTitle {
  font-family: var(--fN);
  font-size: 0.62rem;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.03em;
}
.dsGroup {
  display: flex;
  gap: 3px;
}
.dsDot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
}
.dsDot.succ {
  border-color: #2d6e2d;
}
.dsDot.succ.filled {
  background: #2d6e2d;
}
.dsDot.fail {
  border-color: #8b0000;
}
.dsDot.fail.filled {
  background: #8b0000;
}
.dsBtn {
  padding: 0.12rem 0.32rem !important;
  font-size: 0.68rem !important;
  line-height: 1;
}
</style>
