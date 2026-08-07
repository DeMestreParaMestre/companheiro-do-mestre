<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import {
  parseTableContent,
  serializeTableContent,
  colLabel,
  type RefTableData,
  type CellAlign
} from '../../utils/refTable'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const rootRef = ref<HTMLElement | null>(null)
const data = ref<RefTableData>(parseTableContent(props.modelValue))

const sel = reactive({ r1: 0, c1: 0, r2: 0, c2: 0 })
const drag = reactive({ active: false, moved: false })

const colCount = computed(() => data.value.cells[0]?.length || 0)
const colLabels = computed(() => Array.from({ length: colCount.value }, (_, i) => colLabel(i)))

function selBounds() {
  return {
    rMin: Math.min(sel.r1, sel.r2),
    rMax: Math.max(sel.r1, sel.r2),
    cMin: Math.min(sel.c1, sel.c2),
    cMax: Math.max(sel.c1, sel.c2)
  }
}

const selectionCount = computed(() => {
  const { rMin, rMax, cMin, cMax } = selBounds()
  return (rMax - rMin + 1) * (cMax - cMin + 1)
})

const selAlign = computed(() => {
  const { rMin, rMax, cMin, cMax } = selBounds()
  let first: CellAlign | null = null
  for (let ri = rMin; ri <= rMax; ri++) {
    for (let ci = cMin; ci <= cMax; ci++) {
      const a = data.value.align[ri]?.[ci] || 'left'
      if (first === null) first = a
      else if (first !== a) return null
    }
  }
  return first
})

watch(
  () => props.modelValue,
  (v) => {
    data.value = parseTableContent(v)
    clampSelection()
  }
)

function clampSelection() {
  const rows = data.value.cells.length
  const cols = data.value.cells[0]?.length || 1
  sel.r1 = Math.min(sel.r1, rows - 1)
  sel.r2 = Math.min(sel.r2, rows - 1)
  sel.c1 = Math.min(sel.c1, cols - 1)
  sel.c2 = Math.min(sel.c2, cols - 1)
}

function setSelection(r1: number, c1: number, r2: number, c2: number) {
  sel.r1 = r1
  sel.c1 = c1
  sel.r2 = r2
  sel.c2 = c2
}

function isInSelection(ri: number, ci: number) {
  const { rMin, rMax, cMin, cMax } = selBounds()
  return ri >= rMin && ri <= rMax && ci >= cMin && ci <= cMax
}

function isRowInSelection(ri: number) {
  const { rMin, rMax } = selBounds()
  return ri >= rMin && ri <= rMax
}

function isColInSelection(ci: number) {
  const { cMin, cMax } = selBounds()
  return ci >= cMin && ci <= cMax
}

function isActiveCell(ri: number, ci: number) {
  return sel.r2 === ri && sel.c2 === ci
}

function sync() {
  emit('update:modelValue', serializeTableContent(data.value))
}

function focusCell(ri: number, ci: number) {
  rootRef.value?.querySelector<HTMLInputElement>(`[data-cell="${ri}-${ci}"]`)?.focus()
}

function onCellMouseDown(ri: number, ci: number, e: MouseEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  drag.active = true
  drag.moved = false
  setSelection(ri, ci, ri, ci)
}

function onCellMouseEnter(ri: number, ci: number) {
  if (!drag.active) return
  if (ri !== sel.r2 || ci !== sel.c2) drag.moved = true
  sel.r2 = ri
  sel.c2 = ci
}

function onDocumentMouseUp() {
  if (!drag.active) return
  drag.active = false
  if (!drag.moved) focusCell(sel.r1, sel.c1)
}

onMounted(() => document.addEventListener('mouseup', onDocumentMouseUp))
onBeforeUnmount(() => document.removeEventListener('mouseup', onDocumentMouseUp))

function onCellInput(ri: number, ci: number, e: Event) {
  data.value.cells[ri][ci] = (e.target as HTMLInputElement).value
  sync()
}

function onCellFocus(ri: number, ci: number) {
  if (!drag.active) setSelection(ri, ci, ri, ci)
}

function addRow() {
  const cols = colCount.value
  data.value.cells.push(Array.from({ length: cols }, () => ''))
  data.value.align.push(Array.from({ length: cols }, () => 'left' as CellAlign))
  sync()
}

function addCol() {
  for (let ri = 0; ri < data.value.cells.length; ri++) {
    data.value.cells[ri].push('')
    data.value.align[ri].push('left')
  }
  sync()
}

function delRow() {
  if (data.value.cells.length <= 1) return
  const { rMin, rMax } = selBounds()
  if (rMin === rMax) {
    data.value.cells.splice(rMin, 1)
    data.value.align.splice(rMin, 1)
  } else {
    data.value.cells.splice(rMin, rMax - rMin + 1)
    data.value.align.splice(rMin, rMax - rMin + 1)
  }
  clampSelection()
  sync()
}

function delCol() {
  if (colCount.value <= 1) return
  const { cMin, cMax } = selBounds()
  if (cMin === cMax) {
    for (const row of data.value.cells) row.splice(cMin, 1)
    for (const row of data.value.align) row.splice(cMin, 1)
  } else {
    for (const row of data.value.cells) row.splice(cMin, cMax - cMin + 1)
    for (const row of data.value.align) row.splice(cMin, cMax - cMin + 1)
  }
  clampSelection()
  sync()
}

function setAlign(align: CellAlign) {
  const { rMin, rMax, cMin, cMax } = selBounds()
  for (let ri = rMin; ri <= rMax; ri++) {
    for (let ci = cMin; ci <= cMax; ci++) {
      data.value.align[ri][ci] = align
    }
  }
  sync()
}

function onTab(ri: number, ci: number, e: KeyboardEvent) {
  const cols = colCount.value
  const rows = data.value.cells.length
  let nr = ri
  let nc = ci + (e.shiftKey ? -1 : 1)
  if (nc >= cols) {
    nc = 0
    nr++
  } else if (nc < 0) {
    nc = cols - 1
    nr--
  }
  if (nr < 0 || nr >= rows) return
  setSelection(nr, nc, nr, nc)
  focusCell(nr, nc)
}
</script>

<template>
  <div ref="rootRef" class="tableEditor" :class="{ tableEditorDragging: drag.active }">
    <div class="tableEditorToolbar">
      <button type="button" class="btn btnOut sm" @click="addRow">+ Linha</button>
      <button type="button" class="btn btnOut sm" @click="addCol">+ Coluna</button>
      <button type="button" class="btn btnOut sm" :disabled="data.cells.length <= 1" title="Remove a(s) linha(s) selecionada(s)" @click="delRow">
        − Linha
      </button>
      <button type="button" class="btn btnOut sm" :disabled="colCount <= 1" title="Remove a(s) coluna(s) selecionada(s)" @click="delCol">
        − Coluna
      </button>
      <span class="tableEditorSep" />
      <span class="tableEditorAlignLbl">
        Alinhar{{ selectionCount > 1 ? ' seleção (' + selectionCount + ')' : '' }}:
      </span>
      <button
        type="button"
        class="btn btnOut sm"
        :class="{ tableEditorAlignActive: selAlign === 'left' }"
        title="Esquerda"
        @click="setAlign('left')"
      >
        ⬅
      </button>
      <button
        type="button"
        class="btn btnOut sm"
        :class="{ tableEditorAlignActive: selAlign === 'center' }"
        title="Centro"
        @click="setAlign('center')"
      >
        ⊙
      </button>
      <button
        type="button"
        class="btn btnOut sm"
        :class="{ tableEditorAlignActive: selAlign === 'right' }"
        title="Direita"
        @click="setAlign('right')"
      >
        ➡
      </button>
    </div>
    <div class="tableEditorScroll">
      <table class="tableEditorGrid">
        <thead>
          <tr>
            <th class="tableEditorCorner" />
            <th v-for="(label, ci) in colLabels" :key="label + ci" class="tableEditorColHead" :class="{ tableEditorHeadInRange: isColInSelection(ci) }">
              {{ label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in data.cells" :key="ri">
            <th class="tableEditorRowHead" :class="{ tableEditorHeadInRange: isRowInSelection(ri) }">{{ ri + 1 }}</th>
            <td
              v-for="(cell, ci) in row"
              :key="ci"
              class="tableEditorCellWrap"
              :class="{
                tableEditorCellInRange: isInSelection(ri, ci),
                tableEditorCellActive: isActiveCell(ri, ci),
                tableEditorHeaderRow: ri === 0
              }"
              @mousedown="onCellMouseDown(ri, ci, $event)"
              @mouseenter="onCellMouseEnter(ri, ci)"
            >
              <input
                :data-cell="`${ri}-${ci}`"
                :value="cell"
                type="text"
                class="tableEditorCell"
                :style="{ textAlign: data.align[ri][ci] }"
                @input="onCellInput(ri, ci, $event)"
                @focus="onCellFocus(ri, ci)"
                @keydown.tab.prevent="onTab(ri, ci, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="tableEditorHint">
      A 1ª linha é o cabeçalho · Clique e arraste para selecionar várias células · Tab avança célula
    </p>
  </div>
</template>
