<script setup lang="ts">
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

function pillLabel(k: string) {
  let base = condLabel(props.creature, k)
  const dur = props.creature.conditionDurations && props.creature.conditionDurations[k]
  if (dur && dur > 0) base += ' (' + dur + 'rd)'
  return base
}
</script>

<template>
  <div class="cRow" :class="{ aTurn: index === currentTurn, dead: creature.dead, unconscious: isUnconscious }">
    <div
      class="iBadge"
      :class="{ iBadgeActing: index === currentTurn }"
      :style="{
        background: isParty ? '#2d6e2d' : '#8b0000',
        borderColor: isParty ? '#1a4d1a' : '#5c0000',
        color: isParty ? '#e8f5e8' : '#fff0f0'
      }"
    >
      {{ creature.init }}
    </div>
    <div style="flex: 1; min-width: 70px">
      <div class="cName" title="Ver imagem" @click="$emit('image')">
        {{ creature.name }}
        <template v-if="fichaName"
          ><br /><span style="font-size: 0.65rem; color: var(--muted); font-style: italic">{{ fichaName }}</span></template
        >
      </div>
      <div v-if="(creature.conditions || []).length" class="sPills">
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
        style="margin-top: 0.35rem"
        @success="$emit('deathSuccess')"
        @failure="$emit('deathFailure')"
      />
    </div>
    <div v-if="creature.isLegendary && creature.legActionsMax" class="legBox" title="Ações lendárias (clique para gastar)">
      ⚡
      <span
        v-for="i in creature.legActionsMax"
        :key="i"
        class="legDot"
        :class="i <= (creature.legActions || 0) ? 'avail' : 'spent'"
        @click="$emit('spendLeg')"
      ></span>
      <button class="btn btnOut sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem" @click="$emit('resetLeg')">↺</button>
    </div>
    <div class="tIndSlot" :class="{ active: index === currentTurn }" :aria-hidden="index !== currentTurn">
      <span class="tIndLabel">⬡ Agindo</span>
    </div>
    <div class="hpArea">
      <button
        class="btn sm"
        style="min-width: 28px; background: #5b2d8e; border-color: #3d1a6e; color: #e8d4ff; font-size: 1rem; padding: 0.26rem 0.48rem"
        @click="$emit('openHp')"
      >
        ✚
      </button>
      <div>
        <div class="hpVal">
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
            <div class="sdOpt sdAddCustom" @click="$emit('customStatus')">＋ {{ cd.l }}…</div>
          </template>
          <label v-else class="sdOpt">
            <input
              type="checkbox"
              :checked="(creature.conditions || []).includes(cd.k)"
              @change="$emit('condChange', cd.k, $event)"
            />
            <span>{{ cd.l }}</span>
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
    <button class="btn sm btnOut" title="Ver statblock" @click="$emit('statblock')">📋</button>
    <button class="btn sm btnOut" title="Editar" @click="$emit('edit')">✏</button>
    <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="$emit('move', -1)">↑</button>
    <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="$emit('move', 1)">↓</button>
    <button class="btn sm btnDng" @click="$emit('remove')">✕</button>
  </div>
</template>
