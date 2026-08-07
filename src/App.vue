<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCampaignStore } from './stores/campaign'
import { useSettingsStore } from './stores/settings'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import DiceRoller from './components/ui/DiceRoller.vue'
import InitiativeSection from './components/sections/InitiativeSection.vue'
import FichasSection from './components/sections/FichasSection.vue'
import PersonagensSection from './components/sections/PersonagensSection.vue'
import ItensSection from './components/sections/ItensSection.vue'
import SpellsSection from './components/sections/SpellsSection.vue'
import MusicSection from './components/sections/MusicSection.vue'
import ReferencesSection from './components/sections/ReferencesSection.vue'
import DiarySection from './components/sections/DiarySection.vue'
import ToastHost from './components/ui/ToastHost.vue'

const store = useCampaignStore()
useSettingsStore()
const active = ref('sInit')
const ready = ref(false)

onMounted(async () => {
  await store.init()
  ready.value = true
})
</script>

<template>
  <AppHeader />
  <AppNav :active="active" @change="active = $event" />
  <template v-if="ready">
    <InitiativeSection :active="active === 'sInit'" />
    <FichasSection :active="active === 'sFichas'" />
    <PersonagensSection :active="active === 'sPJs'" />
    <ItensSection :active="active === 'sItens'" />
    <SpellsSection :active="active === 'sSpells'" />
    <MusicSection :active="active === 'sMusic'" />
    <ReferencesSection :active="active === 'sRefs'" />
    <DiarySection :active="active === 'sDiary'" />
  </template>
  <DiceRoller />
  <ToastHost />
</template>
