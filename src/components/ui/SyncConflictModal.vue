<script setup lang="ts">
import { useSyncStore, type ConflictChoice } from '../../stores/sync'
import BaseModal from './BaseModal.vue'

const sync = useSyncStore()
const choose = (c: ConflictChoice) => sync.conflict.resolve?.(c)
</script>

<template>
  <!-- Sem fechar pelo fundo/Esc: o mestre precisa escolher. -->
  <BaseModal :open="sync.conflict.open" @close="() => {}">
    <div class="modal conflictModal" role="alertdialog" aria-labelledby="conflictTitle">
      <h3 id="conflictTitle">⚠ Duas versões da mesma campanha</h3>
      <p class="conflictLead">
        <strong>{{ sync.conflict.name }}</strong>
        <template v-if="sync.conflict.remoteDeleted"> foi apagada em outro computador ({{ sync.conflict.remoteAt }}), mas tem alterações aqui.</template>
        <template v-else> foi alterada neste computador e também em outro ({{ sync.conflict.remoteAt }}).</template>
        Qual versão você quer manter?
      </p>

      <div class="conflictOpts">
        <button class="conflictOpt" @click="choose('local')">
          <span class="conflictIcon">💻</span>
          <span>
            <strong>Manter a deste computador</strong>
            <small>{{ sync.conflict.remoteDeleted ? 'Restaura a campanha na nuvem com o conteúdo daqui.' : 'Substitui a versão da nuvem pela daqui.' }}</small>
          </span>
        </button>
        <button class="conflictOpt" @click="choose('remote')">
          <span class="conflictIcon">☁</span>
          <span>
            <strong>{{ sync.conflict.remoteDeleted ? 'Apagar daqui também' : 'Manter a da nuvem' }}</strong>
            <small>{{ sync.conflict.remoteDeleted ? 'Remove a campanha deste computador.' : 'Descarta as alterações feitas neste computador.' }}</small>
          </span>
        </button>
        <button v-if="!sync.conflict.remoteDeleted" class="conflictOpt recommended" @click="choose('both')">
          <span class="conflictIcon">⧉</span>
          <span>
            <strong>Manter as duas <em>(recomendado)</em></strong>
            <small>A versão da nuvem continua com o nome original; a daqui vira uma cópia "(cópia deste computador)".</small>
          </span>
        </button>
      </div>
      <p class="conflictNote">Nada é perdido de vez: versões anteriores ficam no histórico da nuvem.</p>
    </div>
  </BaseModal>
</template>

<style scoped>
.conflictModal {
  width: 480px;
  max-width: 94vw;
}
.conflictLead {
  font-family: var(--fB);
  font-size: 0.98rem;
  line-height: 1.55;
  margin-bottom: 0.9rem;
}
.conflictOpts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.conflictOpt {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  width: 100%;
  padding: 0.7rem 0.85rem;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink);
  transition: border-color 0.15s, background 0.15s;
}
.conflictOpt:hover {
  border-color: var(--red);
  background: var(--light);
}
.conflictOpt.recommended {
  border-left: 4px solid var(--gold);
}
.conflictIcon {
  font-size: 1.4rem;
  flex-shrink: 0;
  width: 1.8rem;
  text-align: center;
}
.conflictOpt strong {
  display: block;
  font-family: var(--fH);
  font-size: 1rem;
}
.conflictOpt em {
  font-family: var(--fN);
  font-size: 0.7rem;
  font-style: normal;
  color: var(--gold);
}
.conflictOpt small {
  display: block;
  font-family: var(--fN);
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--muted);
  margin-top: 0.1rem;
}
.conflictNote {
  font-family: var(--fN);
  font-size: 0.72rem;
  font-style: italic;
  color: var(--muted);
  margin-top: 0.8rem;
}
</style>
