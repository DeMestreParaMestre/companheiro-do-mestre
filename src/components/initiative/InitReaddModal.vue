<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { PartyMember } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { rollInitiative } from '../../utils/dice'
import { isInInitiative as creatureInInitiative, sortCreaturesPreservingTurn } from '../../utils/initiative'
import { buildCreatureFromPartyMember } from '../../utils/partyLink'
import { appendCombatLog } from '../../utils/combatLog'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const readdInit = reactive({ open: false, member: null as PartyMember | null, init: '' })

function open(m: PartyMember) {
  readdInit.member = m
  readdInit.init = ''
  readdInit.open = true
}

function rollReaddInit() {
  readdInit.init = String(rollInitiative(0))
}

function confirmReaddInitiative() {
  const m = readdInit.member
  if (!m || creatureInInitiative(m.name, camp.value.creatures)) {
    readdInit.open = false
    return
  }
  const init = parseInt(readdInit.init) || 0
  camp.value.creatures.push(buildCreatureFromPartyMember(camp.value, m, init))
  camp.value.currentTurn = sortCreaturesPreservingTurn(camp.value.creatures, camp.value.currentTurn)
  appendCombatLog(camp.value, `${m.name} voltou à iniciativa (Init ${init})`)
  readdInit.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="readdInit.open" @close="readdInit.open = false">
    <div class="modal" style="min-width: 280px; max-width: 400px; width: 90vw">
      <button class="mClose" @click="readdInit.open = false">✕</button>
      <h3>Readicionar à Iniciativa</h3>
      <p v-if="readdInit.member" style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); margin-bottom: 0.8rem">
        {{ readdInit.member.name }} · HP:{{ readdInit.member.hpMax }}{{ readdInit.member.ac ? ' · AC:' + readdInit.member.ac : '' }}
      </p>
      <div style="display: flex; align-items: flex-end; gap: 0.5rem; margin-bottom: 0.8rem">
        <div class="fGrp" style="max-width: 120px">
          <label>Iniciativa</label>
          <input v-model="readdInit.init" type="number" placeholder="0" @keyup.enter="confirmReaddInitiative" />
        </div>
        <button class="btn btnOut sm" @click="rollReaddInit">🎲 Rolar</button>
      </div>
      <div style="text-align: right">
        <button class="btn btnRed" @click="confirmReaddInitiative">✔ Readicionar</button>
      </div>
    </div>
  </BaseModal>
</template>
