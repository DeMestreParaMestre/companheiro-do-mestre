<script setup lang="ts">
import { ref, reactive, watch, onMounted, defineAsyncComponent } from 'vue'
import { useCampaignStore } from './stores/campaign'
import { useSettingsStore } from './stores/settings'
import { useMusicPlayerStore } from './stores/musicPlayer'
import { useAuthStore } from './stores/auth'
import { useSyncStore } from './stores/sync'
import SyncConflictModal from './components/ui/SyncConflictModal.vue'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import AppFooter from './components/AppFooter.vue'
import DiceRoller from './components/ui/DiceRoller.vue'
import InitiativeSection from './components/sections/InitiativeSection.vue'
import ToastHost from './components/ui/ToastHost.vue'
import AppDialog from './components/ui/AppDialog.vue'
import WelcomeModal from './components/ui/WelcomeModal.vue'
import TourGuide from './components/ui/TourGuide.vue'

// Seções fora da aba inicial: baixadas e montadas só na primeira abertura, depois ficam vivas.
const FichasSection = defineAsyncComponent(() => import('./components/sections/FichasSection.vue'))
const PersonagensSection = defineAsyncComponent(() => import('./components/sections/PersonagensSection.vue'))
const ItensSection = defineAsyncComponent(() => import('./components/sections/ItensSection.vue'))
const SpellsSection = defineAsyncComponent(() => import('./components/sections/SpellsSection.vue'))
const MusicSection = defineAsyncComponent(() => import('./components/sections/MusicSection.vue'))
const ReferencesSection = defineAsyncComponent(() => import('./components/sections/ReferencesSection.vue'))
const DiarySection = defineAsyncComponent(() => import('./components/sections/DiarySection.vue'))

const store = useCampaignStore()
useSettingsStore()
const player = useMusicPlayerStore()
const active = ref('sInit')
const ready = ref(false)
const opened = reactive(new Set<string>())
watch(active, (id) => opened.add(id), { immediate: true })
// O host do player do YouTube vive em Músicas: monta a seção se algo tocar pela Iniciativa.
watch(
  () => player.isActive,
  (on) => on && opened.add('sMusic')
)

const auth = useAuthStore()
const sync = useSyncStore()

onMounted(async () => {
  await Promise.all([store.init(), auth.init()])
  // Logado: baixa da nuvem antes de liberar a edição (evita editar versão velha deste navegador).
  if (auth.user) await Promise.race([sync.start(), new Promise((r) => setTimeout(r, 8000))])
  ready.value = true
})
</script>

<template>
  <AppHeader />
  <AppNav :active="active" @change="active = $event" />
  <template v-if="ready">
    <InitiativeSection :active="active === 'sInit'" />
    <FichasSection v-if="opened.has('sFichas')" :active="active === 'sFichas'" />
    <PersonagensSection v-if="opened.has('sPJs')" :active="active === 'sPJs'" />
    <ItensSection v-if="opened.has('sItens')" :active="active === 'sItens'" />
    <SpellsSection v-if="opened.has('sSpells')" :active="active === 'sSpells'" />
    <MusicSection v-if="opened.has('sMusic')" :active="active === 'sMusic'" />
    <ReferencesSection v-if="opened.has('sRefs')" :active="active === 'sRefs'" />
    <DiarySection v-if="opened.has('sDiary')" :active="active === 'sDiary'" />
  </template>
  <div v-else class="empty">⟳ Sincronizando campanhas…</div>
  <AppFooter />
  <DiceRoller />
  <ToastHost />
  <SyncConflictModal />
  <AppDialog />
  <WelcomeModal v-if="ready" />
  <TourGuide />
</template>