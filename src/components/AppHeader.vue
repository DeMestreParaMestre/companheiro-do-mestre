<script setup lang="ts">
import { ref } from 'vue'
import { useCampaignStore } from '../stores/campaign'
import { useSettingsStore } from '../stores/settings'
import type { PersistedData } from '../types'
import * as gdrive from '../utils/gdrive'
import BaseModal from './ui/BaseModal.vue'
import { appAlert, appConfirm } from '../composables/useAppDialog'

const store = useCampaignStore()
const settings = useSettingsStore()

const showNewCamp = ref(false)
const showRenameCamp = ref(false)
const showDeleteCamp = ref(false)
const newCampName = ref('')
const renameCampInput = ref('')
const importInput = ref<HTMLInputElement | null>(null)

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

// ----- Nuvem (Google Drive) -----
const showCloud = ref(false)
const cloudConfigured = gdrive.isConfigured()
const cloudToken = ref<string | null>(null)
const cloudBusy = ref(false)
const cloudMsg = ref('')

async function cloudConnect() {
  cloudBusy.value = true
  cloudMsg.value = ''
  try {
    cloudToken.value = await gdrive.connect()
    cloudMsg.value = '✔ Conectado ao Google Drive.'
  } catch (e) {
    cloudMsg.value = e instanceof Error ? e.message : 'Falha ao conectar.'
  } finally {
    cloudBusy.value = false
  }
}
async function cloudUpload() {
  if (!cloudToken.value) return
  cloudBusy.value = true
  cloudMsg.value = ''
  try {
    await gdrive.upload(cloudToken.value, store.serialize())
    cloudMsg.value = '✔ Backup enviado ao Drive (' + new Date().toLocaleTimeString('pt-BR') + ').'
  } catch (e) {
    cloudMsg.value = e instanceof Error ? e.message : 'Falha ao enviar.'
  } finally {
    cloudBusy.value = false
  }
}
async function cloudRestore() {
  if (!cloudToken.value) return
  if (
    !(await appConfirm('Restaurar o backup da nuvem substituirá os dados atuais. Continuar?', {
      title: 'Restaurar backup',
      confirmLabel: 'Restaurar',
      danger: true
    }))
  )
    return
  cloudBusy.value = true
  cloudMsg.value = ''
  try {
    const content = await gdrive.download(cloudToken.value)
    if (!content) {
      cloudMsg.value = 'Nenhum backup encontrado na nuvem.'
      return
    }
    store.importData(JSON.parse(content) as PersistedData)
    cloudMsg.value = '✔ Backup restaurado!'
  } catch (e) {
    cloudMsg.value = e instanceof Error ? e.message : 'Falha ao restaurar.'
  } finally {
    cloudBusy.value = false
  }
}

function onImport(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  const r = new FileReader()
  r.onload = (ev) => {
    try {
      const d = JSON.parse(ev.target?.result as string) as PersistedData
      store.importData(d)
      void appAlert('Importado!', { title: 'Importação' })
    } catch {
      void appAlert('Arquivo inválido.')
    }
  }
  r.readAsText(f)
  input.value = ''
}
</script>

<template>
  <div class="header">
    <div class="d20">⬡ ⬡ ⬡</div>
    <h1 class="title">COMPANHEIRO DO MESTRE</h1>
    <p class="subtitle">Ferramentas para a sua Mesa de RPG</p>
    <div class="hRule"></div>
    <div class="campBar">
      <span class="campLabel">⬡ Campanha:</span>
      <select class="campSel" :value="store.activeId" @change="onSwitch">
        <option v-for="c in store.campaigns" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btnOut sm" @click="openNewCamp">+ Nova</button>
      <button class="btn btnOut sm" @click="openRenameCamp">✏</button>
      <button class="btn btnDng sm" @click="openDeleteCamp">✕ Apagar</button>
    </div>
    <div class="hActions">
      <button class="btn btnOut sm" @click="store.exportData()">⬡ Exportar</button>
      <button class="btn btnOut sm" @click="importInput?.click()">⬡ Importar</button>
      <input ref="importInput" type="file" accept=".json" @change="onImport" />
      <button class="btn btnOut sm" @click="showCloud = true">☁ Nuvem</button>
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

  <BaseModal :open="showCloud" @close="showCloud = false">
    <div class="modal" style="max-width: 440px; width: 90vw">
      <button class="mClose" @click="showCloud = false">✕</button>
      <h3>☁ Backup na Nuvem</h3>
      <template v-if="!cloudConfigured">
        <p style="font-family: var(--fB); font-size: 0.9rem; line-height: 1.6">
          A sincronização com o Google Drive ainda não foi configurada. Defina a variável de ambiente
          <code>VITE_GOOGLE_CLIENT_ID</code> com o seu OAuth Client ID (veja o <strong>README</strong>) e reconstrua o app.
        </p>
      </template>
      <template v-else>
        <p style="font-family: var(--fB); font-size: 0.9rem; line-height: 1.6; margin-bottom: 0.8rem">
          Guarde um backup das suas campanhas na sua conta Google (pasta privada do app).
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
          <button v-if="!cloudToken" class="btn btnRed" :disabled="cloudBusy" @click="cloudConnect">Conectar</button>
          <template v-else>
            <button class="btn btnRed" :disabled="cloudBusy" @click="cloudUpload">⬆ Enviar backup</button>
            <button class="btn btnOut" :disabled="cloudBusy" @click="cloudRestore">⬇ Restaurar</button>
          </template>
        </div>
      </template>
      <p v-if="cloudMsg" style="font-family: var(--fN); font-size: 0.8rem; color: var(--muted); margin-top: 0.8rem">{{ cloudMsg }}</p>
    </div>
  </BaseModal>
</template>
