<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { searchSpells, fetchSources, type Spell, type SourceDoc } from '../../utils/spells'

const props = defineProps<{ active: boolean }>()

const system = ref('') // '' = todos | '5e-2014' | '5e-2024'
const sourceKey = ref('') // '' = todas as fontes do sistema | chave de documento
const query = ref('')
const results = ref<Spell[]>([])
const loading = ref(false)
const error = ref('')
const loaded = ref(false)
const sources = ref<SourceDoc[]>([])
const openKeys = reactive(new Set<string>())

// Fontes disponíveis para o sistema escolhido (ou todas, se sistema = todos).
const filteredSources = computed(() =>
  system.value ? sources.value.filter((s) => s.gamesystemKey === system.value) : sources.value
)

const currentFilter = computed(() => {
  if (sourceKey.value) return 'document__key=' + sourceKey.value
  if (system.value) return 'document__gamesystem__key=' + system.value
  return ''
})

const scopeLabel = computed(() => {
  if (sourceKey.value) return sources.value.find((s) => s.key === sourceKey.value)?.name || 'fonte selecionada'
  if (system.value === '5e-2014') return 'todas as fontes de 5ª Edição 2014'
  if (system.value === '5e-2024') return 'todas as fontes de 5ª Edição 2024'
  return 'todas as fontes disponíveis'
})

async function run() {
  loading.value = true
  error.value = ''
  try {
    results.value = await searchSpells(query.value, currentFilter.value)
    loaded.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Erro na busca.'
  } finally {
    loading.value = false
  }
}

function toggle(key: string) {
  if (openKeys.has(key)) openKeys.delete(key)
  else openKeys.add(key)
}

// Ao trocar o sistema, reseta a fonte (que pode não pertencer ao novo sistema) e rebusca.
watch(system, () => {
  sourceKey.value = ''
  if (loaded.value) run()
})
watch(sourceKey, () => {
  if (loaded.value) run()
})

onMounted(async () => {
  try {
    sources.value = await fetchSources()
  } catch {
    /* segue sem lista de fontes; ainda dá para buscar por sistema */
  }
  if (props.active) run()
})
watch(
  () => props.active,
  (a) => {
    if (a && !loaded.value) run()
  }
)
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Magias (SRD)</h2>

    <div class="card">
      <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap">
        <div class="fGrp" style="max-width: 150px">
          <label>Sistema</label>
          <select v-model="system">
            <option value="">Todos</option>
            <option value="5e-2014">5ª Edição 2014</option>
            <option value="5e-2024">5ª Edição 2024</option>
          </select>
        </div>
        <div class="fGrp" style="max-width: 240px">
          <label>Fonte</label>
          <select v-model="sourceKey">
            <option value="">Todas as fontes</option>
            <option v-for="s in filteredSources" :key="s.key" :value="s.key">{{ s.name }}</option>
          </select>
        </div>
        <div class="fGrp" style="flex: 1; min-width: 160px">
          <label>Buscar magia</label>
          <input v-model="query" type="text" placeholder="Ex: Fireball, Cure Wounds..." @keyup.enter="run" />
        </div>
        <button class="btn btnRed" :disabled="loading" @click="run">{{ loading ? 'Buscando...' : '⬡ Buscar' }}</button>
      </div>
      <p style="font-family: var(--fN); font-size: 0.72rem; color: var(--muted); margin-top: 0.4rem; font-style: italic">
        Buscando em {{ scopeLabel }}. Deixe a busca vazia para listar as primeiras 50.
      </p>
    </div>

    <div v-if="error" class="empty" style="color: var(--red)">{{ error }}</div>
    <div v-else-if="loading && !results.length" class="empty">Carregando...</div>
    <div v-else>
      <div v-if="!results.length" class="empty">Nenhuma magia encontrada.</div>
      <div v-for="sp in results" :key="sp.key" class="dEntry">
        <div class="dHead" @click="toggle(sp.key)">
          <div style="flex: 1">
            <div class="dTitleT">{{ sp.name }}</div>
            <div class="dDate">
              {{ sp.levelLabel }}<span v-if="sp.school"> · {{ sp.school }}</span>
              <span v-if="sp.concentration"> · Concentração</span><span v-if="sp.ritual"> · Ritual</span>
            </div>
          </div>
          <span
            class="dtChip"
            :title="sp.sourceName"
            :style="
              sp.editionKey === '5e-2024'
                ? 'background:#1a6b2a;color:#fff;border-color:#1a6b2a'
                : sp.editionKey === '5e-2014'
                  ? 'background:#8b0000;color:#fff;border-color:#8b0000'
                  : 'border-color:var(--border);color:var(--muted)'
            "
            @click.stop
            >{{ sp.edition || 'Fonte' }}</span
          >
          <span style="color: var(--border); font-size: 0.9rem">▾</span>
        </div>
        <div class="dBody" :class="{ open: openKeys.has(sp.key) }">
          <hr style="border: none; border-top: 1px solid var(--border); margin: 0.55rem 0" />
          <div style="display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; font-family: var(--fB); font-size: 0.9rem; margin-bottom: 0.5rem">
            <span><strong>Conjuração:</strong> {{ sp.castingTime }}</span>
            <span><strong>Alcance:</strong> {{ sp.range }}</span>
            <span><strong>Duração:</strong> {{ sp.duration }}</span>
            <span v-if="sp.components"><strong>Componentes:</strong> {{ sp.components }}</span>
            <span v-if="sp.save"><strong>Salvaguarda:</strong> {{ sp.save }}</span>
            <span v-if="sp.classes.length"><strong>Classes:</strong> {{ sp.classes.join(', ') }}</span>
          </div>
          <div style="font-family: var(--fB); font-size: 0.92rem; line-height: 1.65; white-space: pre-wrap">{{ sp.desc }}</div>
          <div v-if="sp.higherLevel" style="font-family: var(--fB); font-size: 0.9rem; line-height: 1.6; margin-top: 0.5rem">
            <strong>Em níveis superiores.</strong> {{ sp.higherLevel }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
