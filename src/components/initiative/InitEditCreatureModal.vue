<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { DAMAGE_TYPES } from '../../constants'
import type { Creature } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { sortCreaturesPreservingTurn } from '../../utils/initiative'
import { applyLegendaryFields } from '../../utils/legendary'
import { isPartyName, syncPersonagemFromCreature } from '../../utils/partyLink'
import { onPartyHealed, onPartyDropToZero } from '../../utils/deathSaves'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const editCr = reactive({
  open: false,
  id: 0,
  name: '',
  init: '',
  hp: '',
  hpMax: '',
  ac: '',
  fichaId: '' as string | number,
  isLegendary: false,
  legMax: '',
  legResistMax: '',
  resist: [] as string[],
  vuln: [] as string[],
  immune: [] as string[]
})

function open(c: Creature) {
  editCr.id = c.id
  editCr.name = c.name
  editCr.init = String(c.init)
  editCr.hp = String(c.hp)
  editCr.hpMax = String(c.hpMax)
  editCr.ac = c.ac != null ? String(c.ac) : ''
  editCr.fichaId = c.fichaId || ''
  editCr.isLegendary = !!c.isLegendary
  editCr.legMax = c.legActionsMax ? String(c.legActionsMax) : ''
  editCr.legResistMax = c.legResistMax ? String(c.legResistMax) : ''
  editCr.resist = [...(c.resist || [])]
  editCr.vuln = [...(c.vuln || [])]
  editCr.immune = [...(c.immune || [])]
  editCr.open = true
}

watch(
  () => editCr.isLegendary,
  (on) => {
    if (!on) return
    if (!editCr.legMax) editCr.legMax = '3'
    if (!editCr.legResistMax) editCr.legResistMax = '3'
  }
)

function toggleDT(list: string[], t: string) {
  const i = list.indexOf(t)
  if (i >= 0) list.splice(i, 1)
  else list.push(t)
}

function saveEditCreature() {
  const c = camp.value.creatures.find((x) => x.id === editCr.id)
  if (!c) return
  c.name = editCr.name.trim() || c.name
  const ni = parseInt(editCr.init)
  if (!isNaN(ni)) {
    c.init = ni
    c.initReal = ni
  }
  const prevHp = c.hp
  c.hp = parseInt(editCr.hp)
  c.hpMax = parseInt(editCr.hpMax) || c.hpMax
  c.ac = parseInt(editCr.ac) || null
  c.fichaId = editCr.fichaId
  if (isPartyName(camp.value, c.name)) {
    if (c.hp > 0) onPartyHealed(c)
    else if (c.hp === 0 && prevHp > 0) onPartyDropToZero(c)
  } else {
    c.dead = c.hp <= 0
  }
  applyLegendaryFields(c, {
    isLegendary: editCr.isLegendary,
    actionsMax: editCr.legMax,
    resistMax: editCr.legResistMax
  })
  c.resist = editCr.resist.length ? [...editCr.resist] : undefined
  c.vuln = editCr.vuln.length ? [...editCr.vuln] : undefined
  c.immune = editCr.immune.length ? [...editCr.immune] : undefined
  const idx = camp.value.creatures.findIndex((x) => x.id === c.id)
  if (idx >= 0) camp.value.creatures[idx] = { ...c }
  camp.value.currentTurn = sortCreaturesPreservingTurn(camp.value.creatures, camp.value.currentTurn)
  syncPersonagemFromCreature(camp.value, camp.value.creatures[idx] ?? c)
  editCr.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="editCr.open" @close="editCr.open = false">
    <div class="modal" style="max-width: 480px; width: 90vw">
      <button class="mClose" @click="editCr.open = false">✕</button>
      <h3>Editar Criatura</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="editCr.name" type="text" /></div>
        <div class="fGrp" style="max-width: 75px"><label>Iniciativa</label><input v-model="editCr.init" type="number" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp" style="max-width: 88px"><label>HP Atual</label><input v-model="editCr.hp" type="number" /></div>
        <div class="fGrp" style="max-width: 88px"><label>HP Máx</label><input v-model="editCr.hpMax" type="number" /></div>
        <div class="fGrp" style="max-width: 72px"><label>AC</label><input v-model="editCr.ac" type="number" /></div>
        <div class="fGrp">
          <label>Ficha</label>
          <select v-model="editCr.fichaId">
            <option value="">— nenhuma —</option>
            <option v-for="f in camp.fichas" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>
      </div>
      <div class="fRow" style="align-items: center">
        <label style="display: flex; align-items: center; gap: 0.4rem; text-transform: none">
          <input v-model="editCr.isLegendary" type="checkbox" style="width: auto" /> Criatura lendária
        </label>
        <div v-if="editCr.isLegendary" class="fGrp" style="max-width: 130px">
          <label>Ações lendárias</label><input v-model="editCr.legMax" type="number" min="1" placeholder="3" />
        </div>
        <div v-if="editCr.isLegendary" class="fGrp" style="max-width: 150px">
          <label>Resist. lendária</label><input v-model="editCr.legResistMax" type="number" min="1" placeholder="3" />
        </div>
      </div>
      <div style="margin-top: 0.5rem">
        <label>Resistências</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem">
          <span
            v-for="t in DAMAGE_TYPES"
            :key="'r' + t"
            class="dtChip"
            :style="editCr.resist.includes(t) ? 'background:#1a6b2a;color:#fff;border-color:#1a6b2a' : 'border-color:var(--border);color:var(--muted)'"
            @click="toggleDT(editCr.resist, t)"
            >{{ t }}</span
          >
        </div>
      </div>
      <div style="margin-top: 0.5rem">
        <label>Vulnerabilidades</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem">
          <span
            v-for="t in DAMAGE_TYPES"
            :key="'v' + t"
            class="dtChip"
            :style="editCr.vuln.includes(t) ? 'background:#9a3b00;color:#fff;border-color:#9a3b00' : 'border-color:var(--border);color:var(--muted)'"
            @click="toggleDT(editCr.vuln, t)"
            >{{ t }}</span
          >
        </div>
      </div>
      <div style="margin-top: 0.5rem">
        <label>Imunidades</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem">
          <span
            v-for="t in DAMAGE_TYPES"
            :key="'i' + t"
            class="dtChip"
            :style="editCr.immune.includes(t) ? 'background:#5b2d8e;color:#fff;border-color:#5b2d8e' : 'border-color:var(--border);color:var(--muted)'"
            @click="toggleDT(editCr.immune, t)"
            >{{ t }}</span
          >
        </div>
      </div>
      <div style="text-align: right; margin-top: 0.9rem"><button class="btn btnRed" @click="saveEditCreature">Salvar</button></div>
    </div>
  </BaseModal>
</template>
