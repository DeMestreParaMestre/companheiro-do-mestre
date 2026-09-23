<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { useMusicPlayerStore } from '../../stores/musicPlayer'
import { MUSIC_CATS } from '../../constants'
import type { Song, Playlist } from '../../types'
import { youtubeThumb } from '../../utils/youtube'
import BaseModal from './BaseModal.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const camp = computed(() => useCampaignStore().activeCampaign)
const player = useMusicPlayerStore()
const search = ref('')
const catFilter = ref('')

const term = computed(() => search.value.trim().toLowerCase())

const songs = computed(() => {
  let list = (camp.value.songs || []).slice()
  if (catFilter.value) list = list.filter((s) => (s.category || 'Outros') === catFilter.value)
  if (term.value) list = list.filter((s) => s.name.toLowerCase().includes(term.value))
  return list
})

const playlists = computed(() => {
  let list = (camp.value.playlists || []).slice()
  if (catFilter.value) list = list.filter((p) => (p.category || 'Outros') === catFilter.value)
  if (term.value) list = list.filter((p) => p.name.toLowerCase().includes(term.value))
  return list
})

function playSong(s: Song) {
  player.playSong(s)
  emit('close')
}

function playPlaylist(pl: Playlist) {
  player.playPlaylist(pl)
  emit('close')
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <div class="modal" style="max-width: 520px; width: 92vw">
      <button class="mClose" @click="emit('close')">✕</button>
      <h3>🎵 Escolher Música</h3>
      <div style="display: flex; gap: 0.5rem; margin-bottom: 0.7rem; flex-wrap: wrap">
        <input v-model="search" type="text" placeholder="⬡ Buscar..." style="flex: 1; min-width: 140px" />
        <select v-model="catFilter" style="font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px">
          <option value="">Todas</option>
          <option v-for="c in MUSIC_CATS" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div style="max-height: 55vh; overflow-y: auto">
        <div v-if="playlists.length" style="margin-bottom: 0.9rem">
          <div class="mpSectionLabel">Playlists</div>
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="mpRow"
            :class="{ mpActive: player.isPlaylist && player.playingContext?.id === pl.id }"
          >
            <span class="mpName">💿 {{ pl.name }}</span>
            <span class="mpMeta">{{ pl.songs.length }} faixas</span>
            <button class="btn btnRed sm" :disabled="!pl.songs.length" @click="playPlaylist(pl)">▶</button>
          </div>
        </div>

        <div v-if="songs.length">
          <div class="mpSectionLabel">Músicas</div>
          <div
            v-for="s in songs"
            :key="s.id"
            class="mpRow"
            :class="{ mpActive: player.isPlayingSong(s) }"
          >
            <img v-if="youtubeThumb(s.url)" :src="youtubeThumb(s.url)!" :alt="s.name" class="mpThumb" loading="lazy" />
            <span class="mpName">{{ s.name }}</span>
            <button class="btn btnRed sm" @click="playSong(s)">▶</button>
          </div>
        </div>

        <div v-if="!songs.length && !playlists.length" class="empty" style="padding: 1rem">
          Nada encontrado. Cadastre músicas na aba Músicas.
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.mpSectionLabel {
  font-family: var(--fN);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 0.4rem;
}
.mpRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  margin-bottom: 0.35rem;
  background: var(--bg);
}
.mpRow.mpActive {
  border-color: var(--red);
  box-shadow: 0 0 0 1px var(--red) inset;
}
.mpThumb {
  width: 48px;
  height: 27px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}
.mpName {
  flex: 1;
  min-width: 0;
  font-family: var(--fH);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mpMeta {
  font-family: var(--fN);
  font-size: 0.72rem;
  color: var(--muted);
  flex-shrink: 0;
}
</style>
