<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { Item } from '../../types'
import { RAR_ORDER, RAR_COLORS, RAR_BG } from '../../constants'
import { fileToDataUrl } from '../../utils/image'
import { searchMagicItems, type MagicItemCandidate } from '../../utils/magicitems'
import BaseModal from '../ui/BaseModal.vue'
import { appAlert, appConfirm } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const itens = computed(() => camp.value.itens || [])

const RARIDADES = ['Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

const showForm = ref(false)

// Import SRD
const importName = ref('')
const importing = ref(false)
const importMsg = ref('')
const chooser = reactive({
  open: false,
  query: '',
  candidates: [] as MagicItemCandidate[],
  selected: null as MagicItemCandidate | null
})

// Formulário
const form = reactive({ nome: '', tipo: '', raridade: '', attune: 'no', desc: '' })
const imgInput = ref<HTMLInputElement | null>(null)

// Filtros
const search = ref('')
const rarFilter = ref('')
const typeFilter = ref('')
const sort = ref('alpha')

const types = computed(() => Array.from(new Set(itens.value.map((it) => it.tipo).filter(Boolean))).sort() as string[])

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  let list = itens.value.slice()
  if (term)
    list = list.filter(
      (it) => it.name.toLowerCase().includes(term) || (it.tipo || '').toLowerCase().includes(term) || (it.desc || '').toLowerCase().includes(term)
    )
  if (rarFilter.value) list = list.filter((it) => it.raridade === rarFilter.value)
  if (typeFilter.value) list = list.filter((it) => it.tipo === typeFilter.value)
  if (sort.value === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort.value === 'type') list.sort((a, b) => (a.tipo || '').localeCompare(b.tipo || ''))
  else if (sort.value === 'rar_asc') list.sort((a, b) => RAR_ORDER.indexOf(a.raridade || '') - RAR_ORDER.indexOf(b.raridade || ''))
  else if (sort.value === 'rar_desc') list.sort((a, b) => RAR_ORDER.indexOf(b.raridade || '') - RAR_ORDER.indexOf(a.raridade || ''))
  return list
})

const countText = computed(() => (filtered.value.length < itens.value.length ? filtered.value.length + '/' + itens.value.length + ' itens' : ''))

function rarColor(r: string | null) {
  return (r && RAR_COLORS[r]) || 'var(--muted)'
}
function rarBg(r: string | null) {
  return (r && RAR_BG[r]) || 'var(--bg3)'
}
function metaText(it: Item) {
  return [it.tipo || '', it.attune === 'yes' ? '⚡ Attunement' : ''].filter(Boolean).join(' · ')
}

async function importFromSRD() {
  const n = importName.value.trim()
  if (!n) return
  importing.value = true
  importMsg.value = ''
  try {
    const candidates = await searchMagicItems(n)
    if (!candidates.length) {
      importMsg.value = 'Nenhum item encontrado para "' + n + '".'
      return
    }
    if (candidates.length === 1) {
      importCandidate(candidates[0])
      return
    }
    chooser.query = n
    chooser.candidates = candidates
    chooser.selected = candidates[0]
    chooser.open = true
  } catch (e) {
    importMsg.value = e instanceof Error ? e.message : 'Erro ao importar.'
  } finally {
    importing.value = false
  }
}

function closeChooser() {
  chooser.open = false
  chooser.selected = null
}

function selectCandidate(c: MagicItemCandidate) {
  chooser.selected = c
}

function importSelected() {
  if (chooser.selected) importCandidate(chooser.selected)
}

function importCandidate(c: MagicItemCandidate) {
  camp.value.itens.push({ id: Date.now(), img: null, ...c.item })
  importMsg.value = '✔ "' + c.name + '"' + (c.edition ? ' (' + c.edition + ')' : '') + ' importado!'
  importName.value = ''
  closeChooser()
}

function previewMeta(c: MagicItemCandidate) {
  return [
    c.tipo || '',
    c.raridade || '',
    c.attune === 'yes' ? '⚡ Attunement' : '',
    c.weaponDetail ? 'Dano: ' + c.weaponDetail : '',
    c.armorDetail ? 'CA: ' + c.armorDetail : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

function resetForm() {
  form.nome = ''
  form.tipo = ''
  form.raridade = ''
  form.attune = 'no'
  form.desc = ''
  if (imgInput.value) imgInput.value.value = ''
}

function showAddForm() {
  resetForm()
  showForm.value = true
}

function hideAddForm() {
  showForm.value = false
}

async function addItem() {
  const nome = form.nome.trim()
  if (!nome) {
    await appAlert('Digite o nome!')
    return
  }
  let img: string | null = null
  const file = imgInput.value?.files?.[0]
  if (file) img = await fileToDataUrl(file)
  camp.value.itens.push({
    id: Date.now(),
    name: nome,
    tipo: form.tipo.trim() || null,
    raridade: form.raridade || null,
    attune: form.attune as 'yes' | 'no',
    desc: form.desc.trim() || null,
    img
  })
  hideAddForm()
}

async function removeItem(id: number) {
  if (!(await appConfirm('Remover este item?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  camp.value.itens = itens.value.filter((it) => it.id !== id)
}

// Popup
const popup = reactive({ open: false, item: null as Item | null })
function openPopup(it: Item) {
  popup.item = it
  popup.open = true
}

// Editar
const edit = reactive({ open: false, id: 0, nome: '', tipo: '', raridade: '', attune: 'no', desc: '', preview: null as string | null })
const eImgInput = ref<HTMLInputElement | null>(null)
function openEdit(it: Item) {
  edit.id = it.id
  edit.nome = it.name
  edit.tipo = it.tipo || ''
  edit.raridade = it.raridade || ''
  edit.attune = it.attune || 'no'
  edit.desc = it.desc || ''
  edit.preview = it.img
  if (eImgInput.value) eImgInput.value.value = ''
  edit.open = true
}
async function saveEdit() {
  const it = itens.value.find((x) => x.id === edit.id)
  if (!it) return
  const n = edit.nome.trim()
  if (n) it.name = n
  it.tipo = edit.tipo.trim() || null
  it.raridade = edit.raridade || null
  it.attune = edit.attune as 'yes' | 'no'
  it.desc = edit.desc.trim() || null
  const file = eImgInput.value?.files?.[0]
  if (file) it.img = await fileToDataUrl(file)
  edit.open = false
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
  const list = camp.value.itens
  const si = list.findIndex((x) => x.id === dragSrc)
  const ti = list.findIndex((x) => x.id === tid)
  if (si < 0 || ti < 0) return
  const item = list.splice(si, 1)[0]
  list.splice(ti, 0, item)
  document.querySelectorAll('#itensGrid .fCard').forEach((el) => el.classList.remove('dragging'))
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Itens Mágicos</h2>

    <div class="card" data-tour="itens-import">
      <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap">
        <div class="fGrp">
          <label>Importar do SRD 5e (Open5e)</label>
          <input v-model="importName" type="text" placeholder="Ex: Sword +1, Bag of Holding..." @keyup.enter="importFromSRD" />
        </div>
        <button class="btn btnRed" :disabled="importing" @click="importFromSRD">{{ importing ? 'Buscando...' : '⬇ Importar' }}</button>
      </div>
      <div v-if="importMsg" style="font-family: var(--fN); font-size: 0.75rem; color: var(--muted); margin-top: 0.35rem">{{ importMsg }}</div>
    </div>

    <div v-if="showForm" style="margin-bottom: 1rem">
      <div class="card">
        <div class="fRow">
          <div class="fGrp"><label>Nome</label><input v-model="form.nome" type="text" placeholder="Ex: Espada +1" /></div>
          <div class="fGrp" style="max-width: 140px"><label>Tipo</label><input v-model="form.tipo" type="text" placeholder="Ex: Arma" /></div>
          <div class="fGrp" style="max-width: 145px">
            <label>Raridade</label>
            <select v-model="form.raridade">
              <option value="">— selecione —</option>
              <option v-for="r in RARIDADES" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div class="fGrp" style="max-width: 120px">
            <label>Attunamento</label>
            <select v-model="form.attune">
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </select>
          </div>
        </div>
        <label class="ulabel" @click="imgInput?.click()">⬡ Clique para carregar imagem</label>
        <input ref="imgInput" type="file" accept="image/*" />
        <div class="fGrp" style="margin-top: 0.8rem"><label>Descrição</label><textarea v-model="form.desc" style="min-height: 90px" placeholder="Descreva o item..."></textarea></div>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.8rem; justify-content: flex-end">
          <button class="btn btnOut" @click="hideAddForm">Cancelar</button>
          <button class="btn btnRed" @click="addItem">+ Salvar Item</button>
        </div>
      </div>
    </div>

    <div v-if="!showForm" data-tour="itens-add" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showAddForm">+ Adicionar Item</button>
    </div>

    <div data-tour="itens-filter" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap">
      <input v-model="search" type="text" placeholder="⬡ Pesquisar..." style="flex: 1; max-width: 200px" />
      <select v-model="rarFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 140px">
        <option value="">Todas Raridades</option>
        <option v-for="r in RARIDADES" :key="r" :value="r">{{ r }}</option>
      </select>
      <select v-model="typeFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 140px">
        <option value="">Todos os Tipos</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="sort" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 155px">
        <option value="alpha">Alfabética</option>
        <option value="type">Por Tipo</option>
        <option value="rar_asc">Menor Raridade</option>
        <option value="rar_desc">Maior Raridade</option>
      </select>
      <span style="font-family: var(--fN); font-size: 0.78rem; color: var(--muted)">{{ countText }}</span>
    </div>
    <p style="font-family: var(--fN); font-size: 0.75rem; color: var(--muted); font-style: italic; margin-bottom: 0.8rem; text-align: center">
      Clique na imagem para ampliar
    </p>

    <div id="itensGrid" class="fGrid">
      <div v-if="!filtered.length" class="empty" style="grid-column: 1 / -1">Nenhum item encontrado.</div>
      <div
        v-for="it in filtered"
        :key="it.id"
        class="fCard"
        draggable="true"
        @dragstart="onDragStart($event, it.id)"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, it.id)"
      >
        <div class="fImg" @click="openPopup(it)">
          <img v-if="it.img" :src="it.img" :alt="it.name" />
          <template v-else>⬡</template>
        </div>
        <div class="fName">{{ it.name }}</div>
        <div
          v-if="it.raridade"
          style="display: inline-block; font-family: var(--fN); font-size: 0.62rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 3px; margin-bottom: 0.25rem"
          :style="{ background: rarBg(it.raridade), color: rarColor(it.raridade), border: '1px solid ' + rarColor(it.raridade) }"
        >
          {{ it.raridade }}
        </div>
        <div class="fMeta">{{ metaText(it) }}</div>
        <div
          v-if="it.desc"
          style="font-family: var(--fB); font-size: 0.75rem; color: var(--muted); font-style: italic; margin-bottom: 0.3rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical"
        >
          {{ it.desc }}
        </div>
        <button class="btn btnOut sm" style="width: 100%; margin-top: 0.3rem" @click="openEdit(it)">✏ Editar</button>
        <button class="btn btnDng sm" style="width: 100%; margin-top: 0.3rem" @click="removeItem(it.id)">✕ Remover</button>
      </div>
    </div>
  </div>

  <!-- Editar item -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 460px; width: 90vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Item</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="edit.nome" type="text" /></div>
        <div class="fGrp" style="max-width: 140px"><label>Tipo</label><input v-model="edit.tipo" type="text" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp">
          <label>Raridade</label>
          <select v-model="edit.raridade">
            <option value="">— selecione —</option>
            <option v-for="r in RARIDADES" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div class="fGrp" style="max-width: 120px">
          <label>Attunamento</label>
          <select v-model="edit.attune">
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
        </div>
      </div>
      <label class="ulabel" @click="eImgInput?.click()">⬡ Trocar imagem</label>
      <input ref="eImgInput" type="file" accept="image/*" />
      <div v-if="edit.preview" style="margin-top: 0.6rem; text-align: center">
        <img :src="edit.preview" style="max-height: 110px; border-radius: 3px; border: 1px solid var(--border)" />
      </div>
      <div class="fGrp" style="margin-top: 0.7rem"><label>Descrição</label><textarea v-model="edit.desc" style="min-height: 90px"></textarea></div>
      <div style="text-align: right; margin-top: 0.9rem"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>

  <!-- Seletor de resultados do SRD -->
  <BaseModal :open="chooser.open" @close="closeChooser">
    <div class="modal" style="max-width: 720px; width: 94vw">
      <div class="chooserHead">
        <h3>Escolha o item</h3>
        <div class="chooserHeadBtns">
          <button
            class="btn btnRed sm"
            :disabled="!chooser.selected"
            :title="chooser.selected ? 'Importar ' + chooser.selected.name : 'Selecione um item'"
            @click="importSelected"
          >
            ⬇ Importar
          </button>
          <button class="mClose chooserClose" type="button" @click="closeChooser">✕</button>
        </div>
      </div>
      <p style="font-family: var(--fB); font-size: 0.9rem; color: var(--muted); margin-bottom: 0.8rem">
        {{ chooser.candidates.length }} resultados para "{{ chooser.query }}". Clique para ver os detalhes · duplo clique para importar.
      </p>
      <div class="chooserWrap">
        <div class="chooserList">
          <button
            v-for="(c, i) in chooser.candidates"
            :key="c.key + i"
            type="button"
            class="chooseRow"
            :class="{ selected: chooser.selected?.key === c.key }"
            @click="selectCandidate(c)"
            @dblclick="importCandidate(c)"
          >
            <span v-if="chooser.selected?.key === c.key" class="chooseRowMark" aria-hidden="true">▶</span>
            <div style="flex: 1; min-width: 0">
              <div style="font-family: var(--fH); font-weight: 700; color: var(--red)">{{ c.name }}</div>
              <div style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted)">
                {{ c.sourceName }}<span v-if="c.tipo"> · {{ c.tipo }}</span><span v-if="c.raridade"> · {{ c.raridade }}</span>
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
        <div class="chooserPreview">
          <template v-if="chooser.selected">
            <div class="chooserPreviewLabel">Visualizando</div>
            <div class="chooserPreviewTitle">{{ chooser.selected.name }}</div>
            <div
              v-if="chooser.selected.raridade"
              class="chooserPreviewRarity"
              :style="{
                background: rarBg(chooser.selected.raridade),
                color: rarColor(chooser.selected.raridade),
                borderColor: rarColor(chooser.selected.raridade)
              }"
            >
              {{ chooser.selected.raridade }}
            </div>
            <div class="chooserPreviewMeta">
              {{ chooser.selected.sourceName }}<span v-if="chooser.selected.edition"> · {{ chooser.selected.edition }}</span>
            </div>
            <div v-if="previewMeta(chooser.selected)" class="chooserPreviewMeta">{{ previewMeta(chooser.selected) }}</div>
            <div v-if="chooser.selected.desc" class="chooserPreviewDesc">{{ chooser.selected.desc }}</div>
            <div v-else class="chooserPreviewEmpty">Sem descrição disponível.</div>
          </template>
          <div v-else class="chooserPreviewEmpty">Clique em um item da lista para ver os detalhes.</div>
        </div>
      </div>
    </div>
  </BaseModal>

  <!-- Popup item -->
  <BaseModal :open="popup.open" @close="popup.open = false">
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; max-width: 92vw">
      <button
        style="position: absolute; top: -2rem; right: 0; background: transparent; border: none; color: #ccc; font-size: 1.3rem; cursor: pointer"
        @click="popup.open = false"
      >
        ✕
      </button>
      <p style="font-family: var(--fH); font-weight: 700; font-size: 1.1rem; color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7)">{{ popup.item?.name }}</p>
      <img
        v-if="popup.item?.img"
        :src="popup.item.img"
        alt=""
        style="max-width: 90vw; max-height: 75vh; object-fit: contain; border-radius: 4px; border: 2px solid var(--border2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5)"
      />
      <div v-else style="background: var(--bg2); border: 2px solid var(--border); border-radius: 4px; padding: 1.5rem 2.5rem; color: var(--muted); font-style: italic">
        Sem imagem
      </div>
      <div
        style="max-width: 600px; width: 90vw; background: rgba(10, 5, 2, 0.78); border: 1px solid var(--border); border-radius: 4px; padding: 0.9rem 1.1rem; font-family: var(--fB); font-size: 0.95rem; color: #f0e8d8; line-height: 1.75; max-height: 30vh; overflow-y: auto"
      >
        <div
          v-if="popup.item?.raridade"
          style="font-family: var(--fN); font-size: 0.75rem; font-weight: 700; margin-bottom: 0.3rem; text-transform: uppercase"
          :style="{ color: rarColor(popup.item.raridade) }"
        >
          {{ popup.item.raridade }}
        </div>
        <div v-if="popup.item?.tipo" style="font-family: var(--fN); font-size: 0.8rem; color: rgba(240, 232, 216, 0.7); margin-bottom: 0.5rem">
          {{ popup.item.tipo }}{{ popup.item.attune === 'yes' ? ' · ⚡ Requires Attunement' : '' }}
        </div>
        <div
          v-else-if="popup.item?.attune === 'yes'"
          style="font-family: var(--fN); font-size: 0.8rem; color: rgba(240, 232, 216, 0.7); margin-bottom: 0.5rem"
        >
          ⚡ Requires Attunement
        </div>
        <div v-if="popup.item?.desc" style="font-family: var(--fB); font-size: 0.95rem; line-height: 1.75; white-space: pre-wrap; color: #f0e8d8">
          {{ popup.item.desc }}
        </div>
        <div v-else style="font-family: var(--fB); font-size: 0.9rem; color: rgba(240, 232, 216, 0.5); font-style: italic">Sem descrição.</div>
      </div>
    </div>
  </BaseModal>
</template>
