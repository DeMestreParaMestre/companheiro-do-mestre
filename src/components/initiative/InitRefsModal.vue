<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { REF_TYPES } from '../../constants'
import type { Reference } from '../../types'
import { useCampaignStore } from '../../stores/campaign'
import { groupReferences } from '../../utils/refGroups'
import BaseModal from '../ui/BaseModal.vue'
import ReferenceView from '../ui/ReferenceView.vue'

const emit = defineEmits<{
  openImage: [ref: Reference]
}>()

const store = useCampaignStore()
const camp = computed(() => store.activeCampaign)

const refPanel = ref(false)
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

const groupedRefs = computed(() => groupReferences(filteredRefs.value, camp.value.refCatOrder || [], camp.value.refSubOrder || {}))
const refCollapsed = reactive(new Set<string>())
function toggleRefFolder(key: string) {
  if (refCollapsed.has(key)) refCollapsed.delete(key)
  else refCollapsed.add(key)
}

function open() {
  refPanel.value = true
}

defineExpose({ open })
</script>

<template>
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
                    <ReferenceView :reference="r" @open-image="$emit('openImage', $event)" />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
