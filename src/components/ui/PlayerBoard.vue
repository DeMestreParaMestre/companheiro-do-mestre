<script setup lang="ts">
import { condLabel } from '../../utils/conditions'
import { hpPercent, hpStatus, hpBarColor } from '../../utils/combat'
import { tracksDeathSaves } from '../../utils/deathSaves'
import type { Creature } from '../../types'

const props = defineProps<{
  campaignName: string
  round: number
  currentTurn: number
  creatures: Creature[]
  partyNames: string[]
}>()

function isParty(name: string) {
  return props.partyNames.includes(name)
}
function partyStatus(c: Creature) {
  if (c.dead) return 'Morto'
  if (tracksDeathSaves(c, true)) {
    const s = c.deathSaveSuccesses ?? 0
    const f = c.deathSaveFailures ?? 0
    if (c.stable) return `Estável · 0 / ${c.hpMax} HP (${s}✓ ${f}✕)`
    return `Inconsciente · 0 / ${c.hpMax} HP (${s}✓ ${f}✕)`
  }
  return `${c.hp} / ${c.hpMax} HP`
}
</script>

<template>
  <div class="pvPage">
    <div class="pvHeader">
      <span class="pvTitle">{{ campaignName }}</span>
      <span v-if="round > 0" class="pvRound">Rodada {{ round }}</span>
    </div>
    <div v-if="!creatures.length" class="pvEmpty">Nenhum combate em andamento.</div>
    <div class="pvList">
      <div v-for="(c, i) in creatures" :key="c.id" class="pvRow" :class="{ pvActive: i === currentTurn, pvDead: c.dead }">
        <div class="pvInit" :style="{ background: isParty(c.name) ? '#2d6e2d' : '#8b0000' }">{{ c.init }}</div>
        <div class="pvMain">
          <div class="pvName">
            {{ c.name }}
            <span v-if="i === currentTurn" class="pvTurnTag">◄ agindo</span>
          </div>
          <div class="pvBarWrap">
            <div class="pvBar" :style="{ width: hpPercent(c.hp, c.hpMax) + '%', background: hpBarColor(c.hp, c.hpMax) }"></div>
          </div>
          <div class="pvStatus">
            <span v-if="isParty(c.name)">{{ partyStatus(c) }}<span v-if="c.tempHp"> (+{{ c.tempHp }})</span></span>
            <span v-else>{{ hpStatus(c.hp, c.hpMax, c.dead) }}</span>
            <span v-for="k in c.conditions || []" :key="k" class="pvCond">{{ condLabel(c, k) }}</span>
          </div>
        </div>
        <div v-if="c.ac && isParty(c.name)" class="pvAc">AC {{ c.ac }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pvPage {
  min-height: 100vh;
  background: var(--bg);
  overflow-y: auto;
  padding: 3vh 3vw;
}
.pvHeader {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.pvTitle {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  font-size: clamp(1.6rem, 4vw, 3rem);
  letter-spacing: 1px;
}
.pvRound {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--gold);
  font-size: clamp(1rem, 2.5vw, 1.8rem);
}
.pvEmpty {
  text-align: center;
  color: var(--muted);
  font-family: var(--fB);
  font-size: 1.4rem;
  margin-top: 3rem;
}
.pvList {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.pvRow {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--light);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.8rem 1rem;
}
.pvActive {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px var(--gold);
  background: var(--bg2);
}
.pvDead {
  opacity: 0.5;
  filter: grayscale(1);
}
.pvInit {
  min-width: clamp(48px, 6vw, 72px);
  height: clamp(48px, 6vw, 72px);
  border-radius: 8px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fN);
  font-weight: 700;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
}
.pvMain {
  flex: 1;
  min-width: 0;
}
.pvName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--ink);
  font-size: clamp(1.1rem, 2.5vw, 1.8rem);
  margin-bottom: 0.4rem;
}
.pvTurnTag {
  color: var(--gold);
  font-size: 0.7em;
  margin-left: 0.5rem;
}
.pvBarWrap {
  height: clamp(14px, 2vw, 22px);
  background: var(--bg3);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.pvBar {
  height: 100%;
  transition: width 0.3s;
}
.pvStatus {
  margin-top: 0.35rem;
  font-family: var(--fB);
  font-size: clamp(0.9rem, 1.8vw, 1.2rem);
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.pvCond {
  font-family: var(--fN);
  font-size: 0.72em;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  color: var(--ink);
}
.pvAc {
  font-family: var(--fN);
  font-weight: 700;
  color: var(--muted);
  font-size: clamp(1rem, 2vw, 1.4rem);
}
</style>
