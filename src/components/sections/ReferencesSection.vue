<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { REF_TYPES } from '../../constants'
import type { Reference } from '../../types'
import { fileToDataUrl } from '../../utils/image'
import { groupReferences } from '../../utils/refGroups'
import { emptyTable, serializeTableContent } from '../../utils/refTable'
import { validateReferenceForm, type RefFormErrors, type RefFormField } from '../../utils/refValidation'
import { useToast } from '../../composables/useToast'
import BaseModal from '../ui/BaseModal.vue'
import ImagePopup from '../ui/ImagePopup.vue'
import ReferenceView from '../ui/ReferenceView.vue'
import CategorySelect from '../ui/CategorySelect.vue'
import TableEditor from '../ui/TableEditor.vue'
import { appConfirm } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)
const toast = useToast()

const formErrors = reactive<RefFormErrors>({})
const editErrors = reactive<RefFormErrors>({})

function clearErrors(target: RefFormErrors) {
  ;(Object.keys(target) as RefFormField[]).forEach((k) => delete target[k])
}

function focusFirstError(errors: RefFormErrors, prefix = 'form') {
  const order: RefFormField[] = ['name', 'url', 'img', 'content']
  for (const field of order) {
    if (errors[field]) {
      nextTick(() => {
        document.querySelector(`[data-ref-field="${prefix}-${field}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      break
    }
  }
}

function isContentRequired(type: string) {
  return type === 'texto' || type === 'lista' || type === 'link' || type === 'tabela'
}

function typeLabel(k: string) {
  return REF_TYPES.find((t) => t.k === k)?.l || k
}
function contentHint(type: string) {
  if (type === 'tabela') return 'Monte a tabela na grade abaixo (linha 1 = cabeçalho).'
  if (type === 'lista') return 'Um item por linha.'
  if (type === 'link') return 'Cole a URL completa (https://...).'
  if (type === 'imagem') return 'Carregue a imagem; o texto abaixo vira legenda (opcional).'
  if (type === 'musica') return 'Cole o link do YouTube acima; o texto abaixo vira a descrição (opcional).'
  return ''
}

// Formulário
const form = reactive({ name: '', type: 'texto', content: '', url: '', catParent: '', catChild: '' })
const edit = reactive({ open: false, id: 0, name: '', type: 'texto', content: '', img: null as string | null, url: '', catParent: '', catChild: '' })
const fImg = ref<HTMLInputElement | null>(null)

const hasReferences = computed(() => (camp.value.references || []).length > 0)
const showForm = ref(false)

watch(
  () => store.activeCampaign?.id,
  () => {
    showForm.value = !hasReferences.value
  },
  { immediate: true }
)

watch(
  () => camp.value.references?.length ?? 0,
  (len) => {
    if (len === 0) showForm.value = true
  }
)

function resetForm() {
  form.name = ''
  form.type = 'texto'
  form.content = ''
  form.url = ''
  form.catParent = ''
  form.catChild = ''
  if (fImg.value) fImg.value.value = ''
  clearErrors(formErrors)
}

function openForm() {
  resetForm()
  showForm.value = true
}

function closeForm() {
  resetForm()
  showForm.value = false
}

function clearFormAfterAdd() {
  form.name = ''
  form.content = ''
  form.url = ''
  if (fImg.value) fImg.value.value = ''
  clearErrors(formErrors)
}

function ensureTableContent(target: { type: string; content: string }) {
  if (target.type === 'tabela' && !target.content.trim()) {
    target.content = serializeTableContent(emptyTable(3, 4))
  }
}

watch(
  () => form.type,
  () => {
    ensureTableContent(form)
    clearErrors(formErrors)
  }
)

watch(() => form.name, () => { delete formErrors.name })
watch(() => form.content, () => { delete formErrors.content })
watch(() => form.url, () => { delete formErrors.url })

watch(() => edit.name, () => { delete editErrors.name })
watch(() => edit.content, () => { delete editErrors.content })
watch(() => edit.url, () => { delete editErrors.url })

// Categorias existentes (para autocompletar).
const parentCats = computed(() => {
  const set = new Set<string>()
  ;(camp.value.references || []).forEach((r) => {
    if (r.catParent) set.add(r.catParent)
  })
  return [...set].sort()
})

function childCatsForParent(parent: string) {
  const p = parent.trim()
  const set = new Set<string>()
  ;(camp.value.references || []).forEach((r) => {
    if (!r.catChild) return
    if (!p || (r.catParent?.trim() || '') === p) set.add(r.catChild)
  })
  return [...set].sort()
}

const formChildCats = computed(() => childCatsForParent(form.catParent))
const editChildCats = computed(() => childCatsForParent(edit.catParent))

watch(
  () => form.catParent,
  () => {
    if (form.catChild && !formChildCats.value.includes(form.catChild)) form.catChild = ''
  }
)
watch(
  () => edit.catParent,
  () => {
    if (edit.catChild && !editChildCats.value.includes(edit.catChild)) edit.catChild = ''
  }
)

async function addReference() {
  clearErrors(formErrors)
  const file = fImg.value?.files?.[0]
  const result = validateReferenceForm({
    name: form.name,
    type: form.type,
    content: form.content,
    url: form.url,
    hasImage: !!file
  })
  if (!result.ok) {
    showForm.value = true
    Object.assign(formErrors, result.errors)
    toast.show(result.summary, 'error', 5500)
    focusFirstError(formErrors, 'form')
    return
  }

  const name = form.name.trim()
  let img: string | null = null
  if (form.type === 'imagem' && file) img = await fileToDataUrl(file)

  if (!camp.value.references) camp.value.references = []
  camp.value.references.push({
    id: nextId(),
    name,
    type: form.type,
    content: form.content.trim(),
    img,
    url: form.url.trim() || null,
    catParent: form.catParent.trim(),
    catChild: form.catChild.trim()
  })

  toast.show(`Referência "${name}" criada com sucesso.`, 'success')
  clearFormAfterAdd()
}

// IDs únicos mesmo quando várias referências são criadas no mesmo milissegundo.
function nextId() {
  const list = camp.value.references || []
  const max = list.reduce((m, r) => Math.max(m, r.id), 0)
  return Math.max(Date.now(), max + 1)
}

// Filtros
const search = ref('')
const typeFilter = ref('')
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  let list = (camp.value.references || []).slice()
  if (term)
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        typeLabel(r.type).toLowerCase().includes(term) ||
        (r.catParent || '').toLowerCase().includes(term) ||
        (r.catChild || '').toLowerCase().includes(term)
    )
  if (typeFilter.value) list = list.filter((r) => r.type === typeFilter.value)
  return list
})

// Agrupa em pastas: pai -> filho -> referências (respeitando a ordem manual).
const grouped = computed(() => groupReferences(filtered.value, camp.value.refCatOrder || [], camp.value.refSubOrder || {}))
// Agrupamento completo (sem filtros) usado como base para reordenar pastas/subcategorias.
const fullGroups = computed(() => groupReferences(camp.value.references || [], camp.value.refCatOrder || [], camp.value.refSubOrder || {}))

// Move uma pasta (categoria pai) para cima/baixo. A ordem também vale em
// "Referências Rápidas" na ferramenta de Iniciativa.
function moveFolder(parent: string, dir: -1 | 1) {
  const order = fullGroups.value.map((g) => g.parent)
  const i = order.indexOf(parent)
  const j = i + dir
  if (j < 0 || j >= order.length) return
  ;[order[i], order[j]] = [order[j], order[i]]
  camp.value.refCatOrder = order
}
// Move uma subcategoria dentro da sua pasta.
function moveSub(parent: string, child: string, dir: -1 | 1) {
  const grp = fullGroups.value.find((g) => g.parent === parent)
  if (!grp) return
  const order = grp.children.map((c) => c.child)
  const i = order.indexOf(child)
  const j = i + dir
  if (j < 0 || j >= order.length) return
  ;[order[i], order[j]] = [order[j], order[i]]
  camp.value.refSubOrder = { ...(camp.value.refSubOrder || {}), [parent]: order }
}

const collapsed = reactive(new Set<string>())
function toggleFolder(key: string) {
  if (collapsed.has(key)) collapsed.delete(key)
  else collapsed.add(key)
}

async function removeReference(id: number) {
  if (!(await appConfirm('Remover esta referência?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  camp.value.references = (camp.value.references || []).filter((r) => r.id !== id)
}

// Reordena manualmente as referências dentro do mesmo grupo (categoria/subcategoria).
// A ordem no array camp.references também define a ordem em "Referências Rápidas"
// no painel da ferramenta de Iniciativa.
function refGroup(r: Reference): Reference[] {
  const all = camp.value.references || []
  const p = r.catParent?.trim() || ''
  const c = r.catChild?.trim() || ''
  return all.filter((x) => (x.catParent?.trim() || '') === p && (x.catChild?.trim() || '') === c)
}
function moveReference(r: Reference, dir: -1 | 1) {
  const all = camp.value.references
  if (!all) return
  const group = refGroup(r)
  const pos = group.indexOf(r)
  const target = group[pos + dir]
  if (!target) return
  const i = all.indexOf(r)
  const j = all.indexOf(target)
  ;[all[i], all[j]] = [all[j], all[i]]
}

// Editar
const eImg = ref<HTMLInputElement | null>(null)
function openEdit(r: Reference) {
  edit.id = r.id
  edit.name = r.name
  edit.type = r.type
  edit.content = r.content
  edit.img = r.img || null
  edit.url = r.url || ''
  edit.catParent = r.catParent || ''
  edit.catChild = r.catChild || ''
  clearErrors(editErrors)
  ensureTableContent(edit)
  edit.open = true
  if (eImg.value) eImg.value.value = ''
}
async function saveEdit() {
  clearErrors(editErrors)
  const file = eImg.value?.files?.[0]
  const result = validateReferenceForm({
    name: edit.name,
    type: edit.type,
    content: edit.content,
    url: edit.url,
    hasImage: edit.type === 'imagem' ? !!(edit.img || file) : undefined
  })
  if (!result.ok) {
    Object.assign(editErrors, result.errors)
    toast.show(result.summary, 'error', 5500)
    focusFirstError(editErrors, 'edit')
    return
  }

  const r = (camp.value.references || []).find((x) => x.id === edit.id)
  if (!r) return
  const name = edit.name.trim() || r.name
  r.name = name
  r.type = edit.type
  r.content = edit.content.trim()
  r.url = edit.url.trim() || null
  r.catParent = edit.catParent.trim()
  r.catChild = edit.catChild.trim()
  if (file) r.img = await fileToDataUrl(file)
  edit.open = false
  toast.show(`Referência "${name}" atualizada.`, 'success')
}

// Visualizar imagem ampliada
const viewer = reactive({ open: false, name: '', img: null as string | null })

watch(
  () => edit.type,
  () => {
    if (edit.open) {
      ensureTableContent(edit)
      clearErrors(editErrors)
    }
  }
)

function openImage(r: Reference) {
  viewer.name = r.name
  viewer.img = r.img || null
  viewer.open = true
}
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Referências Rápidas</h2>

    <div v-if="showForm" class="card" style="margin-bottom: 1rem">
      <div class="fRow fRowVal">
        <div class="fGrp" data-ref-field="form-name" :class="{ hasError: !!formErrors.name }">
          <label>Nome <span class="req" title="Obrigatório">*</span></label>
          <input v-model="form.name" type="text" placeholder="Ex: Tabela de Saques, Regras de Queda..." />
          <p v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</p>
        </div>
        <div class="fGrp" style="max-width: 150px">
          <label>Tipo <span class="req" title="Obrigatório">*</span></label>
          <select v-model="form.type">
            <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
          </select>
        </div>
      </div>
      <div class="fRow">
        <div class="fGrp">
          <label>Categoria (pasta)</label>
          <CategorySelect
            v-model="form.catParent"
            :options="parentCats"
            create-label="+ Criar nova categoria..."
            modal-title="Nova categoria"
            modal-hint="A categoria será criada e já ficará selecionada nesta referência."
            name-placeholder="Ex: Combate, Regras..."
          />
        </div>
        <div class="fGrp">
          <label>Subcategoria (opcional)</label>
          <CategorySelect
            v-model="form.catChild"
            :options="formChildCats"
            create-label="+ Criar nova subcategoria..."
            modal-title="Nova subcategoria"
            modal-hint="A subcategoria será criada e já ficará selecionada nesta referência."
            name-placeholder="Ex: Taverna, Boss..."
            empty-label="— sem subcategoria —"
          />
        </div>
      </div>
      <div
        v-if="form.type === 'imagem'"
        data-ref-field="form-img"
        style="margin-bottom: 0.5rem"
        :class="{ hasError: !!formErrors.img }"
      >
        <label class="ulabel" @click="fImg?.click()">⬡ Clique para carregar imagem <span class="req" title="Obrigatório">*</span></label>
        <input ref="fImg" type="file" accept="image/*" @change="delete formErrors.img" />
        <p v-if="formErrors.img" class="fieldError">{{ formErrors.img }}</p>
      </div>
      <div
        v-if="form.type === 'musica'"
        class="fGrp"
        data-ref-field="form-url"
        style="margin-bottom: 0.6rem"
        :class="{ hasError: !!formErrors.url }"
      >
        <label>Link do YouTube <span class="req" title="Obrigatório">*</span></label>
        <input v-model="form.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
        <p v-if="formErrors.url" class="fieldError">{{ formErrors.url }}</p>
      </div>
      <div
        v-if="form.type === 'tabela'"
        class="fGrp"
        data-ref-field="form-content"
        style="margin-bottom: 0.6rem"
        :class="{ hasError: !!formErrors.content }"
      >
        <label>Tabela <span class="req" title="Obrigatório">*</span></label>
        <TableEditor v-model="form.content" />
        <p v-if="formErrors.content" class="fieldError">{{ formErrors.content }}</p>
      </div>
      <div
        v-else-if="form.type !== 'imagem' && form.type !== 'musica'"
        class="fGrp"
        data-ref-field="form-content"
        style="margin-bottom: 0.6rem"
        :class="{ hasError: !!formErrors.content }"
      >
        <label>
          Conteúdo
          <span v-if="isContentRequired(form.type)" class="req" title="Obrigatório">*</span>
        </label>
        <textarea v-model="form.content" style="min-height: 90px" :placeholder="contentHint(form.type)"></textarea>
        <p v-if="formErrors.content" class="fieldError">{{ formErrors.content }}</p>
      </div>
      <div v-else-if="form.type === 'imagem' || form.type === 'musica'" class="fGrp" style="margin-bottom: 0.6rem">
        <label>{{ form.type === 'imagem' ? 'Legenda (opcional)' : 'Descrição (opcional)' }}</label>
        <textarea v-model="form.content" style="min-height: 90px" :placeholder="contentHint(form.type)"></textarea>
      </div>
      <p
        v-if="contentHint(form.type) && form.type !== 'tabela'"
        style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); font-style: italic; margin-bottom: 0.6rem"
      >
        {{ contentHint(form.type) }}
      </p>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end">
        <button v-if="hasReferences" class="btn btnOut" type="button" @click="closeForm">Cancelar</button>
        <button class="btn btnRed" type="button" @click="addReference">+ Adicionar Referência</button>
      </div>
    </div>

    <div v-if="!showForm && hasReferences" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" type="button" @click="openForm">+ Nova referência</button>
    </div>

    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap">
      <input v-model="search" type="text" placeholder="⬡ Pesquisar por nome ou tipo..." style="flex: 1; max-width: 260px" />
      <select v-model="typeFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px; max-width: 160px">
        <option value="">Todos os Tipos</option>
        <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
      </select>
    </div>

    <div>
      <div v-if="!filtered.length" class="empty">Nenhuma referência.</div>
      <div v-for="(grp, gi) in grouped" :key="grp.parent" class="refFolder">
        <div class="refFolderHead" @click="toggleFolder(grp.parent)">
          <span class="refFolderCaret">{{ collapsed.has(grp.parent) ? '▸' : '▾' }}</span>
          <span class="refFolderName">📁 {{ grp.parent }}</span>
          <span class="refCount">{{ grp.children.reduce((n, s) => n + s.items.length, 0) }}</span>
          <span style="margin-left: auto; display: flex; gap: 0.3rem">
            <button class="btn btnOut sm" :disabled="gi === 0" title="Subir pasta" @click.stop="moveFolder(grp.parent, -1)">▲</button>
            <button class="btn btnOut sm" :disabled="gi === grouped.length - 1" title="Descer pasta" @click.stop="moveFolder(grp.parent, 1)">▼</button>
          </span>
        </div>
        <div v-show="!collapsed.has(grp.parent)" class="refFolderBody">
          <template v-for="(sub, si) in grp.children" :key="grp.parent + '/' + sub.child">
            <div v-if="sub.child" class="refSubHead" @click="toggleFolder(grp.parent + '/' + sub.child)">
              <span class="refFolderCaret">{{ collapsed.has(grp.parent + '/' + sub.child) ? '▸' : '▾' }}</span>
              <span>📂 {{ sub.child }}</span>
              <span class="refCount">{{ sub.items.length }}</span>
              <span style="margin-left: auto; display: flex; gap: 0.3rem">
                <button class="btn btnOut sm" :disabled="si === 0" title="Subir subcategoria" @click.stop="moveSub(grp.parent, sub.child, -1)">▲</button>
                <button class="btn btnOut sm" :disabled="si === grp.children.length - 1" title="Descer subcategoria" @click.stop="moveSub(grp.parent, sub.child, 1)">▼</button>
              </span>
            </div>
            <div v-show="!sub.child || !collapsed.has(grp.parent + '/' + sub.child)" :class="{ refSubBody: sub.child }">
              <div v-for="r in sub.items" :key="r.id" class="card" style="margin-bottom: 0.7rem">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem">
                  <span style="font-family: var(--fH); font-weight: 700; color: var(--red); font-size: 1.05rem">{{ r.name }}</span>
                  <span class="dtChip" style="border-color: var(--border); color: var(--muted)">{{ typeLabel(r.type) }}</span>
                  <span style="margin-left: auto; display: flex; gap: 0.4rem">
                    <button class="btn btnOut sm" :disabled="refGroup(r)[0] === r" title="Subir" @click="moveReference(r, -1)">▲</button>
                    <button class="btn btnOut sm" :disabled="refGroup(r)[refGroup(r).length - 1] === r" title="Descer" @click="moveReference(r, 1)">▼</button>
                    <button class="btn btnOut sm" @click="openEdit(r)">✏</button>
                    <button class="btn btnDng sm" @click="removeReference(r.id)">✕</button>
                  </span>
                </div>
                <ReferenceView :reference="r" @open-image="openImage" />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" :style="{ maxWidth: edit.type === 'tabela' ? '720px' : '520px', width: '94vw' }">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Referência</h3>
      <div class="fRow fRowVal">
        <div class="fGrp" data-ref-field="edit-name" :class="{ hasError: !!editErrors.name }">
          <label>Nome <span class="req" title="Obrigatório">*</span></label>
          <input v-model="edit.name" type="text" />
          <p v-if="editErrors.name" class="fieldError">{{ editErrors.name }}</p>
        </div>
        <div class="fGrp" style="max-width: 150px">
          <label>Tipo <span class="req" title="Obrigatório">*</span></label>
          <select v-model="edit.type">
            <option v-for="t in REF_TYPES" :key="t.k" :value="t.k">{{ t.l }}</option>
          </select>
        </div>
      </div>
      <div class="fRow">
        <div class="fGrp">
          <label>Categoria (pasta)</label>
          <CategorySelect
            v-model="edit.catParent"
            :options="parentCats"
            create-label="+ Criar nova categoria..."
            modal-title="Nova categoria"
            modal-hint="A categoria será criada e já ficará selecionada nesta referência."
          />
        </div>
        <div class="fGrp">
          <label>Subcategoria (opcional)</label>
          <CategorySelect
            v-model="edit.catChild"
            :options="editChildCats"
            create-label="+ Criar nova subcategoria..."
            modal-title="Nova subcategoria"
            modal-hint="A subcategoria será criada e já ficará selecionada nesta referência."
            empty-label="— sem subcategoria —"
          />
        </div>
      </div>
      <div
        v-if="edit.type === 'imagem'"
        data-ref-field="edit-img"
        style="margin-bottom: 0.5rem"
        :class="{ hasError: !!editErrors.img }"
      >
        <label class="ulabel" @click="eImg?.click()">
          ⬡ {{ edit.img ? 'Trocar imagem' : 'Carregar imagem' }}
          <span v-if="!edit.img" class="req" title="Obrigatório">*</span>
        </label>
        <input ref="eImg" type="file" accept="image/*" @change="delete editErrors.img" />
        <div v-if="edit.img" style="margin-top: 0.5rem; text-align: center">
          <img :src="edit.img" style="max-height: 120px; border-radius: 3px; border: 1px solid var(--border)" />
        </div>
        <p v-if="editErrors.img" class="fieldError">{{ editErrors.img }}</p>
      </div>
      <div
        v-if="edit.type === 'musica'"
        class="fGrp"
        data-ref-field="edit-url"
        style="margin-bottom: 0.6rem"
        :class="{ hasError: !!editErrors.url }"
      >
        <label>Link do YouTube <span class="req" title="Obrigatório">*</span></label>
        <input v-model="edit.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
        <p v-if="editErrors.url" class="fieldError">{{ editErrors.url }}</p>
      </div>
      <div
        v-if="edit.type === 'tabela'"
        class="fGrp"
        data-ref-field="edit-content"
        style="margin-bottom: 0.8rem"
        :class="{ hasError: !!editErrors.content }"
      >
        <label>Tabela <span class="req" title="Obrigatório">*</span></label>
        <TableEditor v-model="edit.content" />
        <p v-if="editErrors.content" class="fieldError">{{ editErrors.content }}</p>
      </div>
      <div
        v-else-if="edit.type !== 'imagem' && edit.type !== 'musica'"
        class="fGrp"
        data-ref-field="edit-content"
        style="margin-bottom: 0.8rem"
        :class="{ hasError: !!editErrors.content }"
      >
        <label>
          Conteúdo
          <span v-if="isContentRequired(edit.type)" class="req" title="Obrigatório">*</span>
        </label>
        <textarea v-model="edit.content" style="min-height: 110px" :placeholder="contentHint(edit.type)"></textarea>
        <p v-if="editErrors.content" class="fieldError">{{ editErrors.content }}</p>
      </div>
      <div v-else-if="edit.type === 'imagem' || edit.type === 'musica'" class="fGrp" style="margin-bottom: 0.8rem">
        <label>{{ edit.type === 'imagem' ? 'Legenda (opcional)' : 'Descrição (opcional)' }}</label>
        <textarea v-model="edit.content" style="min-height: 110px" :placeholder="contentHint(edit.type)"></textarea>
      </div>
      <div style="text-align: right"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>

  <ImagePopup :open="viewer.open" :name="viewer.name" :img="viewer.img" @close="viewer.open = false" />
</template>
