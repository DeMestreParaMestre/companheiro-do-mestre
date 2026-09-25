<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { Creature, EncounterTemplate } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { rollInitiative } from '../../utils/dice'
import { sortCreaturesPreservingTurn } from '../../utils/initiative'
import { isPartyName } from '../../utils/partyLink'
import { appendCombatLog } from '../../utils/combatLog'
import { spawnFromTemplate, templateSummary } from '../../utils/encounters'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const encounters = computed(() => camp.value.encounters || [])

const encModal = ref(false)
const encInit = reactive({
  open: false,
  enc: null as EncounterTemplate | null,
  mode: 'add' as 'add' | 'replace',
  creatures: [] as Creature[],
  inits: [] as string[]
})

function open() {
  encModal.value = true
}

function applyEncounterCreatures(enc: EncounterTemplate, spawned: Creature[], mode: 'add' | 'replace') {
  if (!spawned.length) return
  const c = camp.value
  const prevTurn = mode === 'replace' ? -1 : c.currentTurn
  if (mode === 'replace') {
    const partyCreatures = c.creatures.filter((cr) => isPartyName(c, cr.name))
    c.creatures = [...partyCreatures, ...spawned]
  } else {
    c.creatures.push(...spawned)
  }
  c.currentTurn = sortCreaturesPreservingTurn(c.creatures, prevTurn)
  appendCombatLog(c, `Encontro "${enc.name}" carregado (${templateSummary(enc)})`)
}

function loadEncounter(enc: EncounterTemplate, mode: 'add' | 'replace', rollInit: boolean) {
  const spawned = spawnFromTemplate(enc, { rollInit })
  if (!spawned.length) return
  applyEncounterCreatures(enc, spawned, mode)
  encModal.value = false
}

function openEncounterInit(enc: EncounterTemplate, mode: 'add' | 'replace') {
  const spawned = spawnFromTemplate(enc, { rollInit: false })
  if (!spawned.length) return
  encInit.enc = enc
  encInit.mode = mode
  encInit.creatures = spawned
  encInit.inits = spawned.map(() => '')
  encModal.value = false
  encInit.open = true
}

function rollAllEncInit() {
  encInit.inits = encInit.creatures.map((cr) => String(rollInitiative(cr.initBonus ?? 0)))
}

function confirmEncounterInit() {
  const enc = encInit.enc
  if (!enc) return
  const spawned = encInit.creatures.map((cr, i) => {
    const init = parseInt(encInit.inits[i]) || 0
    return { ...cr, init, initReal: init }
  })
  applyEncounterCreatures(enc, spawned, encInit.mode)
  encInit.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="encModal" @close="encModal = false">
    <div class="modal" style="max-width: 520px; width: 92vw">
      <button class="mClose" @click="encModal = false">✕</button>
      <h3>⚔ Carregar Encontro</h3>
      <p v-if="!encounters.length" class="empty" style="padding: 0.8rem">
        Nenhum encontro salvo. Crie em <strong>Fichas &amp; Status</strong>.
      </p>
      <div v-for="enc in encounters" :key="enc.id" class="encCard">
        <div style="flex: 1; min-width: 0">
          <div style="font-family: var(--fH); font-weight: 700; color: var(--red)">{{ enc.name }}</div>
          <div style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); margin-top: 0.15rem">{{ templateSummary(enc) }}</div>
          <div v-if="enc.notes" style="font-family: var(--fB); font-size: 0.82rem; color: var(--muted); margin-top: 0.25rem; font-style: italic">{{ enc.notes }}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.25rem; flex-shrink: 0">
          <button class="btn btnRed sm" @click="openEncounterInit(enc, 'add')">+ Adicionar</button>
          <button class="btn btnOut sm" @click="loadEncounter(enc, 'add', true)">+ Adicionar (🎲 init)</button>
          <button class="btn btnOut sm" @click="openEncounterInit(enc, 'replace')">Substituir</button>
        </div>
      </div>
    </div>
  </BaseModal>

  <BaseModal :open="encInit.open" @close="encInit.open = false">
    <div class="modal" style="min-width: 300px; max-width: 460px; width: 90vw">
      <button class="mClose" @click="encInit.open = false">✕</button>
      <h3>{{ encInit.mode === 'replace' ? 'Substituir por Encontro' : 'Adicionar Encontro' }}</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; flex-wrap: wrap">
        <p style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); font-style: italic">
          Iniciativas de “{{ encInit.enc?.name }}”:
        </p>
        <button class="btn btnOut sm" @click="rollAllEncInit">🎲 Rolar todas</button>
      </div>
      <div style="max-height: 50vh; overflow-y: auto">
        <div
          v-for="(cr, i) in encInit.creatures"
          :key="cr.id"
          style="display: flex; align-items: center; gap: 0.65rem; padding: 0.48rem 0.7rem; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; margin-bottom: 0.4rem"
        >
          <div style="flex: 1; min-width: 0; font-family: var(--fH); font-weight: 600; color: var(--red)">
            {{ cr.name }}<br /><span style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)"
              >HP:{{ cr.hpMax }}{{ cr.ac ? ' · AC:' + cr.ac : '' }}{{ cr.initBonus != null ? ' · Init ' + (cr.initBonus >= 0 ? '+' : '') + cr.initBonus : '' }}</span
            >
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.2rem">
            <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600">Iniciativa</span>
            <input
              v-model="encInit.inits[i]"
              type="number"
              placeholder="0"
              style="width: 70px; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.32rem 0.48rem; border-radius: 3px; font-size: 0.9rem"
            />
          </div>
        </div>
      </div>
      <div style="text-align: right; margin-top: 0.8rem">
        <button class="btn btnRed" @click="confirmEncounterInit">
          {{ encInit.mode === 'replace' ? '↺ Substituir' : '+ Adicionar' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
