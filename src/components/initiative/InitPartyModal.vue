<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { PartyMember } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { isInInitiative as creatureInInitiative } from '../../utils/initiative'
import { partyMemberHpLabel, resolvePersonagemForPartyMember, syncPersonagemFromPartyMember } from '../../utils/partyLink'
import { appAlert } from '../../composables/useAppDialog'
import BaseModal from '../ui/BaseModal.vue'

const emit = defineEmits<{
  readd: [member: PartyMember]
}>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const partyModal = ref(false)
const pmPJLink = ref('')
const pmNome = ref('')
const pmHp = ref('')
const pmAc = ref('')
const pmEditIdx = ref(-1)
const pmEdit = reactive({ name: '', hp: '', ac: '' })

function open() {
  pmEditIdx.value = -1
  partyModal.value = true
}

function isInInitiative(name: string) {
  return creatureInInitiative(name, camp.value.creatures)
}

function autofillPartyFromPJ() {
  const id = pmPJLink.value
  if (!id) return
  const p = (camp.value.personagens || []).find((p) => String(p.id) === String(id))
  if (!p) return
  pmNome.value = p.name
  if (p.hpMax) pmHp.value = String(p.hpMax)
  if (p.ac) pmAc.value = String(p.ac)
}

function partyLinkLabel(m: PartyMember) {
  return resolvePersonagemForPartyMember(camp.value, m) ? '🔗' : ''
}

async function addPartyMember() {
  const n = pmNome.value.trim()
  if (!n) {
    await appAlert('Digite o nome!')
    return
  }
  const h = parseInt(pmHp.value) || 1
  const a = parseInt(pmAc.value) || null
  const pjId = pmPJLink.value ? parseInt(pmPJLink.value) : undefined
  let personagemId = pjId && !isNaN(pjId) ? pjId : undefined
  if (!personagemId) {
    const byName = (camp.value.personagens || []).find((p) => p.name === n)
    if (byName) personagemId = byName.id
  }
  const member: PartyMember = { name: n, hpMax: h, ac: a, personagemId }
  camp.value.party.push(member)
  if (personagemId) syncPersonagemFromPartyMember(camp.value, member)
  pmNome.value = ''
  pmHp.value = ''
  pmAc.value = ''
  pmPJLink.value = ''
}

function togglePMEdit(i: number) {
  if (pmEditIdx.value === i) {
    pmEditIdx.value = -1
    return
  }
  const m = camp.value.party[i]
  pmEdit.name = m.name
  pmEdit.hp = String(m.hpMax)
  pmEdit.ac = m.ac != null ? String(m.ac) : ''
  pmEditIdx.value = i
}

function savePMEdit(i: number) {
  const n = pmEdit.name.trim()
  if (!n) return
  const prev = camp.value.party[i]
  const member: PartyMember = {
    name: n,
    hpMax: parseInt(pmEdit.hp) || 1,
    ac: parseInt(pmEdit.ac) || null,
    personagemId: prev.personagemId
  }
  camp.value.party[i] = member
  if (member.personagemId) syncPersonagemFromPartyMember(camp.value, member)
  pmEditIdx.value = -1
}

function removePartyMember(i: number) {
  camp.value.party.splice(i, 1)
  if (pmEditIdx.value === i) pmEditIdx.value = -1
}

function saveParty() {
  store.persist()
  partyModal.value = false
  void appAlert('Party salva!', { title: 'Party' })
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="partyModal" @close="partyModal = false">
    <div class="modal" style="min-width: 300px; max-width: 500px; width: 90vw">
      <button class="mClose" @click="partyModal = false">✕</button>
      <h3>Configurar Party</h3>
      <p style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); margin-bottom: 0.8rem; font-style: italic">
        Vincule a um personagem para sincronizar HP com a iniciativa. Entram automaticamente em Novo Combate.
      </p>
      <div>
        <div v-if="!camp.party.length" class="empty" style="padding: 0.5rem">Nenhum membro.</div>
        <div
          v-for="(m, i) in camp.party"
          :key="i"
          style="background: var(--bg); border: 1px solid var(--border); border-radius: 3px; margin-bottom: 0.4rem; padding: 0.5rem 0.6rem"
        >
          <div style="display: grid; grid-template-columns: 1fr auto auto auto auto auto; gap: 0.35rem; align-items: center">
            <span style="font-family: var(--fH); font-weight: 600; color: var(--red); overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >{{ partyLinkLabel(m) }} {{ m.name }}</span
            >
            <span style="font-family: var(--fN); color: var(--muted); font-size: 0.78rem">HP:{{ partyMemberHpLabel(camp, m) }}</span>
            <span v-if="m.ac" style="font-family: var(--fN); color: var(--muted); font-size: 0.78rem">AC:{{ m.ac }}</span>
            <span v-else></span>
            <button
              v-if="!isInInitiative(m.name)"
              class="btn btnOut sm"
              style="padding: 0.2rem 0.45rem; font-size: 0.68rem"
              title="Readicionar à fila de iniciativa"
              @click="$emit('readd', m)"
            >
              + Init
            </button>
            <span v-else></span>
            <button
              style="font-family: var(--fH); font-weight: 600; font-size: 0.72rem; padding: 0.24rem 0.48rem; border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 3px; cursor: pointer"
              @click="togglePMEdit(i)"
            >
              ✏
            </button>
            <button
              style="font-family: var(--fH); font-weight: 600; font-size: 0.72rem; padding: 0.24rem 0.48rem; border: 1px solid #a00; background: #8b0000; color: #ffc8c8; border-radius: 3px; cursor: pointer"
              @click="removePartyMember(i)"
            >
              ✕
            </button>
          </div>
          <div
            v-if="pmEditIdx === i"
            style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-end; margin-top: 0.5rem; padding: 0.5rem; background: var(--bg2); border-radius: 3px"
          >
            <div style="display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 80px">
              <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); font-weight: 600; text-transform: uppercase">Nome</span>
              <input v-model="pmEdit.name" type="text" style="background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.38rem 0.6rem; border-radius: 3px; font-size: 0.9rem; width: 100%" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 70px">
              <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); font-weight: 600; text-transform: uppercase">HP</span>
              <input v-model="pmEdit.hp" type="number" style="background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.38rem 0.6rem; border-radius: 3px; font-size: 0.9rem; width: 100%" />
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 60px">
              <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); font-weight: 600; text-transform: uppercase">AC</span>
              <input v-model="pmEdit.ac" type="number" style="background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.38rem 0.6rem; border-radius: 3px; font-size: 0.9rem; width: 100%" />
            </div>
            <div style="display: flex; gap: 0.3rem; align-self: flex-end">
              <button style="font-family: var(--fH); font-weight: 600; font-size: 0.72rem; padding: 0.3rem 0.6rem; border: 1px solid var(--border2); background: var(--red); color: #fff; border-radius: 3px; cursor: pointer" @click="savePMEdit(i)">✔</button>
              <button style="font-family: var(--fH); font-weight: 600; font-size: 0.72rem; padding: 0.3rem 0.6rem; border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 3px; cursor: pointer" @click="togglePMEdit(i)">✕</button>
            </div>
          </div>
        </div>
      </div>
      <div style="border-top: 1px solid var(--border); margin-top: 0.8rem; padding-top: 0.8rem">
        <div class="fRow" style="margin-bottom: 0.5rem">
          <div class="fGrp">
            <label>Vincular Personagem</label>
            <select v-model="pmPJLink" @change="autofillPartyFromPJ">
              <option value="">— ou preencha manualmente —</option>
              <option v-for="p in camp.personagens || []" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
        <div class="fRow">
          <div class="fGrp"><label>Nome</label><input v-model="pmNome" type="text" placeholder="Ex: Aldric" /></div>
          <div class="fGrp" style="max-width: 80px"><label>HP Máx</label><input v-model="pmHp" type="number" /></div>
          <div class="fGrp" style="max-width: 68px"><label>AC</label><input v-model="pmAc" type="number" /></div>
          <div class="fGrp" style="max-width: 90px; justify-content: flex-end"><button class="btn btnRed" @click="addPartyMember">+ Add</button></div>
        </div>
      </div>
      <div style="text-align: right; margin-top: 0.5rem"><button class="btn btnRed" @click="saveParty">✔ Salvar Party</button></div>
    </div>
  </BaseModal>
</template>
