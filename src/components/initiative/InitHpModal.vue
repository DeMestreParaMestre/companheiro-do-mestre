<script setup lang="ts">
import { reactive, computed } from 'vue'
import { DAMAGE_TYPES } from '../../constants'
import type { Creature } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { effectiveDamage } from '../../utils/combat'
import { appendCombatLog } from '../../utils/combatLog'
import { isPartyName, syncPersonagemFromCreature } from '../../utils/partyLink'
import {
  onPartyDropToZero,
  onCreatureDropToZero,
  onPartyHealed,
  addDeathSaveFailure
} from '../../utils/deathSaves'
import BaseModal from '../ui/BaseModal.vue'

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const hpModal = reactive({ open: false, id: 0, name: '', amount: '', dmgType: '', lastType: 'dmg' })
const concentration = reactive({ open: false, name: '', cd: 0 })

function open(c: Creature) {
  hpModal.id = c.id
  hpModal.name = c.name
  hpModal.amount = ''
  hpModal.dmgType = ''
  hpModal.open = true
}

function applyHp(type: string) {
  hpModal.lastType = type
  const amt = parseInt(hpModal.amount) || 0
  if (amt <= 0) return
  const c = camp.value.creatures.find((x) => x.id === hpModal.id)
  if (!c) return
  if (type === 'temp') {
    c.tempHp = Math.max(c.tempHp || 0, amt)
    appendCombatLog(camp.value, `${c.name} ganhou ${amt} HP temporário`)
    hpModal.open = false
    return
  }
  if (type === 'dmg') {
    const dmg = effectiveDamage(c, amt, hpModal.dmgType)
    const typeLabel = hpModal.dmgType ? ' de ' + hpModal.dmgType : ''
    let remaining = dmg
    if (c.tempHp && c.tempHp > 0) {
      const absorbed = Math.min(c.tempHp, remaining)
      c.tempHp -= absorbed
      remaining -= absorbed
    }
    const wasAboveZero = c.hp > 0
    const party = isPartyName(camp.value, c.name)
    c.hp = Math.max(0, c.hp - remaining)
    if (party) {
      if (c.hp === 0 && wasAboveZero) {
        onPartyDropToZero(c)
        appendCombatLog(camp.value, `${c.name} sofreu ${dmg}${typeLabel} de dano e caiu inconsciente`)
      } else if (c.hp === 0 && !wasAboveZero) {
        delete c.stable
        const died = addDeathSaveFailure(c, 1)
        appendCombatLog(camp.value, `${c.name} sofreu dano a 0 HP — +1 falha nos salvamentos`)
        if (died) appendCombatLog(camp.value, `${c.name} morreu`)
      } else {
        appendCombatLog(camp.value, `${c.name} sofreu ${dmg}${typeLabel} de dano`)
      }
    } else {
      if (c.hp === 0) onCreatureDropToZero(c)
      appendCombatLog(camp.value, `${c.name} sofreu ${dmg}${typeLabel} de dano${c.dead ? ' e morreu' : ''}`)
    }
    if ((c.conditions || []).includes('Concentrating') && dmg > 0) {
      const cd = Math.max(10, Math.floor(dmg / 2))
      appendCombatLog(camp.value, `${c.name}: teste de Concentração CD ${cd}`)
      concentration.name = c.name
      concentration.cd = cd
      concentration.open = true
    }
  } else {
    c.hp += amt
    if (isPartyName(camp.value, c.name) && c.hp > 0) onPartyHealed(c)
    else if (c.hp > 0) c.dead = false
    appendCombatLog(camp.value, `${c.name} curou ${amt}`)
  }
  syncPersonagemFromCreature(camp.value, c)
  hpModal.open = false
}

defineExpose({ open })
</script>

<template>
  <BaseModal :open="hpModal.open" @close="hpModal.open = false">
    <div class="modal" style="text-align: center; min-width: 260px">
      <button class="mClose" @click="hpModal.open = false">✕</button>
      <h3>Alterar HP — {{ hpModal.name }}</h3>
      <input
        v-model="hpModal.amount"
        type="number"
        min="1"
        placeholder="0"
        style="text-align: center; font-size: 1.4rem; width: 100px; margin: 0.4rem auto; display: block"
        @keyup.enter="applyHp(hpModal.lastType || 'dmg')"
      />
      <div class="fGrp" style="max-width: 220px; margin: 0 auto 0.4rem">
        <label>Tipo de dano (opcional)</label>
        <select v-model="hpModal.dmgType">
          <option value="">— nenhum —</option>
          <option v-for="t in DAMAGE_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.7rem">
        <button class="btn btnDng" @click="applyHp('dmg')">Dano</button>
        <button class="btn btnRed" @click="applyHp('heal')">Cura</button>
        <button class="btn btnOut" @click="applyHp('temp')">HP Temp</button>
      </div>
    </div>
  </BaseModal>

  <BaseModal :open="concentration.open" @close="concentration.open = false">
    <div class="modal" style="text-align: center; max-width: 340px; width: 90vw">
      <button class="mClose" @click="concentration.open = false">✕</button>
      <h3>Teste de Concentração</h3>
      <p style="font-family: var(--fB); font-size: 1rem; line-height: 1.6">
        <strong>{{ concentration.name }}</strong> precisa passar em um teste de Constituição para manter a concentração.
      </p>
      <p style="font-family: var(--fH); font-size: 1.6rem; font-weight: 700; color: var(--red); margin: 0.5rem 0">CD {{ concentration.cd }}</p>
      <button class="btn btnRed" @click="concentration.open = false">Entendi</button>
    </div>
  </BaseModal>
</template>
