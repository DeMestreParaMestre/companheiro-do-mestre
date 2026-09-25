<script setup lang="ts">
import type { Ficha } from '../../types'
import { toEntries, hasEntries } from '../../utils/statblock'
import BaseModal from './BaseModal.vue'

defineProps<{ open: boolean; ficha: Ficha | null }>()
defineEmits<{ close: [] }>()

function abilityMod(score: number | null | undefined) {
  if (score == null) return ''
  const m = Math.floor((score - 10) / 2)
  return (m >= 0 ? '+' : '') + m
}
function hasStatblock(f: Ficha) {
  return !!(f.str || f.dex || f.con || f.int || f.wis || f.cha || f.cr || f.speed) || hasEntries(f.actions) || hasEntries(f.traits)
}
</script>

<template>
  <BaseModal :open="open" @close="$emit('close')">
    <div class="modal" style="max-width: 560px; width: 92vw">
      <button class="mClose" @click="$emit('close')">✕</button>
      <template v-if="ficha">
        <h3>{{ ficha.name }}</h3>
        <p
          v-if="ficha.size || ficha.type || ficha.alignment"
          style="font-family: var(--fB); font-style: italic; color: var(--muted); margin-top: -0.5rem; margin-bottom: 0.6rem"
        >
          {{ [ficha.size, ficha.type, ficha.alignment].filter(Boolean).join(', ') }}
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; font-family: var(--fB); font-size: 0.92rem; margin-bottom: 0.6rem">
          <span v-if="ficha.ac"><strong>AC</strong> {{ ficha.ac }}</span>
          <span v-if="ficha.hpMax"><strong>HP</strong> {{ ficha.hpMax }}</span>
          <span v-if="ficha.speed"><strong>Deslocamento</strong> {{ ficha.speed }}</span>
          <span v-if="ficha.cr"><strong>CR</strong> {{ ficha.cr }}</span>
          <span v-if="ficha.initBonus != null"><strong>Init</strong> {{ ficha.initBonus >= 0 ? '+' : '' }}{{ ficha.initBonus }}</span>
          <span v-if="ficha.isLegendary"
            ><strong>Lendário</strong> {{ ficha.legActionsMax || 3 }} ações · {{ ficha.legResistMax || 3 }} resist.</span
          >
        </div>
        <div
          v-if="ficha.str || ficha.dex || ficha.con || ficha.int || ficha.wis || ficha.cha"
          style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.35rem; text-align: center; margin-bottom: 0.7rem; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 0.5rem 0"
        >
          <div
            v-for="ab in [['FOR', ficha.str], ['DES', ficha.dex], ['CON', ficha.con], ['INT', ficha.int], ['SAB', ficha.wis], ['CAR', ficha.cha]]"
            :key="ab[0] as string"
          >
            <div style="font-family: var(--fN); font-size: 0.65rem; font-weight: 700; color: var(--red)">{{ ab[0] }}</div>
            <div style="font-family: var(--fB); font-size: 0.9rem">
              {{ ab[1] ?? '—' }} <span v-if="ab[1] != null" style="color: var(--muted)">({{ abilityMod(ab[1] as number) }})</span>
            </div>
          </div>
        </div>
        <div v-if="hasEntries(ficha.traits)" style="margin-bottom: 0.6rem">
          <div style="font-family: var(--fH); font-weight: 700; color: var(--red); margin-bottom: 0.3rem; border-bottom: 1px solid var(--border)">Traços</div>
          <p
            v-for="(e, i) in toEntries(ficha.traits)"
            :key="'t' + i"
            style="font-family: var(--fB); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.4rem"
          >
            <strong v-if="e.name">{{ e.name }}.</strong> {{ e.desc }}
          </p>
        </div>
        <div v-if="hasEntries(ficha.actions)">
          <div style="font-family: var(--fH); font-weight: 700; color: var(--red); margin-bottom: 0.3rem; border-bottom: 1px solid var(--border)">Ações</div>
          <p
            v-for="(e, i) in toEntries(ficha.actions)"
            :key="'a' + i"
            style="font-family: var(--fB); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.4rem"
          >
            <strong v-if="e.name">{{ e.name }}.</strong> {{ e.desc }}
          </p>
        </div>
        <p v-if="!hasStatblock(ficha)" class="empty">Sem statblock. Edite a ficha para adicionar atributos e ações.</p>
      </template>
    </div>
  </BaseModal>
</template>
