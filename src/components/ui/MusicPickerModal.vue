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

const CAT_ICON: Record<string, string> = { Ambiências: '🌳', Combate: '⚔️', Outros: '🎵' }
function catIcon(c: string) {
  return CAT_ICON[c] || '🎵'
}

const term = computed(() => search.value.trim().toLowerCase())

const songs = computed(() => {
  let list = (camp.value.songs || []).slice()
  if (term.value) list = list.filter((s) => s.name.toLowerCase().includes(term.value))
  return list
})

// Playlists sem músicas não aparecem aqui — não há o que tocar.
const playlists = computed(() => {
  let list = (camp.value.playlists || []).filter((p) => p.songs.length > 0)
  if (term.value) list = list.filter((p) => p.name.toLowerCase().includes(term.value))
  return list
})

// Agrupamento por categoria (Ambiências, Combate, Outros).
const visibleCats = computed(() => (catFilter.value ? [catFilter.value] : MUSIC_CATS))
function songsInCat(cat: string) {
  return songs.value.filter((s) => (s.category || 'Outros') === cat)
}
function playlistsInCat(cat: string) {
  return playlists.value.filter((p) => (p.category || 'Outros') === cat)
}
function catHasContent(cat: string) {
  return songsInCat(cat).length > 0 || playlistsInCat(cat).length > 0
}
const hasAny = computed(() => visibleCats.value.some(catHasContent))

// Capa da playlist = capa da primeira música (igual à ferramenta Músicas).
function firstThumb(pl: Playlist): string | null {
  return pl.songs.length ? youtubeThumb(pl.songs[0].url) : null
}

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
        <select v-model="catFilter" style="width: auto; font-family: var(--fH); font-size: 0.85rem; background: var(--light); border: 1px solid var(--border); color: var(--ink); padding: 0.35rem 0.6rem; border-radius: 3px">
          <option value="">Todas</option>
          <option v-for="c in MUSIC_CATS" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div style="max-height: 55vh; overflow-y: auto">
        <template v-for="cat in visibleCats" :key="cat">
          <div v-if="catHasContent(cat)" style="margin-bottom: 0.9rem">
            <div class="mpSectionLabel">{{ catIcon(cat) }} {{ cat }}</div>

            <div
              v-for="pl in playlistsInCat(cat)"
              :key="'pl-' + pl.id"
              class="mpRow"
              :class="{ mpActive: player.isPlaylist && player.playingContext?.id === pl.id }"
            >
              <img v-if="firstThumb(pl)" :src="firstThumb(pl)!" :alt="pl.name" class="mpThumb" />
              <div v-else class="mpThumb mpThumbEmpty">⬡</div>
              <span class="mpName">💿 {{ pl.name }}</span>
              <span class="mpMeta">{{ pl.songs.length }} faixas</span>
              <button class="btn btnRed sm" @click="playPlaylist(pl)">▶</button>
            </div>

            <div
              v-for="s in songsInCat(cat)"
              :key="'s-' + s.id"
              class="mpRow"
              :class="{ mpActive: player.isPlayingSong(s) }"
            >
              <img v-if="youtubeThumb(s.url)" :src="youtubeThumb(s.url)!" :alt="s.name" class="mpThumb" />
              <div v-else class="mpThumb mpThumbEmpty">⬡</div>
              <span class="mpName">{{ s.name }}</span>
              <button class="btn btnRed sm" @click="playSong(s)">▶</button>
            </div>
          </div>
        </template>

        <div v-if="!hasAny" class="empty" style="padding: 1rem">
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
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.2rem;
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
.mpThumbEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg3);
  color: var(--muted);
  font-size: 0.9rem;
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
