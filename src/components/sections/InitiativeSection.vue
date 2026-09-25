<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { Creature, Ficha, Reference, PartyMember } from '../../types'
import { useSettingsStore } from '../../stores/settings'
import { hpBarColor } from '../../utils/combat'
import { adjustTurnAfterRemove } from '../../utils/initiative'
import { placeHoverTip } from '../../utils/hoverTip'
import { isPartyName, syncPersonagemFromCreature } from '../../utils/partyLink'
import { applyLongRestToParty } from '../../utils/longRest'
import { appendCombatLog } from '../../utils/combatLog'
import { PLAYER_CHANNEL, type PlayerMessage } from '../../utils/playerChannel'
import { isCustomCond, condLabel } from '../../utils/conditions'
import ImagePopup from '../ui/ImagePopup.vue'
import StatblockModal from '../ui/StatblockModal.vue'
import MusicMiniBar from '../ui/MusicMiniBar.vue'
import MusicPickerModal from '../ui/MusicPickerModal.vue'
import InitAddForm from '../initiative/InitAddForm.vue'
import InitToolbar from '../initiative/InitToolbar.vue'
import InitCombatLog from '../initiative/InitCombatLog.vue'
import InitCreatureRow from '../initiative/InitCreatureRow.vue'
import InitHpModal from '../initiative/InitHpModal.vue'
import InitCustomStatusModal from '../initiative/InitCustomStatusModal.vue'
import InitEditCreatureModal from '../initiative/InitEditCreatureModal.vue'
import InitPartyModal from '../initiative/InitPartyModal.vue'
import InitNewCombatModal from '../initiative/InitNewCombatModal.vue'
import InitReaddModal from '../initiative/InitReaddModal.vue'
import InitRefsModal from '../initiative/InitRefsModal.vue'
import InitEncountersModal from '../initiative/InitEncountersModal.vue'
import {
  tracksDeathSaves,
  addDeathSaveSuccess,
  addDeathSaveFailure,
  DEATH_SAVE_MAX
} from '../../utils/deathSaves'
import { appAlert, appConfirm } from '../../composables/useAppDialog'
import { useReactionTracker } from '../../composables/useReactionTracker'

const props = defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const reaction = useReactionTracker()

function log(text: string) {
  appendCombatLog(camp.value, text)
}

type Row = { div: string } | { c: Creature; i: number }

const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let d20 = false
  let d10 = false
  camp.value.creatures.forEach((c, i) => {
    if (!d20 && c.init < 20) {
      result.push({ div: '20' })
      d20 = true
    }
    if (!d10 && c.init < 10) {
      result.push({ div: '10' })
      d10 = true
    }
    result.push({ c, i })
  })
  return result
})

function isParty(name: string) {
  return isPartyName(camp.value, name)
}
function isUnconscious(c: Creature) {
  return tracksDeathSaves(c, isParty(c.name))
}
function hpDisplay(c: Creature) {
  if (c.dead) return 'Morto'
  if (isUnconscious(c)) return c.stable ? `Estável 0/${c.hpMax}` : `0/${c.hpMax}`
  return `${c.hp}/${c.hpMax}`
}
function markDeathSaveSuccess(c: Creature) {
  const r = addDeathSaveSuccess(c)
  log(`${c.name}: +1 sucesso nos salvamentos (${c.deathSaveSuccesses}/${DEATH_SAVE_MAX})`)
  if (r === 'stable') log(`${c.name} está estável a 0 HP`)
}
function markDeathSaveFailure(c: Creature) {
  const r = addDeathSaveFailure(c, 1)
  log(`${c.name}: +1 falha nos salvamentos (${c.deathSaveFailures}/${DEATH_SAVE_MAX})`)
  if (r === 'dead') {
    log(`${c.name} morreu`)
    syncPersonagemFromCreature(camp.value, c)
  }
}
function hpPct(c: Creature) {
  return c.hp > c.hpMax ? 100 : Math.max(0, Math.round((c.hp / c.hpMax) * 100))
}
function hpColor(c: Creature) {
  return hpBarColor(c.hp, c.hpMax)
}
function fichaName(c: Creature) {
  if (!c.fichaId) return ''
  const f = camp.value.fichas.find((f) => String(f.id) === String(c.fichaId))
  return f ? f.name : ''
}

function onTurnStart(c: Creature) {
  if (c.isLegendary && c.legActionsMax) c.legActions = c.legActionsMax
  reaction.onTurnStart(c.id)
  if (isUnconscious(c) && !c.stable) log(`${c.name}: salvamento contra morte`)
}
function tickDurations() {
  camp.value.creatures.forEach((c) => {
    if (!c.conditionDurations) return
    Object.keys(c.conditionDurations).forEach((k) => {
      const v = c.conditionDurations![k] - 1
      if (v <= 0) {
        c.conditions = (c.conditions || []).filter((x) => x !== k)
        delete c.conditionDurations![k]
        log(`${c.name}: condição "${condLabel(c, k)}" expirou`)
      } else {
        c.conditionDurations![k] = v
      }
    })
  })
}
function nextTurn() {
  const c = camp.value
  if (!c.creatures.length) return
  const alive = c.creatures.filter((x) => !x.dead)
  if (!alive.length) return
  addForm.value?.collapse()
  const prev = c.currentTurn
  if (prev === -1) {
    let n = 0
    while (n < c.creatures.length && c.creatures[n].dead) n++
    c.currentTurn = n
    c.round = 1
    log(`— Rodada 1 —`)
  } else {
    let n = prev + 1
    while (n < c.creatures.length && c.creatures[n].dead) n++
    if (n >= c.creatures.length) {
      n = 0
      while (n < c.creatures.length && c.creatures[n].dead) n++
    }
    if (n <= prev) {
      c.round = (c.round || 1) + 1
      tickDurations()
      log(`— Rodada ${c.round} —`)
    }
    c.currentTurn = n
  }
  onTurnStart(c.creatures[c.currentTurn])
}
function resetTurns() {
  camp.value.currentTurn = -1
  camp.value.round = 0
  reaction.clear()
}
function moveCreature(id: number, dir: number) {
  const list = camp.value.creatures
  const idx = list.findIndex((c) => c.id === id)
  const ni = idx + dir
  if (ni < 0 || ni >= list.length) return
  const tmp = list[idx]
  list[idx] = list[ni]
  list[ni] = tmp
}
function removeCreature(id: number) {
  const c = camp.value
  const idx = c.creatures.findIndex((x) => x.id === id)
  if (idx < 0) return
  c.creatures = c.creatures.filter((x) => x.id !== id)
  c.currentTurn = adjustTurnAfterRemove(c.currentTurn, idx, c.creatures.length)
}

function spendLeg(c: Creature) {
  if (!c.legActions) return
  c.legActions--
}
function resetLeg(c: Creature) {
  c.legActions = c.legActionsMax || 0
}
function spendLegResist(c: Creature) {
  if (!c.legResist) return
  c.legResist--
}
function resetLegResist(c: Creature) {
  c.legResist = c.legResistMax || 0
}

const openStatusId = ref<number | null>(null)
function toggleSD(id: number) {
  openStatusId.value = openStatusId.value === id ? null : id
}
function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.sdWrap')) openStatusId.value = null
}

function onCondChange(c: Creature, k: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!c.conditions) c.conditions = []
  if (checked) {
    if (!c.conditions.includes(k)) c.conditions.push(k)
  } else {
    removeCond(c, k)
  }
}
function removeCond(c: Creature, k: string) {
  c.conditions = (c.conditions || []).filter((x) => x !== k)
  if (c.conditionDurations) delete c.conditionDurations[k]
  if (isCustomCond(k) && c.customConditionLabel) delete c.customConditionLabel[k]
}
function setDuration(c: Creature, k: string, e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value)
  if (!c.conditionDurations) c.conditionDurations = {}
  if (!v || v <= 0) delete c.conditionDurations[k]
  else c.conditionDurations[k] = v
}

function posTip(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const t = el.querySelector('.tip') as HTMLElement | null
  if (!t) return
  t.style.visibility = 'hidden'
  t.style.display = 'block'
  const r = el.getBoundingClientRect()
  const p = placeHoverTip(r, t.getBoundingClientRect(), { w: window.innerWidth, h: window.innerHeight })
  t.style.top = p.top + 'px'
  t.style.left = p.left + 'px'
  t.style.visibility = ''
  t.style.display = ''
}
function hideTip(e: MouseEvent) {
  const t = (e.currentTarget as HTMLElement).querySelector('.tip') as HTMLElement | null
  if (t) {
    t.style.top = ''
    t.style.left = ''
  }
}

function fichaForCreature(c: Creature): Ficha | undefined {
  return c.fichaId ? camp.value.fichas.find((f) => String(f.id) === String(c.fichaId)) : undefined
}

const statblock = reactive({ open: false, ficha: null as Ficha | null })
function openStatblockFromCreature(c: Creature) {
  const f = fichaForCreature(c)
  statblock.ficha =
    f ||
    ({
      id: c.id,
      name: c.name,
      hpMax: c.hpMax,
      ac: c.ac,
      initBonus: c.initBonus ?? null,
      type: null,
      img: null
    } as Ficha)
  statblock.open = true
}

const popup = reactive({ open: false, name: '', img: null as string | null })
function openImageFromCreature(c: Creature) {
  const pj = (camp.value.personagens || []).find((p) => p.name === c.name)
  if (pj) {
    popup.name = pj.name
    popup.img = pj.img || null
    popup.open = true
    return
  }
  const f = fichaForCreature(c)
  popup.name = c.name
  popup.img = f && f.img ? f.img : null
  popup.open = true
}
function openRefImage(r: Reference) {
  popup.name = r.name
  popup.img = r.img || null
  popup.open = true
}

const showLog = ref(false)
const musicPicker = ref(false)

const addForm = ref<{ expand: () => void; collapse: () => void } | null>(null)
const hpModal = ref<{ open: (c: Creature) => void } | null>(null)
const customStatusModal = ref<{ open: (c: Creature) => void } | null>(null)
const editModal = ref<{ open: (c: Creature) => void } | null>(null)
const partyModal = ref<{ open: () => void } | null>(null)
const newCombatModal = ref<{ open: () => void } | null>(null)
const readdModal = ref<{ open: (m: PartyMember) => void } | null>(null)
const refsModal = ref<{ open: () => void } | null>(null)
const encountersModal = ref<{ open: () => void } | null>(null)

async function longRestParty() {
  if (!camp.value.party.length) {
    await appAlert('Configure a party antes do descanso longo.')
    return
  }
  if (
    !(await appConfirm(
      'Descanso longo da party?\nRestaura HP de todos os PJs e limpa salvamentos contra morte / HP temporário.',
      { title: 'Long Rest', confirmLabel: 'Descansar' }
    ))
  ) {
    return
  }
  const { restored } = applyLongRestToParty(camp.value)
  log(`Descanso longo — ${restored.join(', ') || 'ninguém'}`)
}

const settings = useSettingsStore()
let playerChannel: BroadcastChannel | null = null

function playerPayload(): PlayerMessage {
  const c = camp.value
  return {
    type: 'state',
    payload: {
      campaignName: c.name,
      round: c.round || 0,
      currentTurn: c.currentTurn,
      creatures: JSON.parse(JSON.stringify(c.creatures)),
      partyNames: c.party.map((p) => p.name),
      theme: settings.theme
    }
  }
}
function broadcastPlayer() {
  playerChannel?.postMessage(playerPayload())
}

watch(
  () => [camp.value.creatures, camp.value.currentTurn, camp.value.round, camp.value.party, camp.value.name, settings.theme],
  () => broadcastPlayer(),
  { deep: true }
)

function onShortcut(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const anyModal = document.querySelector('.mOv.open')
  if (!props.active || typing || anyModal || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault()
    nextTurn()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onShortcut)
  playerChannel = new BroadcastChannel(PLAYER_CHANNEL)
  playerChannel.onmessage = (e: MessageEvent<PlayerMessage>) => {
    if (e.data?.type === 'ready') broadcastPlayer()
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onShortcut)
  playerChannel?.close()
})
</script>

<template>
  <div class="section initSection" :class="{ active }">
    <InitAddForm ref="addForm" @readd="readdModal?.open($event)" />

    <InitToolbar
      :round="camp.round || 0"
      :log-count="(camp.combatLog || []).length"
      @next="nextTurn"
      @reset="resetTurns"
      @party="partyModal?.open()"
      @new-combat="newCombatModal?.open()"
      @encounters="encountersModal?.open()"
      @long-rest="longRestParty"
      @refs="refsModal?.open()"
      @toggle-log="showLog = !showLog"
    >
      <template #music>
        <MusicMiniBar compact data-tour="init-music" :on-pick="() => (musicPicker = true)" />
      </template>
    </InitToolbar>

    <InitCombatLog v-if="showLog" @close="showLog = false" />

    <div v-if="camp.currentTurn >= 0 && camp.currentTurn < camp.creatures.length" class="tBanner">
      Turno de: {{ camp.creatures[camp.currentTurn].name }} (Init {{ camp.creatures[camp.currentTurn].init }})
    </div>

    <div>
      <div v-if="!camp.creatures.length" class="initEmpty">
        <p>Nenhuma criatura no combate.</p>
        <button class="btn btnDng initEmptyBtn" type="button" @click="newCombatModal?.open()">⬡ Novo Combate</button>
      </div>
      <template v-for="row in rows" :key="'div' in row ? 'div' + row.div : row.c.id">
        <div v-if="'div' in row" class="divLine"><hr /><span>⬡ Init {{ row.div }}</span><hr /></div>
        <InitCreatureRow
          v-else
          :creature="row.c"
          :index="row.i"
          :current-turn="camp.currentTurn"
          :is-party="isParty(row.c.name)"
          :is-unconscious="isUnconscious(row.c)"
          :status-open="openStatusId === row.c.id"
          :hp-display="hpDisplay(row.c)"
          :hp-pct="hpPct(row.c)"
          :hp-color="hpColor(row.c)"
          :ficha-name="fichaName(row.c)"
          :show-reaction="reaction.enabled"
          :reaction-spent="reaction.isSpent(row.c.id)"
          @image="openImageFromCreature(row.c)"
          @toggle-reaction="reaction.toggle(row.c.id)"
          @remove-cond="removeCond(row.c, $event)"
          @pos-tip="posTip"
          @hide-tip="hideTip"
          @death-success="markDeathSaveSuccess(row.c)"
          @death-failure="markDeathSaveFailure(row.c)"
          @spend-leg="spendLeg(row.c)"
          @reset-leg="resetLeg(row.c)"
          @spend-leg-resist="spendLegResist(row.c)"
          @reset-leg-resist="resetLegResist(row.c)"
          @open-hp="hpModal?.open(row.c)"
          @toggle-status="toggleSD(row.c.id)"
          @cond-change="(k, e) => onCondChange(row.c, k, e)"
          @set-duration="(k, e) => setDuration(row.c, k, e)"
          @custom-status="customStatusModal?.open(row.c)"
          @statblock="openStatblockFromCreature(row.c)"
          @edit="editModal?.open(row.c)"
          @move="moveCreature(row.c.id, $event)"
          @remove="removeCreature(row.c.id)"
        />
      </template>
    </div>
  </div>

  <InitHpModal ref="hpModal" />
  <InitCustomStatusModal ref="customStatusModal" />
  <InitEditCreatureModal ref="editModal" />
  <InitPartyModal ref="partyModal" @readd="readdModal?.open($event)" />
  <InitNewCombatModal ref="newCombatModal" @started="addForm?.expand()" />
  <InitReaddModal ref="readdModal" />
  <MusicPickerModal :open="musicPicker" @close="musicPicker = false" />
  <InitRefsModal ref="refsModal" @open-image="openRefImage" />
  <StatblockModal :open="statblock.open" :ficha="statblock.ficha" @close="statblock.open = false" />
  <ImagePopup :open="popup.open" :name="popup.name" :img="popup.img" @close="popup.open = false" />
  <InitEncountersModal ref="encountersModal" />
</template>

<style scoped>
.initEmpty {
  text-align: center;
  padding: 2.6rem 1.2rem 2.2rem;
}
.initEmpty p {
  font-family: var(--fB);
  color: var(--muted);
  font-style: italic;
  margin-bottom: 1.1rem;
}
.initEmptyBtn {
  font-size: 1.2rem;
  padding: 0.85rem 1.8rem;
}
</style>
