<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { Ficha, StatEntry, EncounterSlot, EncounterTemplate } from '../../types'
import { templateSummary } from '../../utils/encounters'
import { searchMonsters, type MonsterCandidate } from '../../utils/open5e'
import { toEntries, hasEntries } from '../../utils/statblock'
import BaseModal from '../ui/BaseModal.vue'
import StatEntryEditor from '../ui/StatEntryEditor.vue'
import StatblockModal from '../ui/StatblockModal.vue'
import ImageField from '../ui/ImageField.vue'
import { appAlert, appConfirm } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

function hasStatblock(f: Ficha) {
  return !!(f.str || f.dex || f.con || f.int || f.wis || f.cha || f.cr || f.speed) || hasEntries(f.actions) || hasEntries(f.traits)
}
function cleanEntries(list: StatEntry[]): StatEntry[] | null {
  const cleaned = list.map((e) => ({ name: e.name.trim(), desc: e.desc.trim() })).filter((e) => e.name || e.desc)
  return cleaned.length ? cleaned : null
}

// Formulário
const form = reactive({
  name: '',
  hpMax: '',
  ac: '',
  initBonus: '',
  type: '',
  size: '',
  alignment: '',
  cr: '',
  speed: '',
  str: '',
  dex: '',
  con: '',
  int: '',
  wis: '',
  cha: ''
})
const formTraits = reactive<StatEntry[]>([])
const formActions = reactive<StatEntry[]>([])
const showAdvanced = ref(false)
const showForm = ref(false)
const formImg = ref<string | null>(null)

// Import SRD
const importName = ref('')
const importing = ref(false)
const importMsg = ref('')

// Filtros
const search = ref('')
const typeFilter = ref('')

const types = computed(() =>
  Array.from(new Set(camp.value.fichas.map((f) => f.type).filter(Boolean))).sort() as string[]
)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  let list = camp.value.fichas.slice()
  if (term) list = list.filter((f) => f.name.toLowerCase().includes(term) || (f.type || '').toLowerCase().includes(term))
  if (typeFilter.value) list = list.filter((f) => f.type === typeFilter.value)
  return list
})

const countText = computed(() =>
  filtered.value.length < camp.value.fichas.length ? filtered.value.length + '/' + camp.value.fichas.length + ' fichas' : ''
)

function num(v: string): number | null {
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

function resetForm() {
  Object.keys(form).forEach((k) => ((form as Record<string, string>)[k] = ''))
  formTraits.splice(0)
  formActions.splice(0)
  formImg.value = null
}

function showAddForm() {
  showForm.value = true
}

function hideAddForm() {
  showForm.value = false
  showAdvanced.value = false
  importMsg.value = ''
  importName.value = ''
  resetForm()
}

async function addFicha() {
  const name = form.name.trim()
  if (!name) {
    await appAlert('Digite o nome!')
    return
  }
  const initBonus = parseInt(form.initBonus)
  const img = formImg.value
  camp.value.fichas.push({
    id: Date.now(),
    name,
    hpMax: num(form.hpMax),
    ac: num(form.ac),
    initBonus: isNaN(initBonus) ? null : initBonus,
    type: form.type.trim() || null,
    img,
    size: form.size.trim() || null,
    alignment: form.alignment.trim() || null,
    cr: form.cr.trim() || null,
    speed: form.speed.trim() || null,
    str: num(form.str),
    dex: num(form.dex),
    con: num(form.con),
    int: num(form.int),
    wis: num(form.wis),
    cha: num(form.cha),
    traits: cleanEntries(formTraits),
    actions: cleanEntries(formActions)
  })
  hideAddForm()
}

const chooser = reactive({ open: false, query: '', candidates: [] as MonsterCandidate[] })

async function importFromSRD() {
  const n = importName.value.trim()
  if (!n) return
  importing.value = true
  importMsg.value = ''
  try {
    const candidates = await searchMonsters(n)
    if (!candidates.length) {
      importMsg.value = 'Nenhum monstro encontrado para "' + n + '".'
      return
    }
    if (candidates.length === 1) {
      importCandidate(candidates[0])
      return
    }
    // Mais de um resultado: deixa o mestre escolher.
    chooser.query = n
    chooser.candidates = candidates
    chooser.open = true
  } catch (e) {
    importMsg.value = e instanceof Error ? e.message : 'Erro ao importar.'
  } finally {
    importing.value = false
  }
}

function importCandidate(c: MonsterCandidate) {
  camp.value.fichas.push({ id: Date.now(), img: null, ...c.ficha })
  importMsg.value = '✔ "' + c.name + '"' + (c.edition ? ' (' + c.edition + ')' : '') + ' importado!'
  importName.value = ''
  chooser.open = false
}

async function removeFicha(id: number) {
  if (!(await appConfirm('Remover esta ficha?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  const c = camp.value
  c.fichas = c.fichas.filter((f) => f.id !== id)
  c.creatures.forEach((cr) => {
    if (String(cr.fichaId) === String(id)) cr.fichaId = ''
  })
}

function metaText(f: Ficha) {
  return [
    f.hpMax ? 'HP:' + f.hpMax : '',
    f.ac ? 'AC:' + f.ac : '',
    f.initBonus != null ? 'Init:' + (f.initBonus >= 0 ? '+' : '') + f.initBonus : '',
    f.cr ? 'CR ' + f.cr : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

// Editar ficha
const edit = reactive({
  open: false,
  id: 0,
  name: '',
  hpMax: '',
  ac: '',
  initBonus: '',
  type: '',
  size: '',
  alignment: '',
  cr: '',
  speed: '',
  str: '',
  dex: '',
  con: '',
  int: '',
  wis: '',
  cha: '',
  traits: [] as StatEntry[],
  actions: [] as StatEntry[],
  img: null as string | null
})
function s(v: number | null | undefined) {
  return v != null ? String(v) : ''
}
function openEdit(f: Ficha) {
  edit.id = f.id
  edit.name = f.name
  edit.hpMax = s(f.hpMax)
  edit.ac = s(f.ac)
  edit.initBonus = s(f.initBonus)
  edit.type = f.type || ''
  edit.size = f.size || ''
  edit.alignment = f.alignment || ''
  edit.cr = f.cr || ''
  edit.speed = f.speed || ''
  edit.str = s(f.str)
  edit.dex = s(f.dex)
  edit.con = s(f.con)
  edit.int = s(f.int)
  edit.wis = s(f.wis)
  edit.cha = s(f.cha)
  edit.traits = toEntries(f.traits)
  edit.actions = toEntries(f.actions)
  edit.img = f.img
  edit.open = true
}
async function saveEdit() {
  const f = camp.value.fichas.find((x) => x.id === edit.id)
  if (!f) return
  f.name = edit.name.trim() || f.name
  f.hpMax = num(edit.hpMax)
  f.ac = num(edit.ac)
  const ib = parseInt(edit.initBonus)
  f.initBonus = isNaN(ib) ? null : ib
  f.type = edit.type.trim() || null
  f.size = edit.size.trim() || null
  f.alignment = edit.alignment.trim() || null
  f.cr = edit.cr.trim() || null
  f.speed = edit.speed.trim() || null
  f.str = num(edit.str)
  f.dex = num(edit.dex)
  f.con = num(edit.con)
  f.int = num(edit.int)
  f.wis = num(edit.wis)
  f.cha = num(edit.cha)
  f.traits = cleanEntries(edit.traits)
  f.actions = cleanEntries(edit.actions)
  f.img = edit.img
  edit.open = false
}

// Statblock detail
const detail = reactive({ open: false, ficha: null as Ficha | null })
function openDetail(f: Ficha) {
  detail.ficha = f
  detail.open = true
}

// Image viewer
const viewer = reactive({ open: false, src: '' })
function openViewer(f: Ficha) {
  if (!f.img) return
  viewer.src = f.img
  viewer.open = true
}

// Drag reorder
let dragSrc: number | null = null
function onDragStart(e: DragEvent, id: number) {
  dragSrc = id
  ;(e.currentTarget as HTMLElement).classList.add('dragging')
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(e: DragEvent) {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).classList.add('drag-over')
}
function onDragLeave(e: DragEvent) {
  ;(e.currentTarget as HTMLElement).classList.remove('drag-over')
}
function onDrop(e: DragEvent, tid: number) {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).classList.remove('drag-over')
  if (dragSrc === tid) return
  const list = camp.value.fichas
  const si = list.findIndex((x) => x.id === dragSrc)
  const ti = list.findIndex((x) => x.id === tid)
  if (si < 0 || ti < 0) return
  const item = list.splice(si, 1)[0]
  list.splice(ti, 0, item)
  document.querySelectorAll('#fichasGrid .fCard').forEach((el) => el.classList.remove('dragging'))
}

// ----- Encontros -----
type EncSlotDraft = {
  fichaId: string
  name: string
  hpMax: string
  ac: string
  initBonus: string
  qty: string
}

const showEncForm = ref(false)
const encEditId = ref(0)
const encForm = reactive({
  name: '',
  notes: '',
  slots: [] as EncSlotDraft[]
})

const encounters = computed(() => camp.value.encounters || [])

function emptyEncSlot(): EncSlotDraft {
  return { fichaId: '', name: '', hpMax: '', ac: '', initBonus: '', qty: '1' }
}

function resetEncForm() {
  encForm.name = ''
  encForm.notes = ''
  encForm.slots = []
  encEditId.value = 0
}

function showEncAddForm() {
  resetEncForm()
  encForm.slots.push(emptyEncSlot())
  showEncForm.value = true
}

function hideEncForm() {
  showEncForm.value = false
  resetEncForm()
}

function addEncSlot() {
  encForm.slots.push(emptyEncSlot())
}

function removeEncSlot(i: number) {
  encForm.slots.splice(i, 1)
}

function onEncSlotFicha(i: number) {
  const sl = encForm.slots[i]
  const f = camp.value.fichas.find((x) => String(x.id) === String(sl.fichaId))
  if (!f) return
  sl.name = f.name
  sl.hpMax = f.hpMax != null ? String(f.hpMax) : ''
  sl.ac = f.ac != null ? String(f.ac) : ''
  sl.initBonus = f.initBonus != null ? String(f.initBonus) : ''
}

function draftToSlot(sl: EncSlotDraft): EncounterSlot | null {
  const name = sl.name.trim()
  if (!name) return null
  const qty = Math.max(1, parseInt(sl.qty) || 1)
  const hpMax = parseInt(sl.hpMax) || 1
  const ac = sl.ac.trim() ? parseInt(sl.ac) : null
  const ib = sl.initBonus.trim() ? parseInt(sl.initBonus) : null
  return {
    name,
    fichaId: sl.fichaId || '',
    hpMax,
    ac: ac != null && !isNaN(ac) ? ac : null,
    qty,
    initBonus: ib != null && !isNaN(ib) ? ib : null
  }
}

async function saveEncounter() {
  const name = encForm.name.trim()
  if (!name) {
    await appAlert('Digite o nome do encontro.')
    return
  }
  const slots = encForm.slots.map(draftToSlot).filter((s): s is EncounterSlot => s != null)
  if (!slots.length) {
    await appAlert('Adicione pelo menos uma criatura ao encontro.')
    return
  }
  if (!camp.value.encounters) camp.value.encounters = []
  if (encEditId.value) {
    const enc = camp.value.encounters.find((e) => e.id === encEditId.value)
    if (enc) {
      enc.name = name
      enc.notes = encForm.notes.trim() || undefined
      enc.slots = slots
    }
  } else {
    camp.value.encounters.push({
      id: Date.now(),
      name,
      notes: encForm.notes.trim() || undefined,
      slots
    })
  }
  hideEncForm()
}

function openEncEdit(enc: EncounterTemplate) {
  encEditId.value = enc.id
  encForm.name = enc.name
  encForm.notes = enc.notes || ''
  encForm.slots = enc.slots.map((s) => ({
    fichaId: s.fichaId != null ? String(s.fichaId) : '',
    name: s.name,
    hpMax: String(s.hpMax),
    ac: s.ac != null ? String(s.ac) : '',
    initBonus: s.initBonus != null ? String(s.initBonus) : '',
    qty: String(s.qty)
  }))
  showEncForm.value = true
}

async function removeEncounter(id: number) {
  if (!(await appConfirm('Remover este encontro?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  camp.value.encounters = (camp.value.encounters || []).filter((e) => e.id !== id)
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Fichas & Status</h2>

    <div v-if="showForm" style="margin-bottom: 1rem">
      <div class="card" style="margin-bottom: 0.75rem">
        <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap">
          <div class="fGrp"><label>Importar do SRD 5e (Open5e)</label><input v-model="importName" type="text" placeholder="Ex: Goblin, Adult Red Dragon..." @keyup.enter="importFromSRD" /></div>
          <button class="btn btnRed" :disabled="importing" @click="importFromSRD">{{ importing ? 'Buscando...' : '⬇ Importar' }}</button>
        </div>
        <div v-if="importMsg" style="font-family: var(--fN); font-size: 0.75rem; color: var(--muted); margin-top: 0.35rem">{{ importMsg }}</div>
      </div>

      <div class="card">
        <div class="fRow">
          <div class="fGrp"><label>Nome</label><input v-model="form.name" type="text" placeholder="Ex: Capitão Blacktide" /></div>
          <div class="fGrp" style="max-width: 85px"><label>HP Máx</label><input v-model="form.hpMax" type="number" /></div>
          <div class="fGrp" style="max-width: 72px"><label>AC</label><input v-model="form.ac" type="number" /></div>
          <div class="fGrp" style="max-width: 90px"><label>Init. Bonus</label><input v-model="form.initBonus" type="number" placeholder="+2" /></div>
          <div class="fGrp"><label>Tipo</label><input v-model="form.type" type="text" placeholder="Ex: Humanoide" /></div>
        </div>

        <button class="btn btnOut sm" style="margin-bottom: 0.5rem" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? '▾' : '▸' }} Statblock (opcional)
        </button>
        <div v-if="showAdvanced">
          <div class="fRow">
            <div class="fGrp"><label>Tamanho</label><input v-model="form.size" type="text" placeholder="Medium" /></div>
            <div class="fGrp"><label>Alinhamento</label><input v-model="form.alignment" type="text" placeholder="Chaotic Evil" /></div>
            <div class="fGrp" style="max-width: 80px"><label>CR</label><input v-model="form.cr" type="text" placeholder="1/4" /></div>
            <div class="fGrp"><label>Deslocamento</label><input v-model="form.speed" type="text" placeholder="30 ft." /></div>
          </div>
          <div class="fRow">
            <div class="fGrp"><label>FOR</label><input v-model="form.str" type="number" /></div>
            <div class="fGrp"><label>DES</label><input v-model="form.dex" type="number" /></div>
            <div class="fGrp"><label>CON</label><input v-model="form.con" type="number" /></div>
            <div class="fGrp"><label>INT</label><input v-model="form.int" type="number" /></div>
            <div class="fGrp"><label>SAB</label><input v-model="form.wis" type="number" /></div>
            <div class="fGrp"><label>CAR</label><input v-model="form.cha" type="number" /></div>
          </div>
          <div class="fGrp" style="margin-bottom: 0.6rem"><label>Traços / Habilidades</label><StatEntryEditor :list="formTraits" add-label="Adicionar traço" /></div>
          <div class="fGrp" style="margin-bottom: 0.6rem"><label>Ações</label><StatEntryEditor :list="formActions" add-label="Adicionar ação" /></div>
        </div>

        <ImageField v-model="formImg" />
        <div style="display: flex; gap: 0.5rem; margin-top: 0.8rem; justify-content: flex-end">
          <button class="btn btnOut" @click="hideAddForm">Cancelar</button>
          <button class="btn btnRed" @click="addFicha">+ Salvar Ficha</button>
        </div>
      </div>
    </div>

    <div v-if="!showForm" data-tour="fichas-add" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showAddForm">+ Adicionar Ficha</button>
    </div>

    <div data-tour="fichas-filter" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap">
      <input v-model="search" type="text" placeholder="⬡ Pesquisar..." style="flex: 1; max-width: 240px" />
      <select v-model="typeFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 160px">
        <option value="">Todos os Tipos</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <span style="font-family: var(--fN); font-size: 0.78rem; color: var(--muted)">{{ countText }}</span>
    </div>
    <p style="font-family: var(--fN); font-size: 0.75rem; color: var(--muted); font-style: italic; margin-bottom: 0.8rem; text-align: center">
      Clique no nome para ver o statblock · na imagem para ampliar · arraste para reordenar
    </p>

    <div id="fichasGrid" class="fGrid">
      <div v-if="!filtered.length" class="empty" style="grid-column: 1 / -1">Nenhuma ficha.</div>
      <div
        v-for="f in filtered"
        :key="f.id"
        class="fCard"
        draggable="true"
        @dragstart="onDragStart($event, f.id)"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, f.id)"
      >
        <div class="fImg" @click="openViewer(f)">
          <img v-if="f.img" :src="f.img" :alt="f.name" />
          <template v-else>⬡</template>
        </div>
        <div class="fName" style="cursor: pointer" @click="openDetail(f)">{{ f.name }}</div>
        <div v-if="f.type" class="tBadge">{{ f.type }}</div>
        <div class="fMeta">{{ metaText(f) }}</div>
        <button v-if="hasStatblock(f)" class="btn btnOut sm" style="width: 100%; margin-top: 0.3rem" @click="openDetail(f)">📖 Statblock</button>
        <button class="btn btnOut sm" style="width: 100%; margin-top: 0.3rem" @click="openEdit(f)">✏ Editar</button>
        <button class="btn btnDng sm" style="width: 100%; margin-top: 0.3rem" @click="removeFicha(f.id)">✕ Remover</button>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid var(--border); margin: 1.5rem 0 1rem" />
    <h3 class="sTitle" data-tour="fichas-enc" style="font-size: 1.1rem; margin-bottom: 0.75rem">⚔ Encontros</h3>

    <div v-if="showEncForm" class="card" style="margin-bottom: 1rem">
      <h4 style="font-family: var(--fH); color: var(--red); margin-bottom: 0.6rem">{{ encEditId ? 'Editar Encontro' : 'Novo Encontro' }}</h4>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="encForm.name" type="text" placeholder="Ex: Emboscada na ponte" /></div>
      </div>
      <div class="fGrp" style="margin-bottom: 0.6rem">
        <label>Notas (opcional)</label>
        <textarea v-model="encForm.notes" style="min-height: 60px" placeholder="Táticas, gatilhos, tesouro..."></textarea>
      </div>
      <div style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); text-transform: uppercase; margin-bottom: 0.35rem">Criaturas</div>
      <div v-for="(sl, i) in encForm.slots" :key="i" class="fRow" style="align-items: flex-end; margin-bottom: 0.35rem">
        <div class="fGrp" style="min-width: 120px">
          <label>Ficha</label>
          <select v-model="sl.fichaId" @change="onEncSlotFicha(i)">
            <option value="">— manual —</option>
            <option v-for="f in camp.fichas" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>
        <div class="fGrp" style="min-width: 100px"><label>Nome</label><input v-model="sl.name" type="text" placeholder="Goblin" /></div>
        <div class="fGrp" style="max-width: 55px"><label>Qtd</label><input v-model="sl.qty" type="number" min="1" /></div>
        <div class="fGrp" style="max-width: 65px"><label>HP</label><input v-model="sl.hpMax" type="number" /></div>
        <div class="fGrp" style="max-width: 55px"><label>AC</label><input v-model="sl.ac" type="number" /></div>
        <div class="fGrp" style="max-width: 65px"><label>Init</label><input v-model="sl.initBonus" type="number" placeholder="+2" /></div>
        <button class="btn btnDng sm" style="margin-bottom: 0.15rem" title="Remover" @click="removeEncSlot(i)">✕</button>
      </div>
      <button class="btn btnOut sm" style="margin-bottom: 0.6rem" @click="addEncSlot">+ Criatura</button>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
        <button class="btn btnOut" @click="hideEncForm">Cancelar</button>
        <button class="btn btnRed" @click="saveEncounter">{{ encEditId ? 'Salvar' : '+ Criar Encontro' }}</button>
      </div>
    </div>

    <div v-if="!showEncForm" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showEncAddForm">+ Criar Encontro</button>
    </div>

    <div v-if="!encounters.length" class="empty" style="margin-bottom: 1rem">Nenhum encontro salvo.</div>
    <div v-for="enc in encounters" :key="enc.id" class="encCard">
      <div style="flex: 1; min-width: 0">
        <div style="font-family: var(--fH); font-weight: 700; color: var(--red)">{{ enc.name }}</div>
        <div style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); margin-top: 0.15rem">{{ templateSummary(enc) }}</div>
        <div v-if="enc.notes" style="font-family: var(--fB); font-size: 0.82rem; color: var(--muted); margin-top: 0.25rem; font-style: italic">{{ enc.notes }}</div>
      </div>
      <div style="display: flex; gap: 0.3rem; flex-shrink: 0">
        <button class="btn btnOut sm" @click="openEncEdit(enc)">✏ Editar</button>
        <button class="btn btnDng sm" @click="removeEncounter(enc.id)">✕</button>
      </div>
    </div>
  </div>

  <!-- Editar ficha -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 520px; width: 90vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Ficha</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="edit.name" type="text" /></div>
        <div class="fGrp" style="max-width: 80px"><label>HP Máx</label><input v-model="edit.hpMax" type="number" /></div>
        <div class="fGrp" style="max-width: 68px"><label>AC</label><input v-model="edit.ac" type="number" /></div>
        <div class="fGrp" style="max-width: 85px"><label>Init. Bonus</label><input v-model="edit.initBonus" type="number" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp"><label>Tipo</label><input v-model="edit.type" type="text" /></div>
        <div class="fGrp"><label>Tamanho</label><input v-model="edit.size" type="text" /></div>
        <div class="fGrp"><label>Alinhamento</label><input v-model="edit.alignment" type="text" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp" style="max-width: 80px"><label>CR</label><input v-model="edit.cr" type="text" /></div>
        <div class="fGrp"><label>Deslocamento</label><input v-model="edit.speed" type="text" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp"><label>FOR</label><input v-model="edit.str" type="number" /></div>
        <div class="fGrp"><label>DES</label><input v-model="edit.dex" type="number" /></div>
        <div class="fGrp"><label>CON</label><input v-model="edit.con" type="number" /></div>
        <div class="fGrp"><label>INT</label><input v-model="edit.int" type="number" /></div>
        <div class="fGrp"><label>SAB</label><input v-model="edit.wis" type="number" /></div>
        <div class="fGrp"><label>CAR</label><input v-model="edit.cha" type="number" /></div>
      </div>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Traços / Habilidades</label><StatEntryEditor :list="edit.traits" add-label="Adicionar traço" /></div>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Ações</label><StatEntryEditor :list="edit.actions" add-label="Adicionar ação" /></div>
      <ImageField v-model="edit.img" />
      <div style="text-align: right; margin-top: 0.9rem"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>

  <!-- Statblock detail -->
  <StatblockModal :open="detail.open" :ficha="detail.ficha" @close="detail.open = false" />

  <!-- Seletor de resultados do SRD -->
  <BaseModal :open="chooser.open" @close="chooser.open = false">
    <div class="modal" style="max-width: 560px; width: 92vw">
      <button class="mClose" @click="chooser.open = false">✕</button>
      <h3>Escolha o monstro</h3>
      <p style="font-family: var(--fB); font-size: 0.9rem; color: var(--muted); margin-bottom: 0.8rem">
        {{ chooser.candidates.length }} resultados para "{{ chooser.query }}". Selecione qual importar:
      </p>
      <div style="max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.45rem">
        <button
          v-for="(c, i) in chooser.candidates"
          :key="c.key + i"
          class="chooseRow"
          @click="importCandidate(c)"
        >
          <div style="flex: 1; min-width: 0">
            <div style="font-family: var(--fH); font-weight: 700; color: var(--red)">{{ c.name }}</div>
            <div style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)">
              {{ c.sourceName }}<span v-if="c.type"> · {{ c.type }}</span><span v-if="c.cr"> · CR {{ c.cr }}</span>
            </div>
          </div>
          <span
            v-if="c.edition"
            class="dtChip"
            :title="c.sourceName"
            :style="
              c.editionKey === '5e-2024'
                ? 'background:#1a6b2a;color:#fff;border-color:#1a6b2a'
                : c.editionKey === '5e-2014'
                  ? 'background:#8b0000;color:#fff;border-color:#8b0000'
                  : 'border-color:var(--border);color:var(--muted)'
            "
            >{{ c.edition }}</span
          >
        </button>
      </div>
    </div>
  </BaseModal>

  <!-- Image viewer -->
  <BaseModal :open="viewer.open" @close="viewer.open = false">
    <div style="display: flex; flex-direction: column; align-items: center" @click="viewer.open = false">
      <img :src="viewer.src" style="max-width: 90vw; max-height: 88vh; object-fit: contain; border-radius: 4px; border: 2px solid var(--border2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5)" />
      <p style="color: #ccc; font-family: var(--fN); font-size: 0.78rem; margin-top: 0.5rem; font-style: italic">Clique para fechar</p>
    </div>
  </BaseModal>
</template>
