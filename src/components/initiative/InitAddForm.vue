<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { PartyMember } from '../../types'
import { rollInitiative } from '../../utils/dice'
import { isInInitiative as creatureInInitiative, partyMembersNotInInitiative, sortCreaturesPreservingTurn } from '../../utils/initiative'
import { appAlert } from '../../composables/useAppDialog'

const emit = defineEmits<{
  readd: [member: PartyMember]
}>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const PARTY_LINK_PREFIX = 'party:'

const cFichaLink = ref('')
const cName = ref('')
const cInit = ref('')
const cHpMax = ref('')
const cAc = ref('')
const cQty = ref('1')
const initBonusHint = ref('')

const partyNotInInitiative = computed(() =>
  partyMembersNotInInitiative(camp.value.party, camp.value.creatures)
)

const linkedFichaBonus = computed(() => {
  const id = cFichaLink.value
  if (!id || id.startsWith(PARTY_LINK_PREFIX)) return 0
  const f = camp.value.fichas.find((f) => String(f.id) === String(id))
  return f && f.initBonus != null ? f.initBonus : 0
})

function autofillFicha() {
  initBonusHint.value = ''
  const id = cFichaLink.value
  if (!id || id.startsWith(PARTY_LINK_PREFIX)) return
  const f = camp.value.fichas.find((f) => String(f.id) === String(id))
  if (!f) return
  cName.value = f.name
  if (f.hpMax) cHpMax.value = String(f.hpMax)
  if (f.ac) cAc.value = String(f.ac)
  if (f.initBonus != null) {
    initBonusHint.value = 'Init. Bonus desta ficha: ' + (f.initBonus >= 0 ? '+' : '') + f.initBonus
  }
}

function onFichaLinkChange() {
  const id = cFichaLink.value
  if (!id) return
  if (id.startsWith(PARTY_LINK_PREFIX)) {
    const name = id.slice(PARTY_LINK_PREFIX.length)
    const m = camp.value.party.find((p) => p.name === name)
    cFichaLink.value = ''
    if (m && !creatureInInitiative(m.name, camp.value.creatures)) emit('readd', m)
    return
  }
  autofillFicha()
}

function rollAddInit() {
  cInit.value = String(rollInitiative(linkedFichaBonus.value))
}

async function addCreature() {
  const name = cName.value.trim()
  if (!name) {
    await appAlert('Digite o nome!')
    return
  }
  const init = parseInt(cInit.value) || 0
  const hp = parseInt(cHpMax.value) || 1
  const ac = parseInt(cAc.value) || null
  const qty = Math.max(1, parseInt(cQty.value) || 1)
  const f = camp.value.fichas.find(
    (f) => String(f.id) === String(cFichaLink.value) && !String(cFichaLink.value).startsWith(PARTY_LINK_PREFIX)
  )
  const initBonus = f && f.initBonus != null ? f.initBonus : null
  const wasEmpty = !camp.value.creatures.length
  for (let i = 0; i < qty; i++) {
    camp.value.creatures.push({
      id: Date.now() + i,
      name: qty > 1 ? `${name} ${i + 1}` : name,
      init,
      initReal: init,
      hp,
      hpMax: hp,
      ac,
      fichaId: f ? f.id : '',
      dead: false,
      conditions: [],
      initBonus
    })
  }
  camp.value.currentTurn = sortCreaturesPreservingTurn(camp.value.creatures, camp.value.currentTurn)
  if (wasEmpty) camp.value.currentTurn = -1
  cName.value = ''
  cInit.value = ''
  cHpMax.value = ''
  cAc.value = ''
  cQty.value = '1'
  cFichaLink.value = ''
  initBonusHint.value = ''
}
</script>

<template>
  <div class="card" data-tour="init-add">
    <div class="fRow">
      <div class="fGrp">
        <label>Vincular Ficha</label>
        <select v-model="cFichaLink" @change="onFichaLinkChange">
          <option value="">— nenhuma —</option>
          <optgroup v-if="partyNotInInitiative.length" label="Party (fora da iniciativa)">
            <option v-for="m in partyNotInInitiative" :key="'party-' + m.name" :value="PARTY_LINK_PREFIX + m.name">
              ↩ {{ m.name }}
            </option>
          </optgroup>
          <optgroup v-if="camp.fichas.length" label="Fichas">
            <option v-for="f in camp.fichas" :key="f.id" :value="String(f.id)">{{ f.name }}</option>
          </optgroup>
        </select>
      </div>
      <div class="fGrp"><label>Nome</label><input v-model="cName" type="text" placeholder="Ex: Goblin" /></div>
      <div class="fGrp" style="max-width: 110px">
        <label>Init</label>
        <div style="display: flex; gap: 0.25rem">
          <input v-model="cInit" type="number" placeholder="12" />
          <button class="btn btnOut sm" style="padding: 0.24rem 0.4rem" title="Rolar d20 + bônus" @click="rollAddInit">🎲</button>
        </div>
      </div>
      <div class="fGrp" style="max-width: 75px"><label>HP Máx</label><input v-model="cHpMax" type="number" placeholder="30" /></div>
      <div class="fGrp" style="max-width: 68px"><label>AC</label><input v-model="cAc" type="number" placeholder="14" /></div>
      <div class="fGrp" style="max-width: 60px"><label>Qtd</label><input v-model="cQty" type="number" min="1" placeholder="1" /></div>
      <div class="fGrp" style="justify-content: flex-end; max-width: 105px">
        <button class="btn btnRed" @click="addCreature">+ Adicionar</button>
      </div>
    </div>
    <div v-if="initBonusHint" style="font-family: var(--fN); font-size: 0.75rem; color: var(--gold); margin-top: 0.3rem">
      {{ initBonusHint }}
    </div>
  </div>
</template>
