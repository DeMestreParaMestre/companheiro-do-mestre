<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Creature } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { addCustomCondition } from '../../utils/conditions'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const customStatus = reactive({ open: false, cid: 0, label: '' })

function open(c: Creature) {
  customStatus.cid = c.id
  customStatus.label = ''
  customStatus.open = true
}

function confirmCustomStatus() {
  const c = camp.value.creatures.find((x) => x.id === customStatus.cid)
  if (c) addCustomCondition(c, customStatus.label)
  customStatus.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="customStatus.open" @close="customStatus.open = false">
    <div class="modal" style="max-width: 380px; width: 90vw">
      <button class="mClose" @click="customStatus.open = false">✕</button>
      <h3>Nome do Status</h3>
      <div class="fGrp" style="margin-bottom: 0.8rem">
        <label>Digite o nome</label>
        <input v-model="customStatus.label" type="text" placeholder="Ex: Marcado, Amaldiçoado..." @keyup.enter="confirmCustomStatus" />
      </div>
      <button class="btn btnRed" @click="confirmCustomStatus">✔ Confirmar</button>
    </div>
  </BaseModal>
</template>
