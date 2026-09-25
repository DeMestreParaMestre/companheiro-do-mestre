<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import { useForcedUpdate } from '../../composables/useForcedUpdate'

const { outdated, runningLabel, publishedLabel, apply } = useForcedUpdate()

function refresh() {
  void apply()
}
</script>

<template>
  <BaseModal :open="outdated" persistent elevated>
    <div class="modal updateModal" role="alertdialog" aria-labelledby="updateTitle" aria-describedby="updateMsg">
      <h3 id="updateTitle">Nova versão disponível</h3>
      <p id="updateMsg" class="updateMsg">
        O Companheiro do Mestre foi atualizado para <strong>{{ publishedLabel }}</strong>.
        Esta aba ainda está na <strong>{{ runningLabel }}</strong>.
        Atualize para continuar — as campanhas no navegador e na nuvem não se perdem.
      </p>
      <div class="updateActions">
        <button class="btn btnRed" type="button" @click="refresh">Atualizar agora</button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.updateModal {
  min-width: 280px;
  max-width: 420px;
}
.updateMsg {
  font-family: var(--fB);
  font-size: 0.95rem;
  color: var(--ink);
  line-height: 1.45;
  margin: 0 0 1.1rem;
}
.updateActions {
  display: flex;
  justify-content: flex-end;
}
</style>
