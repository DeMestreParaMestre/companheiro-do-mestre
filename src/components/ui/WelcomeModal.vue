<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { DEV_CAMPAIGN_ID } from '../../stores/sync'
import { isEmptyCampaign } from '../../utils/syncPlan'
import { tourOpen } from '../../composables/useTour'
import BaseModal from './BaseModal.vue'

const DONE_KEY = 'nc_onboarded'
const store = useCampaignStore()
const open = ref(false)
const name = ref('')
const busy = ref(false)

const realCampaigns = () => store.campaigns.filter((c) => c.id !== DEV_CAMPAIGN_ID)

onMounted(() => {
  open.value = !localStorage.getItem(DONE_KEY) && realCampaigns().every(isEmptyCampaign)
})

/** Campanha vazia a reaproveitar (mantém o id: nada de campanha fantasma na nuvem). */
function emptyTarget() {
  const c = realCampaigns().find(isEmptyCampaign)
  if (c) return c
  store.createCamp('Campanha Principal')
  return store.activeCampaign
}

function finish(tour: boolean) {
  localStorage.setItem(DONE_KEY, '1')
  open.value = false
  if (tour) tourOpen.value = true
}

function startFresh() {
  const c = emptyTarget()
  if (name.value.trim()) c.name = name.value.trim()
  store.switchCamp(c.id)
  finish(true)
}

async function loadSample() {
  busy.value = true
  try {
    const { createDevSeedCampaign } = await import('../../dev/seedCampaign')
    const c = emptyTarget()
    // As músicas da sandbox são links de teste: o exemplo começa sem trilha.
    Object.assign(c, { ...createDevSeedCampaign(), id: c.id, name: 'Campanha de Exemplo', songs: [], playlists: [] })
    store.switchCamp(c.id)
    finish(true)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BaseModal :open="open" @close="finish(false)">
    <div class="modal welcome">
      <button class="mClose" aria-label="Fechar" @click="finish(false)">✕</button>
      <header class="wHead">
        <div class="wSeal" aria-hidden="true">🎲</div>
        <h3>Bem-vindo, Mestre!</h3>
        <p>O Companheiro do Mestre reúne iniciativa, fichas, magias, trilha sonora e anotações da sua mesa em um só lugar.</p>
      </header>

      <div class="wOptions">
        <form class="wCard" @submit.prevent="startFresh">
          <strong>📜 Começar minha campanha</strong>
          <small>Dê um nome e comece a cadastrar personagens, monstros e sessões.</small>
          <input v-model="name" type="text" maxlength="60" placeholder="Ex: A Maldição de Salthar" aria-label="Nome da campanha" />
          <button type="submit" class="btn btnRed">Criar campanha</button>
        </form>

        <div class="wCard">
          <strong>✨ Explorar um exemplo</strong>
          <small>Uma campanha pronta, com combate em andamento, fichas, personagens, itens e diário, para ver tudo funcionando.</small>
          <button type="button" class="btn btnOut" :disabled="busy" @click="loadSample">{{ busy ? 'Carregando…' : 'Carregar exemplo' }}</button>
        </div>
      </div>

      <p class="wFoot">
        Em seguida, um tour rápido mostra cada ferramenta.
        <a href="#" @click.prevent="finish(false)">Pular por enquanto</a>
      </p>
    </div>
  </BaseModal>
</template>

<style scoped>
.welcome {
  width: 600px;
  max-width: 94vw;
  padding: 1.6rem 1.7rem 1.3rem;
}
.welcome::before {
  margin: -1.6rem -1.7rem 1.1rem;
}
.wHead {
  text-align: center;
  margin-bottom: 1.1rem;
}
.wSeal {
  font-size: 2rem;
  margin-bottom: 0.3rem;
}
.wHead h3 {
  font-size: 1.5rem;
  margin-bottom: 0.3rem;
}
.wHead p {
  font-family: var(--fH);
  font-style: italic;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--muted);
}
.wOptions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.8rem;
}
.wCard {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9rem;
  background: var(--light);
  border: 1.5px solid var(--border);
  border-top: 3px solid var(--red);
  border-radius: 4px;
}
.wCard strong {
  font-family: var(--fH);
  font-size: 1.08rem;
  color: var(--red);
}
.wCard small {
  flex: 1;
  font-family: var(--fN);
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--muted);
}
.wCard input {
  padding: 0.5rem 0.65rem;
}
.wFoot {
  margin-top: 1rem;
  text-align: center;
  font-family: var(--fN);
  font-size: 0.78rem;
  color: var(--muted);
}
.wFoot a {
  margin-left: 0.3rem;
  color: var(--red);
}
</style>
