<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { rollInitiative } from '../../utils/dice'
import { sortCreaturesPreservingTurn } from '../../utils/initiative'
import { buildCreatureFromPartyMember } from '../../utils/partyLink'
import { appConfirm } from '../../composables/useAppDialog'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const newCombat = reactive({ open: false, inits: [] as string[] })

async function open() {
  const p = camp.value.party
  if (!p.length) {
    if (
      await appConfirm('Limpar criaturas e começar?', {
        title: 'Novo combate',
        confirmLabel: 'Limpar'
      })
    ) {
      camp.value.creatures = []
      camp.value.currentTurn = -1
      camp.value.round = 0
    }
    return
  }
  newCombat.inits = p.map(() => '')
  newCombat.open = true
}

function rollAllNewCombat() {
  newCombat.inits = camp.value.party.map(() => String(rollInitiative(0)))
}

function startNewCombat() {
  const c = camp.value
  c.creatures = []
  c.currentTurn = -1
  c.round = 0
  c.party.forEach((m, i) => {
    const init = parseInt(newCombat.inits[i]) || 0
    c.creatures.push(buildCreatureFromPartyMember(c, m, init, Date.now() + i))
  })
  sortCreaturesPreservingTurn(c.creatures, -1)
  newCombat.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="newCombat.open" @close="newCombat.open = false">
    <div class="modal" style="min-width: 300px; max-width: 460px; width: 90vw">
      <button class="mClose" @click="newCombat.open = false">✕</button>
      <h3>Novo Combate</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem">
        <p style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); font-style: italic">Iniciativas da party:</p>
        <button class="btn btnOut sm" @click="rollAllNewCombat">🎲 Rolar todas</button>
      </div>
      <div>
        <div
          v-for="(m, i) in camp.party"
          :key="i"
          style="display: flex; align-items: center; gap: 0.65rem; padding: 0.48rem 0.7rem; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; margin-bottom: 0.4rem"
        >
          <div style="flex: 1; font-family: var(--fH); font-weight: 600; color: var(--red)">
            {{ m.name }}<br /><span style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)">HP:{{ m.hpMax }}{{ m.ac ? ' · AC:' + m.ac : '' }}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.2rem">
            <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600">Iniciativa</span>
            <input v-model="newCombat.inits[i]" type="number" placeholder="0" style="width: 70px; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.32rem 0.48rem; border-radius: 3px; font-size: 0.9rem" />
          </div>
        </div>
      </div>
      <div style="text-align: right; margin-top: 0.8rem"><button class="btn btnRed" @click="startNewCombat">▶ Iniciar</button></div>
    </div>
  </BaseModal>
</template>
