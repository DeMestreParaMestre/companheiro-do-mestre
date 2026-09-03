<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import type { Personagem, Item } from '../../types'
import { fileToDataUrl } from '../../utils/image'
import { syncFromPersonagem, unlinkPersonagemFromParty, personagemCurrentHp, personagemMaxHp } from '../../utils/partyLink'
import { applyLongRestFromPersonagemCard } from '../../utils/longRest'
import { appAlert, appConfirm } from '../../composables/useAppDialog'
import BaseModal from '../ui/BaseModal.vue'
import ImagePopup from '../ui/ImagePopup.vue'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const personagens = computed(() => camp.value.personagens || [])
const attuneItems = computed(() => (camp.value.itens || []).filter((it) => it.attune === 'yes'))

function isItemName(name: string) {
  return attuneItems.value.some((it) => it.name === name)
}

// ---- Formulário (novo) ----
const showForm = ref(false)
const form = reactive({ nome: '', hpMax: '', hpAtual: '', ac: '', classe: '', pp: '', cristais: '0', bg: '' })
const newAt = reactive({ sel: ['', '', ''], txt: ['', '', ''] })
const pjImgInput = ref<HTMLInputElement | null>(null)

function optionsForNew(i: number): Item[] {
  const usedByAll = personagens.value
    .reduce<string[]>((acc, p) => acc.concat(p.attunados || []), [])
    .filter((n) => isItemName(n))
  const usedOther = newAt.sel.filter((v, j) => j !== i && v && isItemName(v))
  const blocked = new Set([...usedByAll, ...usedOther])
  const savedVal = newAt.sel[i] || ''
  return attuneItems.value.filter((it) => !blocked.has(it.name) || it.name === savedVal)
}

function showPjForm() {
  form.nome = ''
  form.hpMax = ''
  form.hpAtual = ''
  form.ac = ''
  form.classe = ''
  form.pp = ''
  form.cristais = '0'
  form.bg = ''
  newAt.sel = ['', '', '']
  newAt.txt = ['', '', '']
  if (pjImgInput.value) pjImgInput.value.value = ''
  showForm.value = true
}
function hidePjForm() {
  showForm.value = false
}

function atVals(sel: string[], txt: string[]): string[] {
  const res: string[] = []
  for (let i = 0; i < 3; i++) {
    const sv = (sel[i] || '').trim()
    const tv = (txt[i] || '').trim()
    res.push(sv || tv || '')
  }
  return res
}

async function addPJ() {
  const nome = form.nome.trim()
  if (!nome) {
    await appAlert('Digite o nome!')
    return
  }
  let img: string | null = null
  const file = pjImgInput.value?.files?.[0]
  if (file) img = await fileToDataUrl(file)
  const hpMax = parseInt(form.hpMax) || null
  const hpAtual = parseInt(form.hpAtual)
  camp.value.personagens.push({
    id: Date.now(),
    name: nome,
    hp: !isNaN(hpAtual) ? hpAtual : hpMax,
    hpMax,
    ac: parseInt(form.ac) || null,
    type: form.classe.trim() || null,
    pp: parseInt(form.pp) || null,
    cristais: parseInt(form.cristais) || 0,
    attunados: atVals(newAt.sel, newAt.txt).filter(Boolean),
    bg: form.bg.trim() || null,
    img
  })
  hidePjForm()
}

async function longRestPJ(p: Personagem) {
  if (
    !(await appConfirm(`Descanso longo de ${p.name}?\nRestaura HP ao máximo e limpa salvamentos na iniciativa.`, {
      title: 'Long Rest',
      confirmLabel: 'Descansar'
    }))
  )
    return
  applyLongRestFromPersonagemCard(camp.value, p)
}

async function removePJ(id: number) {
  if (!(await appConfirm('Remover este personagem?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  camp.value.personagens = personagens.value.filter((p) => String(p.id) !== String(id))
  unlinkPersonagemFromParty(camp.value, id)
}

function metaText(p: Personagem) {
  const hpPart =
    p.hpMax != null
      ? `HP:${personagemCurrentHp(p)}/${personagemMaxHp(p)}`
      : p.hp != null
        ? 'HP:' + p.hp
        : ''
  return [hpPart, p.ac ? 'AC:' + p.ac : '', p.pp ? 'PP:' + p.pp : '', p.cristais ? '💎' + p.cristais : '']
    .filter(Boolean)
    .join(' · ')
}

// ---- Editar ----
const edit = reactive({ open: false, id: 0, nome: '', hpMax: '', hpAtual: '', ac: '', classe: '', pp: '', cristais: '0', bg: '', preview: null as string | null })
const editAt = reactive({ sel: ['', '', ''], txt: ['', '', ''] })
const epjImgInput = ref<HTMLInputElement | null>(null)

function optionsForEdit(i: number): Item[] {
  const usedByOthers = personagens.value
    .filter((p) => String(p.id) !== String(edit.id))
    .reduce<string[]>((acc, p) => acc.concat(p.attunados || []), [])
    .filter((n) => isItemName(n))
  const usedOther = editAt.sel.filter((v, j) => j !== i && v && isItemName(v))
  const blocked = new Set([...usedByOthers, ...usedOther])
  const savedVal = editAt.sel[i] || ''
  return attuneItems.value.filter((it) => !blocked.has(it.name) || it.name === savedVal)
}

function openEdit(p: Personagem) {
  edit.id = p.id
  edit.nome = p.name || ''
  edit.hpMax = p.hpMax != null ? String(p.hpMax) : ''
  edit.hpAtual = String(personagemCurrentHp(p))
  edit.ac = p.ac != null ? String(p.ac) : ''
  edit.classe = p.type || ''
  edit.pp = p.pp != null ? String(p.pp) : ''
  edit.cristais = String(p.cristais || 0)
  edit.bg = p.bg || ''
  edit.preview = p.img
  if (epjImgInput.value) epjImgInput.value.value = ''
  // preencher attunamentos: se for item conhecido vai no select, senão no texto
  const saved = p.attunados || []
  editAt.sel = ['', '', '']
  editAt.txt = ['', '', '']
  for (let i = 0; i < 3; i++) {
    const val = saved[i] || ''
    if (val && isItemName(val)) editAt.sel[i] = val
    else editAt.txt[i] = val
  }
  edit.open = true
}
async function saveEdit() {
  const p = personagens.value.find((x) => String(x.id) === String(edit.id))
  if (!p) return
  const n = edit.nome.trim()
  if (n) p.name = n
  const hMax = parseInt(edit.hpMax)
  if (!isNaN(hMax) && hMax > 0) p.hpMax = hMax
  const hCur = parseInt(edit.hpAtual)
  if (!isNaN(hCur)) p.hp = hCur
  const a = parseInt(edit.ac)
  if (a) p.ac = a
  p.type = edit.classe.trim() || null
  p.pp = parseInt(edit.pp) || null
  p.cristais = parseInt(edit.cristais) || 0
  p.attunados = atVals(editAt.sel, editAt.txt).filter(Boolean)
  p.bg = edit.bg.trim() || null
  const file = epjImgInput.value?.files?.[0]
  if (file) p.img = await fileToDataUrl(file)
  syncFromPersonagem(camp.value, p)
  edit.open = false
}

// ---- Popups ----
const pjPopup = reactive({ open: false, name: '', img: null as string | null, bg: null as string | null })
function openPJPopup(p: Personagem) {
  pjPopup.name = p.name
  pjPopup.img = p.img || null
  pjPopup.bg = p.bg || null
  pjPopup.open = true
}
const itemPopup = reactive({ open: false, name: '', img: null as string | null })
function openItemPopupByName(name: string) {
  const it = (camp.value.itens || []).find((it) => it.name === name)
  if (!it) return
  itemPopup.name = it.name
  itemPopup.img = it.img || null
  itemPopup.open = true
}

// ---- Dashboard ----
const byPP = computed(() => personagens.value.filter((p) => p.pp != null).sort((a, b) => (b.pp || 0) - (a.pp || 0)))
const byCr = computed(() => personagens.value.filter((p) => p.cristais > 0).sort((a, b) => b.cristais - a.cristais))
const withAt = computed(() => personagens.value.filter((p) => p.attunados && p.attunados.length > 0))

// ---- Drag reorder ----
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
  const list = camp.value.personagens
  const si = list.findIndex((x) => x.id === dragSrc)
  const ti = list.findIndex((x) => x.id === tid)
  if (si < 0 || ti < 0) return
  const item = list.splice(si, 1)[0]
  list.splice(ti, 0, item)
  document.querySelectorAll('#pjGrid .fCard').forEach((el) => el.classList.remove('dragging'))
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Personagens</h2>

    <div v-if="showForm" style="margin-bottom: 1rem">
      <div class="card">
        <div class="fRow">
          <div class="fGrp"><label>Nome</label><input v-model="form.nome" type="text" placeholder="Ex: Aldric" /></div>
          <div class="fGrp" style="max-width: 82px"><label>HP Máx</label><input v-model="form.hpMax" type="number" /></div>
          <div class="fGrp" style="max-width: 82px"><label>HP Atual</label><input v-model="form.hpAtual" type="number" placeholder="= máx" /></div>
          <div class="fGrp" style="max-width: 68px"><label>AC</label><input v-model="form.ac" type="number" /></div>
        </div>
        <div class="fRow">
          <div class="fGrp"><label>Classe</label><input v-model="form.classe" type="text" placeholder="Ex: Paladino" /></div>
          <div class="fGrp" style="max-width: 90px"><label>Passive Perc.</label><input v-model="form.pp" type="number" /></div>
          <div class="fGrp" style="max-width: 85px"><label>Cristais</label><input v-model="form.cristais" type="number" min="0" /></div>
        </div>
        <div style="margin-bottom: 0.7rem">
          <label style="display: block; margin-bottom: 0.35rem"
            >Itens Attunados <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted)">(opcionais, máx. 3)</span></label
          >
          <div v-for="i in 3" :key="i" class="atRow">
            <select v-model="newAt.sel[i - 1]">
              <option value="">— vincular item —</option>
              <option v-for="it in optionsForNew(i - 1)" :key="it.id" :value="it.name">
                {{ it.name }}{{ it.raridade ? ' (' + it.raridade + ')' : '' }}
              </option>
            </select>
            <span class="atOr">ou</span>
            <input v-model="newAt.txt[i - 1]" type="text" placeholder="manual" />
          </div>
        </div>
        <label class="ulabel" @click="pjImgInput?.click()">⬡ Clique para carregar imagem</label>
        <input ref="pjImgInput" type="file" accept="image/*" />
        <div class="fGrp" style="margin-top: 0.8rem">
          <label>Background</label>
          <textarea v-model="form.bg" style="min-height: 120px" placeholder="História, motivações, segredos..."></textarea>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.8rem; justify-content: flex-end">
          <button class="btn btnOut" @click="hidePjForm">Cancelar</button>
          <button class="btn btnRed" @click="addPJ">+ Salvar Personagem</button>
        </div>
      </div>
    </div>

    <div v-if="!showForm" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showPjForm">+ Adicionar Personagem</button>
    </div>

    <!-- Dashboard -->
    <div v-if="personagens.length" style="margin-bottom: 1.2rem">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.7rem">
        <div class="dbPanel">
          <div class="dbTitle">👁 Passive Perception</div>
          <template v-if="byPP.length">
            <div v-for="p in byPP" :key="p.id" class="dbRow"><span>{{ p.name }}</span><span>{{ p.pp }}</span></div>
          </template>
          <span v-else style="font-family: var(--fB); font-size: 0.82rem; color: var(--muted); font-style: italic">—</span>
        </div>
        <div class="dbPanel">
          <div class="dbTitle">💎 Cristais</div>
          <template v-if="byCr.length">
            <div v-for="p in byCr" :key="p.id" class="dbRow"><span>{{ p.name }}</span><span>{{ p.cristais }}</span></div>
          </template>
          <span v-else style="font-family: var(--fB); font-size: 0.82rem; color: var(--muted); font-style: italic">—</span>
        </div>
        <div class="dbPanel">
          <div class="dbTitle">⚡ Itens Attunados</div>
          <template v-if="withAt.length">
            <div v-for="p in withAt" :key="p.id" style="margin-bottom: 0.35rem">
              <div style="font-family: var(--fH); font-weight: 600; font-size: 0.82rem; color: var(--muted)">{{ p.name }}</div>
              <div
                v-for="(it, j) in p.attunados"
                :key="j"
                style="font-family: var(--fB); font-size: 0.85rem; padding: 0.1rem 0 0.1rem 0.6rem; border-left: 2px solid var(--border); cursor: pointer; color: var(--red)"
                @click="openItemPopupByName(it)"
              >
                • {{ it }}
              </div>
            </div>
          </template>
          <span v-else style="font-family: var(--fB); font-size: 0.82rem; color: var(--muted); font-style: italic">—</span>
        </div>
      </div>
    </div>

    <p style="font-family: var(--fN); font-size: 0.75rem; color: var(--muted); font-style: italic; margin-bottom: 0.8rem; text-align: center">
      Clique na imagem para ampliar · Arraste para reordenar
    </p>

    <div id="pjGrid" class="fGrid">
      <div v-if="!personagens.length" class="empty" style="grid-column: 1 / -1">Nenhum personagem ainda.</div>
      <div
        v-for="p in personagens"
        :key="p.id"
        class="fCard"
        draggable="true"
        @dragstart="onDragStart($event, p.id)"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop($event, p.id)"
      >
        <div class="fImg" @click="openPJPopup(p)">
          <img v-if="p.img" :src="p.img" :alt="p.name" />
          <template v-else>⬡</template>
        </div>
        <div class="fName">{{ p.name }}</div>
        <div v-if="p.type" class="tBadge">{{ p.type }}</div>
        <div class="fMeta">{{ metaText(p) }}</div>
        <div v-if="p.attunados && p.attunados.length" style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted); margin-bottom: 0.3rem">
          <span v-for="(it, j) in p.attunados" :key="j">
            <span style="cursor: pointer; color: var(--red)" @click="openItemPopupByName(it)">⚡ {{ it }}</span>
            <span v-if="j < p.attunados.length - 1"> · </span>
          </span>
        </div>
        <div
          v-if="p.bg"
          style="font-family: var(--fB); font-size: 0.75rem; color: var(--muted); font-style: italic; margin-bottom: 0.3rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical"
        >
          {{ p.bg }}
        </div>
        <button class="btn btnOut sm" style="width: 100%; margin-top: 0.3rem" @click="openEdit(p)">✏ Editar</button>
        <button class="btn btnOut sm" style="width: 100%; margin-top: 0.3rem" title="Restaura HP ao máximo" @click="longRestPJ(p)">☽ Long Rest</button>
        <button class="btn btnDng sm" style="width: 100%; margin-top: 0.3rem" @click="removePJ(p.id)">✕ Remover</button>
      </div>
    </div>
  </div>

  <!-- Editar PJ -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 520px; width: 90vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Personagem</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="edit.nome" type="text" /></div>
        <div class="fGrp" style="max-width: 82px"><label>HP Máx</label><input v-model="edit.hpMax" type="number" /></div>
        <div class="fGrp" style="max-width: 82px"><label>HP Atual</label><input v-model="edit.hpAtual" type="number" /></div>
        <div class="fGrp" style="max-width: 68px"><label>AC</label><input v-model="edit.ac" type="number" /></div>
      </div>
      <div class="fRow">
        <div class="fGrp"><label>Classe</label><input v-model="edit.classe" type="text" /></div>
        <div class="fGrp" style="max-width: 90px"><label>Passive Perc.</label><input v-model="edit.pp" type="number" /></div>
        <div class="fGrp" style="max-width: 85px"><label>Cristais</label><input v-model="edit.cristais" type="number" min="0" /></div>
      </div>
      <div style="margin-bottom: 0.7rem">
        <label style="display: block; margin-bottom: 0.35rem"
          >Itens Attunados <span style="font-family: var(--fN); font-size: 0.68rem; color: var(--muted)">(opcionais)</span></label
        >
        <div v-for="i in 3" :key="i" class="atRow">
          <select v-model="editAt.sel[i - 1]">
            <option value="">— vincular item —</option>
            <option v-for="it in optionsForEdit(i - 1)" :key="it.id" :value="it.name">
              {{ it.name }}{{ it.raridade ? ' (' + it.raridade + ')' : '' }}
            </option>
          </select>
          <span class="atOr">ou</span>
          <input v-model="editAt.txt[i - 1]" type="text" placeholder="manual" />
        </div>
      </div>
      <label class="ulabel" @click="epjImgInput?.click()">⬡ Trocar imagem (opcional)</label>
      <input ref="epjImgInput" type="file" accept="image/*" />
      <div v-if="edit.preview" style="margin-top: 0.6rem; text-align: center">
        <img :src="edit.preview" style="max-height: 110px; border-radius: 3px; border: 1px solid var(--border)" />
      </div>
      <div class="fGrp" style="margin-top: 0.7rem"><label>Background</label><textarea v-model="edit.bg" style="min-height: 120px"></textarea></div>
      <div style="text-align: right; margin-top: 0.9rem"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>

  <!-- Popup PJ (imagem + background) -->
  <BaseModal :open="pjPopup.open" @close="pjPopup.open = false">
    <div style="position: relative; max-width: 90vw; width: 700px">
      <button
        style="position: absolute; top: -2rem; right: 0; background: transparent; border: none; color: #ccc; font-size: 1.3rem; cursor: pointer"
        @click="pjPopup.open = false"
      >
        ✕
      </button>
      <p style="font-family: var(--fH); font-weight: 700; font-size: 1.1rem; color: #fff; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); margin-bottom: 0.5rem; text-align: center">
        {{ pjPopup.name }}
      </p>
      <div style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap">
        <div style="flex: 0 0 auto; max-width: 300px">
          <img
            v-if="pjPopup.img"
            :src="pjPopup.img"
            alt=""
            style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px; border: 2px solid var(--border2); box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5)"
          />
          <div v-else style="background: var(--bg2); border: 2px solid var(--border); border-radius: 4px; padding: 1.5rem 2rem; color: var(--muted); font-style: italic">
            Sem imagem
          </div>
        </div>
        <div
          v-if="pjPopup.bg"
          style="flex: 1; min-width: 180px; background: rgba(10, 5, 2, 0.78); border: 1px solid var(--border); border-radius: 4px; padding: 0.9rem 1.1rem; font-family: var(--fB); font-size: 0.95rem; color: #f0e8d8; line-height: 1.75; white-space: pre-wrap; max-height: 70vh; overflow-y: auto"
        >
          {{ pjPopup.bg }}
        </div>
      </div>
    </div>
  </BaseModal>

  <ImagePopup :open="itemPopup.open" :name="itemPopup.name" :img="itemPopup.img" @close="itemPopup.open = false" />
</template>

<style scoped>
/* A miniatura quadrada do personagem mostra o topo da imagem (rosto),
   em vez de puxar do centro. */
.fImg img {
  object-position: top;
}
</style>
