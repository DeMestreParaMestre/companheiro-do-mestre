<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { CONDS, DAMAGE_TYPES, REF_TYPES } from '../../constants'
import type { Creature, Ficha, Reference, PartyMember, EncounterTemplate } from '../../types'
import { useSettingsStore } from '../../stores/settings'
import { rollInitiative } from '../../utils/dice'
import { effectiveDamage, hpBarColor } from '../../utils/combat'
import {
  isInInitiative as creatureInInitiative,
  partyMembersNotInInitiative,
  sortCreaturesPreservingTurn,
  adjustTurnAfterRemove
} from '../../utils/initiative'
import {
  combatStatsFromPartyMember,
  syncPersonagemFromCreature,
  syncPersonagemFromPartyMember,
  partyMemberHpLabel,
  resolvePersonagemForPartyMember
} from '../../utils/partyLink'
import { applyLongRestToParty } from '../../utils/longRest'
import { groupReferences } from '../../utils/refGroups'
import { PLAYER_CHANNEL, type PlayerMessage } from '../../utils/playerChannel'
import { spawnFromTemplate, templateSummary } from '../../utils/encounters'
import BaseModal from '../ui/BaseModal.vue'
import ImagePopup from '../ui/ImagePopup.vue'
import StatblockModal from '../ui/StatblockModal.vue'
import ReferenceView from '../ui/ReferenceView.vue'
import MusicMiniBar from '../ui/MusicMiniBar.vue'
import MusicPickerModal from '../ui/MusicPickerModal.vue'
import DeathSavesBar from '../ui/DeathSavesBar.vue'
import {
  tracksDeathSaves,
  onPartyDropToZero,
  onCreatureDropToZero,
  onPartyHealed,
  addDeathSaveSuccess,
  addDeathSaveFailure,
  DEATH_SAVE_MAX
} from '../../utils/deathSaves'
import { appAlert, appConfirm } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

function log(text: string) {
  const c = camp.value
  if (!c.combatLog) c.combatLog = []
  c.combatLog.unshift({ id: Date.now() + Math.random(), round: c.round || 0, text })
  if (c.combatLog.length > 200) c.combatLog.pop()
}

// ----- Formulário de adicionar criatura -----
const cFichaLink = ref('')
const cName = ref('')
const cInit = ref('')
const cHpMax = ref('')
const cAc = ref('')
const cQty = ref('1')
const initBonusHint = ref('')

const PARTY_LINK_PREFIX = 'party:'

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
    if (m && !isInInitiative(m.name)) openReaddInitiative(m)
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
  const f = camp.value.fichas.find((f) => String(f.id) === String(cFichaLink.value) && !String(cFichaLink.value).startsWith(PARTY_LINK_PREFIX))
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
      fichaId: cFichaLink.value,
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

// ----- Lista / dividers -----
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
  return camp.value.party.some((p) => p.name === name)
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
function isInInitiative(name: string) {
  return creatureInInitiative(name, camp.value.creatures)
}
const partyNotInInitiative = computed(() =>
  partyMembersNotInInitiative(camp.value.party, camp.value.creatures)
)
function buildCreatureFromPartyMember(m: PartyMember, init: number, id = Date.now()): Creature {
  const stats = combatStatsFromPartyMember(camp.value, m)
  const ficha = camp.value.fichas.find((f) => f.name === m.name)
  return {
    id,
    name: m.name,
    init,
    initReal: init,
    hp: stats.hp,
    hpMax: stats.hpMax,
    ac: stats.ac,
    fichaId: ficha ? ficha.id : '',
    dead: stats.dead,
    conditions: [],
    initBonus: ficha && ficha.initBonus != null ? ficha.initBonus : null,
    personagemId: stats.personagemId
  }
}
function addPartyMemberToInitiative(m: PartyMember, init: number) {
  if (isInInitiative(m.name)) return
  camp.value.creatures.push(buildCreatureFromPartyMember(m, init))
  camp.value.currentTurn = sortCreaturesPreservingTurn(camp.value.creatures, camp.value.currentTurn)
  log(`${m.name} voltou à iniciativa (Init ${init})`)
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
function condMeta(k: string) {
  return CONDS.find((x) => x.k === k)
}
function pillLabel(c: Creature, k: string) {
  const cd = condMeta(k)
  let base = cd?.custom ? (c.customConditionLabel && c.customConditionLabel[k]) || 'Outros' : cd ? cd.l : k
  const dur = c.conditionDurations && c.conditionDurations[k]
  if (dur && dur > 0) base += ' (' + dur + 'rd)'
  return base
}

// ----- Turnos + rodadas -----
function onTurnStart(c: Creature) {
  if (c.isLegendary && c.legActionsMax) c.legActions = c.legActionsMax
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
        log(`${c.name}: condição "${pillLabelRaw(c, k)}" expirou`)
      } else {
        c.conditionDurations![k] = v
      }
    })
  })
}
function pillLabelRaw(c: Creature, k: string) {
  const cd = condMeta(k)
  return cd?.custom ? (c.customConditionLabel && c.customConditionLabel[k]) || 'Outros' : cd ? cd.l : k
}

function nextTurn() {
  const c = camp.value
  if (!c.creatures.length) return
  const alive = c.creatures.filter((x) => !x.dead)
  if (!alive.length) return
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

// ----- Ações lendárias -----
function spendLeg(c: Creature) {
  if (!c.legActions) return
  c.legActions--
}
function resetLeg(c: Creature) {
  c.legActions = c.legActionsMax || 0
}

// ----- Status dropdown -----
const openStatusId = ref<number | null>(null)
function toggleSD(id: number) {
  openStatusId.value = openStatusId.value === id ? null : id
}
function onDocClick(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.sdWrap')) openStatusId.value = null
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

function onCondChange(c: Creature, k: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (k === 'Outros' && checked) {
    customStatus.cid = c.id
    customStatus.label = ''
    customStatus.open = true
    return
  }
  if (!c.conditions) c.conditions = []
  if (checked) {
    if (!c.conditions.includes(k)) c.conditions.push(k)
  } else {
    c.conditions = c.conditions.filter((x) => x !== k)
    if (c.conditionDurations) delete c.conditionDurations[k]
  }
}
function removeCond(c: Creature, k: string) {
  c.conditions = (c.conditions || []).filter((x) => x !== k)
  if (c.conditionDurations) delete c.conditionDurations[k]
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
  const r = el.getBoundingClientRect()
  t.style.top = r.bottom + 6 + 'px'
  t.style.left = Math.min(r.left, window.innerWidth - 280) + 'px'
}
function hideTip(e: MouseEvent) {
  const t = (e.currentTarget as HTMLElement).querySelector('.tip') as HTMLElement | null
  if (t) {
    t.style.top = ''
    t.style.left = ''
  }
}

// ----- Custom status modal -----
const customStatus = reactive({ open: false, cid: 0, label: '' })
function confirmCustomStatus() {
  const label = customStatus.label.trim()
  if (!label) {
    customStatus.open = false
    return
  }
  const c = camp.value.creatures.find((x) => x.id === customStatus.cid)
  if (c) {
    if (!c.conditions) c.conditions = []
    if (!c.conditions.includes('Outros')) c.conditions.push('Outros')
    if (!c.customConditionLabel) c.customConditionLabel = {}
    c.customConditionLabel['Outros'] = label
  }
  customStatus.open = false
}

// ----- HP modal -----
const hpModal = reactive({ open: false, id: 0, name: '', amount: '', dmgType: '', lastType: 'dmg' })
function openHpM(c: Creature) {
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
    log(`${c.name} ganhou ${amt} HP temporário`)
    hpModal.open = false
    return
  }
  if (type === 'dmg') {
    let dmg = effectiveDamage(c, amt, hpModal.dmgType)
    const typeLabel = hpModal.dmgType ? ' de ' + hpModal.dmgType : ''
    let remaining = dmg
    if (c.tempHp && c.tempHp > 0) {
      const absorbed = Math.min(c.tempHp, remaining)
      c.tempHp -= absorbed
      remaining -= absorbed
    }
    const wasAboveZero = c.hp > 0
    const party = isParty(c.name)
    c.hp = Math.max(0, c.hp - remaining)
    if (party) {
      if (c.hp === 0 && wasAboveZero) {
        onPartyDropToZero(c)
        log(`${c.name} sofreu ${dmg}${typeLabel} de dano e caiu inconsciente`)
      } else if (c.hp === 0 && !wasAboveZero) {
        delete c.stable
        const died = addDeathSaveFailure(c, 1)
        log(`${c.name} sofreu dano a 0 HP — +1 falha nos salvamentos`)
        if (died) log(`${c.name} morreu`)
      } else {
        log(`${c.name} sofreu ${dmg}${typeLabel} de dano`)
      }
    } else {
      if (c.hp === 0) onCreatureDropToZero(c)
      log(`${c.name} sofreu ${dmg}${typeLabel} de dano${c.dead ? ' e morreu' : ''}`)
    }
    if ((c.conditions || []).includes('Concentrating') && dmg > 0) {
      const cd = Math.max(10, Math.floor(dmg / 2))
      log(`${c.name}: teste de Concentração CD ${cd}`)
      concentration.name = c.name
      concentration.cd = cd
      concentration.open = true
    }
  } else {
    c.hp += amt
    if (isParty(c.name) && c.hp > 0) onPartyHealed(c)
    else if (c.hp > 0) c.dead = false
    log(`${c.name} curou ${amt}`)
  }
  syncPersonagemFromCreature(camp.value, c)
  hpModal.open = false
}

// ----- Concentração -----
const concentration = reactive({ open: false, name: '', cd: 0 })

function fichaForCreature(c: Creature): Ficha | undefined {
  return c.fichaId ? camp.value.fichas.find((f) => String(f.id) === String(c.fichaId)) : undefined
}

// ----- Statblock ao clicar no nome -----
const statblock = reactive({ open: false, ficha: null as Ficha | null })
function openStatblockFromCreature(c: Creature) {
  const f = fichaForCreature(c)
  // Sem ficha vinculada: monta um statblock mínimo com os dados da própria criatura.
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

// ----- Popup de imagem -----
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

// ----- Editar criatura -----
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
  resist: [] as string[],
  vuln: [] as string[],
  immune: [] as string[]
})
function openEditCreature(c: Creature) {
  editCr.id = c.id
  editCr.name = c.name
  editCr.init = String(c.init)
  editCr.hp = String(c.hp)
  editCr.hpMax = String(c.hpMax)
  editCr.ac = c.ac != null ? String(c.ac) : ''
  editCr.fichaId = c.fichaId || ''
  editCr.isLegendary = !!c.isLegendary
  editCr.legMax = c.legActionsMax ? String(c.legActionsMax) : ''
  editCr.resist = [...(c.resist || [])]
  editCr.vuln = [...(c.vuln || [])]
  editCr.immune = [...(c.immune || [])]
  editCr.open = true
}
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
  if (isParty(c.name)) {
    if (c.hp > 0) onPartyHealed(c)
    else if (c.hp === 0 && prevHp > 0) onPartyDropToZero(c)
  } else {
    c.dead = c.hp <= 0
  }
  c.isLegendary = editCr.isLegendary
  const legMax = parseInt(editCr.legMax)
  c.legActionsMax = editCr.isLegendary && legMax > 0 ? legMax : undefined
  if (c.legActionsMax && (c.legActions == null || c.legActions > c.legActionsMax)) c.legActions = c.legActionsMax
  c.resist = editCr.resist.length ? [...editCr.resist] : undefined
  c.vuln = editCr.vuln.length ? [...editCr.vuln] : undefined
  c.immune = editCr.immune.length ? [...editCr.immune] : undefined
  camp.value.currentTurn = sortCreaturesPreservingTurn(camp.value.creatures, camp.value.currentTurn)
  syncPersonagemFromCreature(camp.value, c)
  editCr.open = false
}

// ----- Party config -----
const partyModal = ref(false)
const pmPJLink = ref('')
const pmNome = ref('')
const pmHp = ref('')
const pmAc = ref('')
const pmEditIdx = ref(-1)
const pmEdit = reactive({ name: '', hp: '', ac: '' })

function openPartyConfig() {
  pmEditIdx.value = -1
  partyModal.value = true
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

// ----- Novo combate -----
const newCombat = reactive({ open: false, inits: [] as string[] })
async function openNewCombat() {
  const p = camp.value.party
  if (!p.length) {
    if (
      await appConfirm('Limpar criaturas e começar?', {
        title: 'Novo combate',
        confirmLabel: 'Limpar'
      })
    ) {
      camp.value.creatures = []
      camp.value.currentTurn = -1
      camp.value.round = 0
    }
    return
  }
  newCombat.inits = p.map(() => '')
  newCombat.open = true
}
function rollAllNewCombat() {
  newCombat.inits = camp.value.party.map(() => String(rollInitiative(0)))
}
function startNewCombat() {
  const c = camp.value
  c.creatures = []
  c.currentTurn = -1
  c.round = 0
  c.party.forEach((m, i) => {
    const init = parseInt(newCombat.inits[i]) || 0
    c.creatures.push(buildCreatureFromPartyMember(m, init, Date.now() + i))
  })
  sortCreaturesPreservingTurn(c.creatures, -1)
  newCombat.open = false
}

// ----- Readicionar party à iniciativa (sem reiniciar o combate) -----
const readdInit = reactive({ open: false, member: null as PartyMember | null, init: '' })
function openReaddInitiative(m: PartyMember) {
  readdInit.member = m
  readdInit.init = ''
  readdInit.open = true
}
function rollReaddInit() {
  readdInit.init = String(rollInitiative(0))
}
function confirmReaddInitiative() {
  const m = readdInit.member
  if (!m || isInInitiative(m.name)) {
    readdInit.open = false
    return
  }
  addPartyMemberToInitiative(m, parseInt(readdInit.init) || 0)
  readdInit.open = false
}

// ----- Log de combate -----
const showLog = ref(false)
function clearLog() {
  camp.value.combatLog = []
}
async function sendLogToDiary() {
  const entries = (camp.value.combatLog || []).slice().reverse()
  if (!entries.length) {
    await appAlert('O log está vazio.')
    return
  }
  const body = entries.map((e) => (e.round ? `R${e.round}: ` : '') + e.text).join('\n')
  camp.value.diary.unshift({
    id: Date.now(),
    day: 'Combate',
    title: 'Resumo de combate',
    body,
    date: new Date().toLocaleDateString('pt-BR')
  })
  await appAlert('Resumo enviado ao Diário!', { title: 'Diário' })
}

// ----- Encontros (carregar) -----
const encModal = ref(false)

const encounters = computed(() => camp.value.encounters || [])

function openEncounters() {
  encModal.value = true
}

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

// Insere as criaturas já prontas (com iniciativa definida) na fila de combate.
function applyEncounterCreatures(enc: EncounterTemplate, spawned: Creature[], mode: 'add' | 'replace') {
  if (!spawned.length) return
  const c = camp.value
  const prevTurn = mode === 'replace' ? -1 : c.currentTurn
  if (mode === 'replace') {
    const partyCreatures = c.creatures.filter((cr) => isParty(cr.name))
    c.creatures = [...partyCreatures, ...spawned]
  } else {
    c.creatures.push(...spawned)
  }
  c.currentTurn = sortCreaturesPreservingTurn(c.creatures, prevTurn)
  log(`Encontro "${enc.name}" carregado (${templateSummary(enc)})`)
}

function loadEncounter(enc: EncounterTemplate, mode: 'add' | 'replace', rollInit: boolean) {
  const spawned = spawnFromTemplate(enc, { rollInit })
  if (!spawned.length) return
  applyEncounterCreatures(enc, spawned, mode)
  encModal.value = false
}

// ----- Iniciativa manual das criaturas do encontro -----
const encInit = reactive({
  open: false,
  enc: null as EncounterTemplate | null,
  mode: 'add' as 'add' | 'replace',
  creatures: [] as Creature[],
  inits: [] as string[]
})

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

// ----- Painel de referências rápidas -----
const refPanel = ref(false)
const musicPicker = ref(false)
const refSearch = ref('')
const refTypeFilter = ref('')
const refTypeLabel = (k: string) => REF_TYPES.find((t) => t.k === k)?.l || k
const filteredRefs = computed(() => {
  const term = refSearch.value.trim().toLowerCase()
  let list = (camp.value.references || []).slice()
  if (term) list = list.filter((r) => r.name.toLowerCase().includes(term) || refTypeLabel(r.type).toLowerCase().includes(term))
  if (refTypeFilter.value) list = list.filter((r) => r.type === refTypeFilter.value)
  return list
})
const openRefIds = reactive(new Set<number>())
function toggleRef(id: number) {
  if (openRefIds.has(id)) openRefIds.delete(id)
  else openRefIds.add(id)
}

// Usa o mesmo agrupamento/ordenação da ferramenta de Referências, para que a
// ordem manual das referências, pastas e subcategorias valha aqui também.
const groupedRefs = computed(() => groupReferences(filteredRefs.value, camp.value.refCatOrder || [], camp.value.refSubOrder || {}))
const refCollapsed = reactive(new Set<string>())
function toggleRefFolder(key: string) {
  if (refCollapsed.has(key)) refCollapsed.delete(key)
  else refCollapsed.add(key)
}
function openRefImage(r: Reference) {
  popup.name = r.name
  popup.img = r.img || null
  popup.open = true
}

// ----- Tela de jogador (janela pop-up + BroadcastChannel) -----
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

// Espelha em tempo real qualquer mudança relevante do combate.
watch(
  () => [camp.value.creatures, camp.value.currentTurn, camp.value.round, camp.value.party, camp.value.name, settings.theme],
  () => broadcastPlayer(),
  { deep: true }
)

// ----- Atalhos de teclado -----
function onShortcut(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const anyModal = document.querySelector('.mOv.open')
  if (typing || anyModal) return
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault()
    nextTurn()
  }
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Controlador de Iniciativa</h2>
    <div class="card">
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
              <option v-for="f in camp.fichas" :key="f.id" :value="f.id">{{ f.name }}</option>
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

    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; align-items: center">
      <button class="btn btnOut sm" @click="nextTurn">▶ Próximo Turno</button>
      <button class="btn btnOut sm" @click="resetTurns">↺ Reiniciar</button>
      <button class="btn btnOut sm" @click="openPartyConfig">⬡ Configurar Party</button>
      <button class="btn btnDng sm" @click="openNewCombat">⬡ Novo Combate</button>
      <button class="btn btnOut sm" @click="openEncounters">⚔ Encontros</button>
      <button class="btn btnOut sm" title="Restaura HP da party e limpa salvamentos" @click="longRestParty">☽ Long Rest</button>
      <button class="btn btnOut sm" @click="refPanel = true">📌 Referências</button>
      <span v-if="(camp.round || 0) > 0" class="roundBadge">⏱ Rodada {{ camp.round }}</span>
      <button class="btn btnOut sm" style="margin-left: auto" @click="showLog = !showLog">
        📜 Log{{ (camp.combatLog || []).length ? ' (' + (camp.combatLog || []).length + ')' : '' }}
      </button>
    </div>

    <MusicMiniBar style="margin-bottom: 0.75rem" :on-pick="() => (musicPicker = true)" />

    <div v-if="showLog" class="card" style="max-height: 240px; overflow-y: auto">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
        <span style="font-family: var(--fH); font-weight: 700; color: var(--red)">Log de Combate</span>
        <span style="display: flex; gap: 0.4rem">
          <button class="btn btnRed sm" @click="sendLogToDiary">Enviar ao Diário</button>
          <button class="btn btnOut sm" @click="clearLog">Limpar</button>
        </span>
      </div>
      <div v-if="!(camp.combatLog || []).length" class="empty" style="padding: 0.8rem">Sem registros ainda.</div>
      <div
        v-for="l in camp.combatLog"
        :key="l.id"
        style="font-family: var(--fB); font-size: 0.9rem; padding: 0.15rem 0; border-bottom: 1px dashed var(--bg3)"
      >
        <span v-if="l.round" style="color: var(--muted); font-family: var(--fN); font-size: 0.72rem">R{{ l.round }} · </span>{{ l.text }}
      </div>
    </div>

    <div v-if="camp.currentTurn >= 0 && camp.currentTurn < camp.creatures.length" class="tBanner">
      Turno de: {{ camp.creatures[camp.currentTurn].name }} (Init {{ camp.creatures[camp.currentTurn].init }})
    </div>

    <div>
      <div v-if="!camp.creatures.length" class="empty">Nenhuma criatura.</div>
      <template v-for="(row, ri) in rows" :key="ri">
        <div v-if="'div' in row" class="divLine"><hr /><span>⬡ Init {{ row.div }}</span><hr /></div>
        <div v-else class="cRow" :class="{ aTurn: row.i === camp.currentTurn, dead: row.c.dead, unconscious: isUnconscious(row.c) }">
          <div
            class="iBadge"
            :class="{ iBadgeActing: row.i === camp.currentTurn }"
            :style="{
              background: isParty(row.c.name) ? '#2d6e2d' : '#8b0000',
              borderColor: isParty(row.c.name) ? '#1a4d1a' : '#5c0000',
              color: isParty(row.c.name) ? '#e8f5e8' : '#fff0f0'
            }"
          >
            {{ row.c.init }}
          </div>
          <div style="flex: 1; min-width: 70px">
            <div class="cName" title="Ver imagem" @click="openImageFromCreature(row.c)">
              {{ row.c.name }}
              <template v-if="fichaName(row.c)"
                ><br /><span style="font-size: 0.65rem; color: var(--muted); font-style: italic">{{ fichaName(row.c) }}</span></template
              >
            </div>
            <div v-if="(row.c.conditions || []).length" class="sPills">
              <span
                v-for="k in row.c.conditions"
                :key="k"
                class="sPill"
                :class="condMeta(k)?.custom ? 'other' : condMeta(k)?.c ? 'conc' : 'other'"
                @click="removeCond(row.c, k)"
                @mouseenter="posTip"
                @mouseleave="hideTip"
              >
                {{ pillLabel(row.c, k) }}
                <span v-if="!condMeta(k)?.custom && condMeta(k)" class="tip">{{ condMeta(k)?.d }}</span>
              </span>
            </div>
            <DeathSavesBar
              v-if="isUnconscious(row.c)"
              :successes="row.c.deathSaveSuccesses ?? 0"
              :failures="row.c.deathSaveFailures ?? 0"
              :stable="row.c.stable"
              style="margin-top: 0.35rem"
              @success="markDeathSaveSuccess(row.c)"
              @failure="markDeathSaveFailure(row.c)"
            />
          </div>
          <div v-if="row.c.isLegendary && row.c.legActionsMax" class="legBox" title="Ações lendárias (clique para gastar)">
            ⚡
            <span
              v-for="i in row.c.legActionsMax"
              :key="i"
              class="legDot"
              :class="i <= (row.c.legActions || 0) ? 'avail' : 'spent'"
              @click="spendLeg(row.c)"
            ></span>
            <button class="btn btnOut sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem" @click="resetLeg(row.c)">↺</button>
          </div>
          <div class="tIndSlot" :class="{ active: row.i === camp.currentTurn }" :aria-hidden="row.i !== camp.currentTurn">
            <span class="tIndLabel">⬡ Agindo</span>
          </div>
          <div class="hpArea">
            <button
              class="btn sm"
              style="min-width: 28px; background: #5b2d8e; border-color: #3d1a6e; color: #e8d4ff; font-size: 1rem; padding: 0.26rem 0.48rem"
              @click="openHpM(row.c)"
            >
              ✚
            </button>
            <div>
              <div class="hpVal">
                {{ hpDisplay(row.c) }}{{ row.c.hp > row.c.hpMax ? ' ✨' : '' }}
                <span v-if="row.c.tempHp" class="tempHpVal">+{{ row.c.tempHp }}</span>
              </div>
              <div class="hpWrap"><div class="hpBar" :style="{ width: hpPct(row.c) + '%', background: hpColor(row.c) }"></div></div>
            </div>
          </div>
          <div v-if="row.c.ac" class="acVal">AC {{ row.c.ac }}</div>
          <div class="sdWrap">
            <button class="sdBtn" @click="toggleSD(row.c.id)">Status ▾</button>
            <div class="sdMenu" :class="{ open: openStatusId === row.c.id }">
              <div v-for="cd in CONDS" :key="cd.k">
                <label class="sdOpt">
                  <input
                    type="checkbox"
                    :checked="(row.c.conditions || []).includes(cd.k)"
                    @change="onCondChange(row.c, cd.k, $event)"
                  />
                  <span>{{ cd.l }}</span>
                  <input
                    v-if="(row.c.conditions || []).includes(cd.k) && !cd.custom"
                    type="number"
                    min="1"
                    placeholder="rd"
                    :value="row.c.conditionDurations && row.c.conditionDurations[cd.k] ? row.c.conditionDurations[cd.k] : ''"
                    style="width: 42px; margin-left: auto; padding: 0.1rem 0.3rem; font-size: 0.75rem"
                    title="Duração em rodadas"
                    @click.stop
                    @change="setDuration(row.c, cd.k, $event)"
                  />
                </label>
              </div>
            </div>
          </div>
          <button class="btn sm btnOut" title="Ver statblock" @click="openStatblockFromCreature(row.c)">📋</button>
          <button class="btn sm btnOut" title="Editar" @click="openEditCreature(row.c)">✏</button>
          <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="moveCreature(row.c.id, -1)">↑</button>
          <button class="btn sm btnOut" style="padding: 0.24rem 0.4rem" @click="moveCreature(row.c.id, 1)">↓</button>
          <button class="btn sm btnDng" @click="removeCreature(row.c.id)">✕</button>
        </div>
      </template>
    </div>
  </div>

  <!-- HP modal -->
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

  <!-- Concentração -->
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

  <!-- Custom status modal -->
  <BaseModal :open="customStatus.open" @close="customStatus.open = false">
    <div class="modal" style="max-width: 380px; width: 90vw">
      <button class="mClose" @click="customStatus.open = false">✕</button>
      <h3>Nome do Status</h3>
      <div class="fGrp" style="margin-bottom: 0.8rem">
        <label>Digite o nome</label>
        <input v-model="customStatus.label" type="text" placeholder="Ex: Marcado, Amaldiçoado..." @keyup.enter="confirmCustomStatus" />
      </div>
      <button class="btn btnRed" @click="confirmCustomStatus">✔ Confirmar</button>
    </div>
  </BaseModal>

  <!-- Editar criatura -->
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

  <!-- Party config -->
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
              @click="openReaddInitiative(m)"
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

  <!-- Novo combate -->
  <BaseModal :open="newCombat.open" @close="newCombat.open = false">
    <div class="modal" style="min-width: 300px; max-width: 460px; width: 90vw">
      <button class="mClose" @click="newCombat.open = false">✕</button>
      <h3>Novo Combate</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem">
        <p style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); font-style: italic">Iniciativas da party:</p>
        <button class="btn btnOut sm" @click="rollAllNewCombat">🎲 Rolar todas</button>
      </div>
      <div>
        <div
          v-for="(m, i) in camp.party"
          :key="i"
          style="display: flex; align-items: center; gap: 0.65rem; padding: 0.48rem 0.7rem; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; margin-bottom: 0.4rem"
        >
          <div style="flex: 1; font-family: var(--fH); font-weight: 600; color: var(--red)">
            {{ m.name }}<br /><span style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)">HP:{{ m.hpMax }}{{ m.ac ? ' · AC:' + m.ac : '' }}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.2rem">
            <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); text-transform: uppercase; font-weight: 600">Iniciativa</span>
            <input v-model="newCombat.inits[i]" type="number" placeholder="0" style="width: 70px; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.32rem 0.48rem; border-radius: 3px; font-size: 0.9rem" />
          </div>
        </div>
      </div>
      <div style="text-align: right; margin-top: 0.8rem"><button class="btn btnRed" @click="startNewCombat">▶ Iniciar</button></div>
    </div>
  </BaseModal>

  <!-- Readicionar party à iniciativa -->
  <BaseModal :open="readdInit.open" @close="readdInit.open = false">
    <div class="modal" style="min-width: 280px; max-width: 400px; width: 90vw">
      <button class="mClose" @click="readdInit.open = false">✕</button>
      <h3>Readicionar à Iniciativa</h3>
      <p v-if="readdInit.member" style="font-family: var(--fB); font-size: 0.88rem; color: var(--muted); margin-bottom: 0.8rem">
        {{ readdInit.member.name }} · HP:{{ readdInit.member.hpMax }}{{ readdInit.member.ac ? ' · AC:' + readdInit.member.ac : '' }}
      </p>
      <div style="display: flex; align-items: flex-end; gap: 0.5rem; margin-bottom: 0.8rem">
        <div class="fGrp" style="max-width: 120px">
          <label>Iniciativa</label>
          <input v-model="readdInit.init" type="number" placeholder="0" @keyup.enter="confirmReaddInitiative" />
        </div>
        <button class="btn btnOut sm" @click="rollReaddInit">🎲 Rolar</button>
      </div>
      <div style="text-align: right">
        <button class="btn btnRed" @click="confirmReaddInitiative">✔ Readicionar</button>
      </div>
    </div>
  </BaseModal>

  <!-- Escolher música -->
  <MusicPickerModal :open="musicPicker" @close="musicPicker = false" />

  <!-- Painel de referências rápidas -->
  <BaseModal :open="refPanel" @close="refPanel = false">
    <div class="modal" style="max-width: 560px; width: 92vw">
      <button class="mClose" @click="refPanel = false">✕</button>
      <h3>📌 Referências Rápidas</h3>
      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.7rem; flex-wrap: wrap">
        <input v-model="refSearch" type="text" placeholder="⬡ Buscar por nome ou tipo..." style="flex: 1; min-width: 140px" />
        <select v-model="refTypeFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px">
          <option value="">Todos</option>
          <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
        </select>
      </div>
      <div style="max-height: 60vh; overflow-y: auto">
        <div v-if="!(camp.references || []).length" class="empty" style="padding: 0.8rem">
          Nenhuma referência cadastrada. Adicione na aba "Referências".
        </div>
        <div v-else-if="!filteredRefs.length" class="empty" style="padding: 0.8rem">Nada encontrado.</div>
        <div v-for="grp in groupedRefs" :key="grp.parent" class="refFolder">
          <div class="refFolderHead" @click="toggleRefFolder(grp.parent)">
            <span class="refFolderCaret">{{ refCollapsed.has(grp.parent) ? '▸' : '▾' }}</span>
            <span class="refFolderName">📁 {{ grp.parent }}</span>
            <span class="refCount">{{ grp.children.reduce((n, s) => n + s.items.length, 0) }}</span>
          </div>
          <div v-show="!refCollapsed.has(grp.parent)" class="refFolderBody">
            <template v-for="sub in grp.children" :key="grp.parent + '/' + sub.child">
              <div v-if="sub.child" class="refSubHead" @click="toggleRefFolder(grp.parent + '/' + sub.child)">
                <span class="refFolderCaret">{{ refCollapsed.has(grp.parent + '/' + sub.child) ? '▸' : '▾' }}</span>
                <span>📂 {{ sub.child }}</span>
                <span class="refCount">{{ sub.items.length }}</span>
              </div>
              <div v-show="!sub.child || !refCollapsed.has(grp.parent + '/' + sub.child)" :class="{ refSubBody: sub.child }">
                <div v-for="r in sub.items" :key="r.id" class="dEntry" style="cursor: default">
                  <div class="dHead" style="cursor: pointer" @click="toggleRef(r.id)">
                    <div style="flex: 1">
                      <div class="dTitleT">{{ r.name }}</div>
                      <div class="dDate">{{ refTypeLabel(r.type) }}</div>
                    </div>
                    <span style="color: var(--border); font-size: 0.9rem">▾</span>
                  </div>
                  <div class="dBody" :class="{ open: openRefIds.has(r.id) }">
                    <hr style="border: none; border-top: 1px solid var(--border); margin: 0.55rem 0" />
                    <ReferenceView :reference="r" @open-image="openRefImage" />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>

  <StatblockModal :open="statblock.open" :ficha="statblock.ficha" @close="statblock.open = false" />
  <ImagePopup :open="popup.open" :name="popup.name" :img="popup.img" @close="popup.open = false" />

  <!-- Encontros (carregar) -->
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

  <!-- Iniciativa das criaturas do encontro -->
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
