<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { DiaryEntry } from '../../types'
import { hl } from '../../utils/highlight'
import { exportDiaryToWord } from '../../utils/exportWord'
import { parseMentions } from '../../utils/mentions'
import BaseModal from '../ui/BaseModal.vue'
import ImagePopup from '../ui/ImagePopup.vue'
import { appAlert } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const search = ref('')
const tagFilter = ref('')
// Ordenação: 'timeline' (padrão), 'newest', 'oldest'.
const sortMode = ref('timeline')
const timeline = computed(() => sortMode.value === 'timeline')
const showForm = ref(false)
const dDay = ref('')
const dTitle = ref('')
const dBody = ref('')
const dTags = ref('')
const openIds = reactive(new Set<number>())

const term = computed(() => search.value.trim().toLowerCase())

const allTags = computed(() =>
  Array.from(new Set(camp.value.diary.flatMap((e) => e.tags || []))).sort()
)

const mentionNames = computed(() => [
  ...(camp.value.personagens || []).map((p) => p.name),
  ...camp.value.fichas.map((f) => f.name)
])

const entries = computed(() => {
  let list = camp.value.diary.slice()
  if (term.value)
    list = list.filter(
      (e) => e.day.toLowerCase().includes(term.value) || e.title.toLowerCase().includes(term.value) || e.body.toLowerCase().includes(term.value)
    )
  if (tagFilter.value) list = list.filter((e) => (e.tags || []).includes(tagFilter.value))
  if (timeline.value) list = list.slice().sort((a, b) => a.id - b.id)
  return list
})

const searchCount = computed(() => {
  const parts: string[] = []
  if (term.value) parts.push(entries.value.length + ' resultado' + (entries.value.length !== 1 ? 's' : ''))
  else if (tagFilter.value) parts.push(entries.value.length + ' com #' + tagFilter.value)
  return parts.join(' · ')
})

function bodyOpen(e: DiaryEntry) {
  return term.value ? true : openIds.has(e.id)
}
function toggleDiary(id: number) {
  if (openIds.has(id)) openIds.delete(id)
  else openIds.add(id)
}

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
    )
  )
}

function resetForm() {
  dDay.value = ''
  dTitle.value = ''
  dBody.value = ''
  dTags.value = ''
}

function showAddForm() {
  resetForm()
  showForm.value = true
}

function hideAddForm() {
  showForm.value = false
}

async function addDiaryEntry() {
  const body = dBody.value.trim()
  if (!body) {
    await appAlert('Descreva o que aconteceu!')
    return
  }
  camp.value.diary.unshift({
    id: Date.now(),
    day: dDay.value.trim() || 'Dia Desconhecido',
    title: dTitle.value.trim() || 'Entrada sem título',
    body,
    date: new Date().toLocaleDateString('pt-BR'),
    tags: parseTags(dTags.value)
  })
  hideAddForm()
}

function onSortChange() {
  // 'timeline' é uma ordenação de exibição (por id crescente) feita no computed.
  if (sortMode.value === 'newest') camp.value.diary.sort((a, b) => b.id - a.id)
  else if (sortMode.value === 'oldest') camp.value.diary.sort((a, b) => a.id - b.id)
}

function deleteDiary(id: number) {
  camp.value.diary = camp.value.diary.filter((e) => e.id !== id)
}

function preview(e: DiaryEntry) {
  return hl(e.body.substring(0, 90) + (e.body.length > 90 ? '…' : ''), term.value)
}

function tokens(e: DiaryEntry) {
  return parseMentions(e.body, mentionNames.value)
}

function exportWord() {
  exportDiaryToWord(camp.value.diary, camp.value.name)
}

// Menções → popup
const mentionPopup = reactive({ open: false, name: '', img: null as string | null })
function openMention(name: string) {
  const pj = (camp.value.personagens || []).find((p) => p.name === name)
  if (pj) {
    mentionPopup.name = pj.name
    mentionPopup.img = pj.img || null
    mentionPopup.open = true
    return
  }
  const f = camp.value.fichas.find((x) => x.name === name)
  if (f) {
    mentionPopup.name = f.name
    mentionPopup.img = f.img || null
    mentionPopup.open = true
  }
}

// Editar
const edit = reactive({ open: false, id: 0, day: '', title: '', body: '', tags: '' })
function openEdit(e: DiaryEntry) {
  edit.id = e.id
  edit.day = e.day
  edit.title = e.title
  edit.body = e.body
  edit.tags = (e.tags || []).join(', ')
  edit.open = true
}
function saveEdit() {
  const e = camp.value.diary.find((x) => x.id === edit.id)
  if (!e) return
  e.day = edit.day.trim() || e.day
  e.title = edit.title.trim() || e.title
  e.body = edit.body.trim() || e.body
  e.tags = parseTags(edit.tags)
  edit.open = false
}

// Drag reorder (desativado no modo linha do tempo)
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
  const list = camp.value.diary
  const si = list.findIndex((x) => x.id === dragSrc)
  const ti = list.findIndex((x) => x.id === tid)
  if (si < 0 || ti < 0) return
  const item = list.splice(si, 1)[0]
  list.splice(ti, 0, item)
  document.querySelectorAll('.dEntry').forEach((el) => el.classList.remove('dragging'))
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Diário de Campanha</h2>
    <div class="sBars" data-tour="diary-search">
      <input v-model="search" type="text" placeholder="⬡ Pesquisar registros..." />
      <span class="sCount">{{ searchCount }}</span>
      <button class="btn btnOut sm" @click="search = ''">✕</button>
    </div>

    <div v-if="showForm" style="margin-bottom: 1rem">
      <div class="card">
        <div class="fRow">
          <div class="fGrp" style="max-width: 200px"><label>Dia</label><input v-model="dDay" type="text" placeholder="Dia 1" /></div>
          <div class="fGrp"><label>Título</label><input v-model="dTitle" type="text" placeholder="Ex: O Ataque" /></div>
        </div>
        <div class="fGrp" style="margin-bottom: 0.6rem">
          <label>O que aconteceu? <span style="text-transform: none; font-weight: 400">(use @Nome para mencionar personagens/fichas)</span></label>
          <textarea v-model="dBody" placeholder="Descreva os eventos... Ex: @Aldric enfrentou o goblin"></textarea>
        </div>
        <div class="fGrp" style="margin-bottom: 0.8rem"><label>Tags (separadas por vírgula)</label><input v-model="dTags" type="text" placeholder="combate, cidade, missão" /></div>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
          <button class="btn btnOut" @click="hideAddForm">Cancelar</button>
          <button class="btn btnRed" @click="addDiaryEntry">+ Salvar Entrada</button>
        </div>
      </div>
    </div>

    <div v-if="!showForm" data-tour="diary-add" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showAddForm">+ Adicionar Entrada</button>
    </div>

    <div v-if="allTags.length" style="display: flex; gap: 0.35rem; align-items: center; margin-bottom: 0.7rem; flex-wrap: wrap">
      <span style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)">Tags:</span>
      <span
        v-for="t in allTags"
        :key="t"
        class="dtChip"
        :style="tagFilter === t ? 'background:var(--red);color:#fff;border-color:var(--red)' : 'border-color:var(--border);color:var(--muted)'"
        @click="tagFilter = tagFilter === t ? '' : t"
        >#{{ t }}</span
      >
      <button v-if="tagFilter" class="btn btnOut sm" @click="tagFilter = ''">limpar</button>
    </div>

    <div data-tour="diary-tools" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap">
      <span style="font-family: var(--fN); font-size: 0.78rem; color: var(--muted)">Ordenar:</span>
      <select
        v-model="sortMode"
        @change="onSortChange"
        style="width: auto; font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px"
      >
        <option value="timeline">🕑 Linha do Tempo</option>
        <option value="newest">Mais Recente</option>
        <option value="oldest">Mais Antiga</option>
      </select>
      <button class="btn sm btnRed" @click="exportWord">📄 Exportar para Word</button>
    </div>

    <div data-tour="diary-list" :class="{ dTimeline: timeline }">
      <div v-if="!entries.length" class="empty">{{ term || tagFilter ? 'Sem resultados.' : 'O diário está em branco.' }}</div>
      <div
        v-for="e in entries"
        :key="e.id"
        class="dEntry"
        :draggable="!timeline"
        @dragstart="onDragStart($event, e.id)"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, e.id)"
      >
        <div class="dHead" @click="toggleDiary(e.id)">
          <span v-if="!timeline" class="dragH" @click.stop>⠿</span>
          <div style="flex: 1">
            <div class="dDate">
              <span v-html="hl(e.day, term)"></span> · <span style="font-weight: 400; opacity: 0.7">{{ e.date }}</span>
            </div>
            <div class="dTitleT" v-html="hl(e.title, term)"></div>
          </div>
          <span style="color: var(--border); font-size: 0.9rem">▾</span>
        </div>
        <div v-if="(e.tags || []).length" class="sPills" style="margin-top: 0.3rem">
          <span
            v-for="t in e.tags"
            :key="t"
            class="dtChip"
            style="border-color: var(--border); color: var(--muted); cursor: pointer"
            @click.stop="tagFilter = t"
            >#{{ t }}</span
          >
        </div>
        <div v-if="!bodyOpen(e)" class="dPrev" v-html="preview(e)"></div>
        <div class="dBody" :class="{ open: bodyOpen(e) }">
          <hr style="border: none; border-top: 1px solid var(--border); margin: 0.55rem 0" />
          <div class="dBodyT">
            <template v-for="(tk, i) in tokens(e)" :key="i"
              ><a v-if="tk.type === 'mention'" style="color: var(--red); font-weight: 600; cursor: pointer; text-decoration: underline" @click.stop="openMention(tk.value)">@{{ tk.value }}</a
              ><span v-else v-html="hl(tk.value, term)"></span
            ></template>
          </div>
          <div class="dActs">
            <button class="btn btnOut sm" @click.stop="openEdit(e)">✏ Editar</button>
            <button class="btn btnDng sm" @click.stop="deleteDiary(e.id)">✕ Apagar</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Editar entrada -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 500px; width: 90vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Entrada</h3>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Dia</label><input v-model="edit.day" type="text" /></div>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Título</label><input v-model="edit.title" type="text" /></div>
      <div class="fGrp" style="margin-bottom: 0.6rem"><label>Texto</label><textarea v-model="edit.body" style="min-height: 120px"></textarea></div>
      <div class="fGrp" style="margin-bottom: 0.8rem"><label>Tags (separadas por vírgula)</label><input v-model="edit.tags" type="text" /></div>
      <button class="btn btnRed" @click="saveEdit">Salvar</button>
    </div>
  </BaseModal>

  <ImagePopup :open="mentionPopup.open" :name="mentionPopup.name" :img="mentionPopup.img" @close="mentionPopup.open = false" />
</template>

<style scoped>
.dTimeline {
  border-left: 2px solid var(--border);
  margin-left: 0.6rem;
  padding-left: 1rem;
}
.dTimeline .dEntry {
  position: relative;
}
.dTimeline .dEntry::before {
  content: '';
  position: absolute;
  left: -1.42rem;
  top: 1rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--red);
  border: 2px solid var(--bg);
}
</style>
