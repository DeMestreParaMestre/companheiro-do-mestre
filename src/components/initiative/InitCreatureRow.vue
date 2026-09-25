<script setup lang="ts">
import { computed } from 'vue'
import { CONDS } from '../../constants'
import type { Creature } from '../../types'
import { condMeta, condLabel, customCondKeys } from '../../utils/conditions'
import DeathSavesBar from '../ui/DeathSavesBar.vue'

const props = defineProps<{
  creature: Creature
  index: number
  currentTurn: number
  isParty: boolean
  isUnconscious: boolean
  statusOpen: boolean
  hpDisplay: string
  hpPct: number
  hpColor: string
  fichaName: string
  showReaction?: boolean
  reactionSpent?: boolean
}>()

defineEmits<{
  image: []
  removeCond: [k: string]
  posTip: [e: MouseEvent]
  hideTip: [e: MouseEvent]
  deathSuccess: []
  deathFailure: []
  spendLeg: []
  resetLeg: []
  spendLegResist: []
  resetLegResist: []
  toggleReaction: []
  openHp: []
  toggleStatus: []
  condChange: [k: string, e: Event]
  setDuration: [k: string, e: Event]
  customStatus: []
  statblock: []
  edit: []
  move: [dir: number]
  remove: []
}>()

const acting = computed(() => props.index === props.currentTurn)
const condCount = computed(() => (props.creature.conditions || []).length)
const showFicha = computed(() => {
  const f = props.fichaName.trim()
  return !!f && f.toLowerCase() !== props.creature.name.trim().toLowerCase()
})
const hpLow = computed(() => props.hpPct <= 25 && !props.creature.dead)

function pillLabel(k: string) {
  let base = condLabel(props.creature, k)
  const dur = props.creature.conditionDurations && props.creature.conditionDurations[k]
  if (dur && dur > 0) base += ' (' + dur + 'rd)'
  return base
}
</script>

<template>
  <div class="cRow" :class="{ aTurn: acting, dead: creature.dead, unconscious: isUnconscious }">
    <div
      class="iBadge"
      :class="{ iBadgeActing: acting }"
      :style="{
        background: isParty ? '#2d6e2d' : '#8b0000',
        borderColor: isParty ? '#1a4d1a' : '#5c0000',
        color: isParty ? '#e8f5e8' : '#fff0f0'
      }"
    >
      {{ creature.init }}
    </div>
    <div class="cIdent">
      <div class="cName" :title="creature.name" @click="$emit('image')">{{ creature.name }}</div>
      <div v-if="showFicha" class="cFicha">{{ fichaName }}</div>
      <div v-if="condCount" class="sPills">
        <span
          v-for="k in creature.conditions"
          :key="k"
          class="sPill"
          :class="condMeta(k)?.custom ? 'other' : condMeta(k)?.c ? 'conc' : 'other'"
          @click="$emit('removeCond', k)"
          @mouseenter="$emit('posTip', $event)"
          @mouseleave="$emit('hideTip', $event)"
        >
          {{ pillLabel(k) }}
          <span v-if="!condMeta(k)?.custom && condMeta(k)" class="tip">{{ condMeta(k)?.d }}</span>
        </span>
      </div>
      <DeathSavesBar
        v-if="isUnconscious"
        :successes="creature.deathSaveSuccesses ?? 0"
        :failures="creature.deathSaveFailures ?? 0"
        :stable="creature.stable"
        style="flex-basis: 100%"
        @success="$emit('deathSuccess')"
        @failure="$emit('deathFailure')"
      />
    </div>
    <div class="cRes">
      <span class="tIndSlot" :class="{ active: acting }">
        <span v-if="acting" class="tIndLabel">⬡ Agindo</span>
      </span>
      <button
        v-if="showReaction"
        type="button"
        class="reactBox"
        :class="{ spent: reactionSpent }"
        :title="
          reactionSpent
            ? 'Reação usada. Volta no início do turno desta criatura. Clique para desmarcar.'
            : 'Reação disponível. Clique para marcar como usada neste turno.'
        "
        @click="$emit('toggleReaction')"
      >
        Reação
      </button>
      <div v-if="creature.isLegendary" class="legBox" title="Ações lendárias (clique para gastar)">
        <button
          type="button"
          class="legChip"
          :class="{ empty: !(creature.legActions || 0) }"
          :aria-label="'Gastar ação lendária (' + (creature.legActions || 0) + ' de ' + creature.legActionsMax + ')'"
          @click="$emit('spendLeg')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M9.2 1 3.5 9.2h3.2L6 15l6.2-9.1H8.8L9.2 1z" />
          </svg>
          {{ creature.legActions || 0 }}/{{ creature.legActionsMax }}
        </button>
        <button class="btn btnOut sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem" title="Recuperar ações lendárias" @click="$emit('resetLeg')">↺</button>
      </div>
      <div
        v-if="creature.isLegendary"
        class="legBox"
        title="Resistência lendária (clique para gastar um uso)"
      >
        <button
          type="button"
          class="legChip resist"
          :class="{ empty: !(creature.legResist || 0) }"
          :aria-label="'Gastar resistência lendária (' + (creature.legResist || 0) + ' de ' + creature.legResistMax + ')'"
          @click="$emit('spendLegResist')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.4 13.2 3.6v4.3c0 3.2-2.1 5.4-5.2 6.7C4.9 13.3 2.8 11.1 2.8 7.9V3.6L8 1.4z" />
          </svg>
          {{ creature.legResist || 0 }}/{{ creature.legResistMax }}
        </button>
        <button class="btn btnOut sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem" title="Recuperar resistências lendárias" @click="$emit('resetLegResist')">↺</button>
      </div>
    </div>
    <div class="cMeta">
      <div class="hpArea">
        <button
          class="btn sm"
          style="min-width: 28px; background: #5b2d8e; border-color: #3d1a6e; color: #e8d4ff; font-size: 1rem; padding: 0.26rem 0.48rem"
          @click="$emit('openHp')"
        >
          ✚
        </button>
        <div>
          <div class="hpVal" :class="{ low: hpLow }">
            {{ hpDisplay }}{{ creature.hp > creature.hpMax ? ' ✨' : '' }}
            <span v-if="creature.tempHp" class="tempHpVal">+{{ creature.tempHp }}</span>
          </div>
          <div class="hpWrap"><div class="hpBar" :style="{ width: hpPct + '%', background: hpColor }"></div></div>
        </div>
      </div>
      <div v-if="creature.ac" class="acVal">AC {{ creature.ac }}</div>
      <div class="sdWrap">
        <button class="sdBtn" @click="$emit('toggleStatus')">Status ▾</button>
        <div class="sdMenu" :class="{ open: statusOpen }">
          <div v-for="cd in CONDS" :key="cd.k">
            <template v-if="cd.custom">
              <label v-for="ck in customCondKeys(creature)" :key="ck" class="sdOpt">
                <input type="checkbox" checked title="Remover" @change="$emit('removeCond', ck)" />
                <span>{{ condLabel(creature, ck) }}</span>
              </label>
              <div
                class="sdOpt sdAddCustom"
                title="Efeito livre, com o nome que você escolher."
                @click="$emit('customStatus')"
              >
                ＋ {{ cd.l }}…
              </div>
            </template>
            <label
              v-else
              class="sdOpt"
              @mouseenter="$emit('posTip', $event)"
              @mouseleave="$emit('hideTip', $event)"
            >
              <input
                type="checkbox"
                :checked="(creature.conditions || []).includes(cd.k)"
                @change="$emit('condChange', cd.k, $event)"
              />
              <span>{{ cd.l }}</span>
              <span v-if="cd.d" class="tip">{{ cd.d }}</span>
              <span
                v-if="!cd.untimed && (creature.conditions || []).includes(cd.k)"
                class="sdDur"
                title="Duração em rodadas. Vazio = até remover manualmente."
                @click.stop.prevent
              >
                ⏱
                <input
                  type="number"
                  min="1"
                  placeholder="—"
                  :value="creature.conditionDurations?.[cd.k] || ''"
                  @change="$emit('setDuration', cd.k, $event)"
                />
                rd
              </span>
            </label>
          </div>
        </div>
      </div>
      <div class="cActs">
        <button class="btn sm btnOut" title="Ver statblock" @click="$emit('statblock')">📋</button>
        <button class="btn sm btnOut" title="Editar" @click="$emit('edit')">✏</button>
        <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="$emit('move', -1)">↑</button>
        <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="$emit('move', 1)">↓</button>
        <button class="btn sm btnDng" @click="$emit('remove')">✕</button>
      </div>
    </div>
  </div>
</template>
