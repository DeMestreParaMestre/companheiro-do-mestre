<script setup lang="ts">
import { ref } from 'vue'
import { useCampaignStore } from '../stores/campaign'
import { useSettingsStore } from '../stores/settings'
import type { PersistedData } from '../types'
import BaseModal from './ui/BaseModal.vue'
import AccountMenu from './ui/AccountMenu.vue'
import { appAlert, appConfirm } from '../composables/useAppDialog'
import { tourOpen } from '../composables/useTour'

const store = useCampaignStore()
const settings = useSettingsStore()

const showNewCamp = ref(false)
const showRenameCamp = ref(false)
const showDeleteCamp = ref(false)
const newCampName = ref('')
const renameCampInput = ref('')
const importInput = ref<HTMLInputElement | null>(null)

function openGuide() {
  tourOpen.value = true
}

function onSwitch(e: Event) {
  store.switchCamp((e.target as HTMLSelectElement).value)
}

function openNewCamp() {
  newCampName.value = ''
  showNewCamp.value = true
}
async function createCamp() {
  if (!newCampName.value.trim()) {
    await appAlert('Digite o nome!')
    return
  }
  store.createCamp(newCampName.value)
  showNewCamp.value = false
}

function openRenameCamp() {
  renameCampInput.value = store.activeCampaign.name
  showRenameCamp.value = true
}
function renameCamp() {
  if (!renameCampInput.value.trim()) return
  store.renameCamp(renameCampInput.value)
  showRenameCamp.value = false
}

async function openDeleteCamp() {
  if (store.campaigns.length <= 1) {
    await appAlert('Não é possível apagar a única campanha.')
    return
  }
  showDeleteCamp.value = true
}
function confirmDeleteCamp() {
  store.deleteCamp()
  showDeleteCamp.value = false
}

function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  input.value = ''
  f.text().then(async (text) => {
    let d: PersistedData
    try {
      d = JSON.parse(text) as PersistedData
    } catch {
      await appAlert('Arquivo inválido.')
      return
    }
    if (
      !(await appConfirm('Importar este arquivo substituirá todas as campanhas atuais. Continuar?', {
        title: 'Importar backup',
        confirmLabel: 'Importar',
        danger: true
      }))
    )
      return
    try {
      store.importData(d)
      await appAlert('Importado!', { title: 'Importação' })
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : 'Arquivo inválido.')
    }
  })
}
</script>

<template>
  <div class="header">
    <AccountMenu />
    <div class="d20">⬡ ⬡ ⬡</div>
    <h1 class="title">COMPANHEIRO DO MESTRE</h1>
    <p class="subtitle">Ferramentas para a sua Mesa de RPG</p>
    <div class="hRule"></div>
    <div class="campBar" data-tour="camp">
      <span class="campLabel">⬡ Campanha:</span>
      <select class="campSel" :value="store.activeId" @change="onSwitch">
        <option v-for="c in store.campaigns" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btnOut sm" @click="openNewCamp">+ Nova</button>
      <button class="btn btnOut sm" @click="openRenameCamp">✏</button>
      <button class="btn btnDng sm" @click="openDeleteCamp">✕ Apagar</button>
    </div>
    <div class="hActions" data-tour="actions">
      <button class="btn btnOut sm" title="Tour pelas ferramentas" @click="openGuide">? Guia</button>
      <button class="btn btnOut sm" @click="store.exportData()">⬡ Exportar</button>
      <button class="btn btnOut sm" @click="importInput?.click()">⬡ Importar</button>
      <input ref="importInput" type="file" accept=".json" @change="onImport" />
      <button class="btn btnOut sm" :title="settings.theme === 'dark' ? 'Tema claro' : 'Tema escuro'" @click="settings.toggleTheme()">
        {{ settings.theme === 'dark' ? '☀ Claro' : '☾ Escuro' }}
      </button>
    </div>
    <div class="storageStatus">{{ store.storageStatus }}</div>
    <div class="hStripe"></div>
  </div>

  <BaseModal :open="showNewCamp" @close="showNewCamp = false">
    <div class="modal" style="max-width: 380px; width: 90vw">
      <button class="mClose" @click="showNewCamp = false">✕</button>
      <h3>Nova Campanha</h3>
      <div class="fGrp" style="margin-bottom: 0.8rem">
        <label>Nome</label>
        <input v-model="newCampName" type="text" placeholder="Ex: A Maldição de Salthar" @keyup.enter="createCamp" />
      </div>
      <button class="btn btnRed" @click="createCamp">+ Criar</button>
    </div>
  </BaseModal>

  <BaseModal :open="showRenameCamp" @close="showRenameCamp = false">
    <div class="modal" style="max-width: 380px; width: 90vw">
      <button class="mClose" @click="showRenameCamp = false">✕</button>
      <h3>Renomear Campanha</h3>
      <div class="fGrp" style="margin-bottom: 0.8rem">
        <label>Novo Nome</label>
        <input v-model="renameCampInput" type="text" @keyup.enter="renameCamp" />
      </div>
      <button class="btn btnRed" @click="renameCamp">Salvar</button>
    </div>
  </BaseModal>

  <BaseModal :open="showDeleteCamp" @close="showDeleteCamp = false">
    <div class="modal" style="max-width: 400px; width: 90vw; text-align: center">
      <h3 style="color: var(--red); margin-bottom: 0.7rem">⚠ Apagar Campanha</h3>
      <p style="font-family: var(--fB); font-size: 0.95rem; margin-bottom: 1.2rem; line-height: 1.6">
        Deseja apagar "{{ store.activeCampaign?.name }}"? Todos os dados serão perdidos.
      </p>
      <div style="display: flex; gap: 0.7rem; justify-content: center">
        <button class="btn btnOut" @click="showDeleteCamp = false">Cancelar</button>
        <button class="btn btnDng" @click="confirmDeleteCamp">Sim, apagar</button>
      </div>
    </div>
  </BaseModal>

</template>
