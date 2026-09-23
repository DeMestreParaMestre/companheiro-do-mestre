<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useCampaignStore } from '../../stores/campaign'
import { useMusicPlayerStore } from '../../stores/musicPlayer'
import type { Song, Playlist } from '../../types'
import { MUSIC_CATS } from '../../constants'
import { youtubeId, youtubeThumb, youtubeWatchUrl } from '../../utils/youtube'
import BaseModal from '../ui/BaseModal.vue'
import { appAlert, appConfirm, appPrompt } from '../../composables/useAppDialog'

defineProps<{ active: boolean }>()

const store = useCampaignStore()
const player = useMusicPlayerStore()
const camp = computed(() => store.activeCampaign)
const songs = computed<Song[]>(() => camp.value?.songs || [])
const playlists = computed<Playlist[]>(() => camp.value?.playlists || [])
const cats = MUSIC_CATS

const CAT_ICON: Record<string, string> = { Ambiências: '🌳', Combate: '⚔️', Outros: '🎵' }
function catIcon(c: string) {
  return CAT_ICON[c] || '🎵'
}

// ---------- IDs únicos ----------
// Considera todas as músicas (acervo + dentro de playlists) para evitar colisões.
function allSongIds(): number[] {
  const ids = songs.value.map((s) => s.id)
  playlists.value.forEach((p) => p.songs.forEach((s) => ids.push(s.id)))
  return ids
}
function nextSongId() {
  const max = allSongIds().reduce((m, id) => Math.max(m, id), 0)
  return Math.max(Date.now(), max + 1)
}
function nextPlaylistId() {
  const max = playlists.value.reduce((m, p) => Math.max(m, p.id), 0)
  return Math.max(Date.now(), max + 1)
}

// ---------- Cadastro de músicas ----------
const showForm = ref(false)
const form = reactive({ name: '', url: '', category: 'Ambiências', playlistId: '' })

function resetAddForms() {
  form.name = ''
  form.url = ''
  form.category = 'Ambiências'
  form.playlistId = ''
  newPlaylistName.value = ''
  newPlaylistCat.value = 'Ambiências'
}

function showAddForm() {
  resetAddForms()
  showForm.value = true
}

function hideAddForm() {
  showForm.value = false
}

async function addSong(): Promise<boolean> {
  const name = form.name.trim()
  const url = form.url.trim()
  if (!name) {
    await appAlert('Digite o nome da música!')
    return false
  }
  if (!url) {
    await appAlert('Cole o link do YouTube!')
    return false
  }
  if (!youtubeId(url)) {
    await appAlert('O link do YouTube parece inválido.')
    return false
  }
  const song: Song = { id: nextSongId(), name, url, category: form.category }
  if (form.playlistId) {
    const pl = playlists.value.find((p) => p.id === Number(form.playlistId))
    if (pl) pl.songs.push(song)
  } else {
    const c = camp.value
    if (!c.songs) c.songs = []
    c.songs.push(song)
  }
  form.name = ''
  form.url = ''
  return true
}

async function addSongAndClose() {
  if (await addSong()) hideAddForm()
}

async function removeSong(id: number) {
  if (!(await appConfirm('Remover esta música do acervo?', { title: 'Remover', confirmLabel: 'Remover', danger: true }))) return
  const c = camp.value
  c.songs = (c.songs || []).filter((s) => s.id !== id)
  if (player.nowPlaying?.id === id) player.stop()
}

// Editar música (funciona para qualquer música — acervo ou dentro de playlist).
const edit = reactive({ open: false, song: null as Song | null, name: '', url: '', desc: '', category: 'Outros' })
function openEdit(s: Song) {
  edit.song = s
  edit.name = s.name
  edit.url = s.url
  edit.desc = s.desc || ''
  edit.category = s.category || 'Outros'
  edit.open = true
}
async function saveEdit() {
  if (!edit.song) return
  if (!youtubeId(edit.url.trim())) {
    await appAlert('O link do YouTube parece inválido.')
    return
  }
  edit.song.name = edit.name.trim() || edit.song.name
  edit.song.url = edit.url.trim()
  edit.song.desc = edit.desc.trim()
  edit.song.category = edit.category
  edit.open = false
}

// ---------- Playlists ----------
const newPlaylistName = ref('')
const newPlaylistCat = ref('Ambiências')
async function addPlaylist(): Promise<boolean> {
  const name = newPlaylistName.value.trim()
  if (!name) {
    await appAlert('Digite o nome da playlist!')
    return false
  }
  const c = camp.value
  if (!c.playlists) c.playlists = []
  c.playlists.push({ id: nextPlaylistId(), name, category: newPlaylistCat.value, songs: [] })
  newPlaylistName.value = ''
  return true
}

async function addPlaylistAndClose() {
  if (await addPlaylist()) hideAddForm()
}
async function removePlaylist(id: number) {
  const pl = playlists.value.find((p) => p.id === id)
  if (!pl) return
  if (
    !(await appConfirm('Remover esta playlist? As músicas voltam para o acervo.', {
      title: 'Remover playlist',
      confirmLabel: 'Remover',
      danger: true
    }))
  )
    return
  // Devolve as músicas ao acervo para nada se perder.
  const c = camp.value
  if (!c.songs) c.songs = []
  if (pl.songs.length) c.songs.push(...pl.songs.map((s) => ({ ...s })))
  c.playlists = (c.playlists || []).filter((p) => p.id !== id)
  if (player.playingContext?.type === 'playlist' && player.playingContext.id === id) player.stop()
}
async function renamePlaylist(pl: Playlist) {
  const name = await appPrompt('Novo nome da playlist:', {
    title: 'Renomear playlist',
    defaultValue: pl.name,
    confirmLabel: 'Salvar'
  })
  if (name && name.trim()) pl.name = name.trim()
}
// Reordena as playlists dentro da mesma categoria, trocando a posição no array
// global apenas com a playlist vizinha da mesma categoria.
function movePlaylist(pl: Playlist, dir: -1 | 1) {
  const all = camp.value.playlists
  if (!all) return
  const cat = pl.category || 'Outros'
  const sameCat = all.filter((p) => (p.category || 'Outros') === cat)
  const pos = sameCat.indexOf(pl)
  const target = sameCat[pos + dir]
  if (!target) return
  const i = all.indexOf(pl)
  const j = all.indexOf(target)
  ;[all[i], all[j]] = [all[j], all[i]]
}

// Playlists minimizadas (viram uma linha compacta, como as músicas).
const collapsedPlaylists = reactive(new Set<number>())
function togglePlaylist(id: number) {
  if (collapsedPlaylists.has(id)) collapsedPlaylists.delete(id)
  else collapsedPlaylists.add(id)
}
// Capa da primeira música da playlist (para exibir quando minimizada).
function firstThumb(pl: Playlist): string | null {
  return pl.songs.length ? youtubeThumb(pl.songs[0].url) : null
}

// Seleção do <select> "adicionar música do acervo" por playlist.
const addSel = reactive<Record<number, string>>({})
function addFreeSongToPlaylist(pl: Playlist) {
  const sel = addSel[pl.id]
  if (!sel) return
  const id = Number(sel)
  const c = camp.value
  if (!c.songs) c.songs = []
  const idx = c.songs.findIndex((s) => s.id === id)
  if (idx < 0) return
  // Move a música do acervo para a playlist (some do acervo).
  const [song] = c.songs.splice(idx, 1)
  pl.songs.push(song)
  addSel[pl.id] = ''
}
function removeFromPlaylist(pl: Playlist, index: number) {
  const [song] = pl.songs.splice(index, 1)
  // Devolve ao acervo.
  const c = camp.value
  if (!c.songs) c.songs = []
  if (song) c.songs.push(song)
}
function moveInPlaylist(pl: Playlist, index: number, dir: -1 | 1) {
  const j = index + dir
  if (j < 0 || j >= pl.songs.length) return
  const arr = pl.songs
  ;[arr[index], arr[j]] = [arr[j], arr[index]]
}

// ---------- Filtro e agrupamento por categoria ----------
const catFilter = ref('')
const visibleCats = computed(() => (catFilter.value ? [catFilter.value] : cats))
function songsInCat(cat: string): Song[] {
  return songs.value.filter((s) => (s.category || 'Outros') === cat)
}
function playlistsInCat(cat: string): Playlist[] {
  return playlists.value.filter((p) => (p.category || 'Outros') === cat)
}

function openYoutube(s: Song | null) {
  if (!s) return
  window.open(youtubeWatchUrl(s.url) || s.url, '_blank', 'noopener')
}

onMounted(() => {
  playlists.value.forEach((pl) => collapsedPlaylists.add(pl.id))
  player.init()
})
</script>

<template>
  <div class="section" :class="{ active }">
    <h2 class="sTitle">Músicas &amp; Trilha Sonora</h2>

    <!-- Reprodutor embutido -->
    <div class="card musicPlayerCard">
      <div class="ytWrap" v-show="player.isActive">
        <div id="musicYtHost"></div>
      </div>
      <div v-if="player.isActive" class="playerBar">
        <div class="npInfo">
          <span class="npLabel">{{ player.isPlaylist ? '🎵 Playlist: ' + player.playingContext?.name : '🎵 Tocando' }}</span>
          <span class="npName">{{ player.nowPlaying?.name }}</span>
          <span v-if="player.isPlaylist" class="npPos">{{ player.qIndex + 1 }}/{{ player.queue.length }}</span>
        </div>
        <div class="playerControls">
          <button class="btn btnOut sm" :disabled="!player.isPlaylist || player.qIndex === 0" title="Anterior" @click="player.prev()">⏮</button>
          <button class="btn btnOut sm" :disabled="!player.isPlaylist || player.qIndex >= player.queue.length - 1" title="Próxima" @click="player.next()">⏭</button>
          <button class="btn sm" :class="player.repeat ? 'btnRed' : 'btnOut'" title="Repetir a música atual" @click="player.toggleRepeat()">🔁 Repetir</button>
          <button class="btn btnOut sm" @click="openYoutube(player.nowPlaying)">↗ Abrir no YouTube</button>
          <button class="btn btnDng sm" title="Parar" @click="player.stop()">✕</button>
        </div>
      </div>
      <div v-else class="empty" style="margin: 0">Nenhuma música tocando. Clique numa música ou playlist abaixo.</div>
    </div>

    <div v-if="showForm" style="margin-bottom: 1rem">
      <!-- Cadastro de música -->
      <div class="card" style="margin-bottom: 0.75rem">
        <div class="fRow">
          <div class="fGrp"><label>Nome</label><input v-model="form.name" type="text" placeholder="Ex: Tema da Taverna" /></div>
          <div class="fGrp" style="max-width: 170px">
            <label>Categoria</label>
            <select v-model="form.category"><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select>
          </div>
        </div>
        <div class="fGrp" style="margin-bottom: 0.6rem">
          <label>Link do YouTube</label>
          <input v-model="form.url" type="text" placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div class="fGrp" style="margin-bottom: 0.6rem">
          <label>Adicionar direto a uma playlist (opcional)</label>
          <select v-model="form.playlistId">
            <option value="">— Adicionar ao acervo —</option>
            <option v-for="p in playlists" :key="p.id" :value="String(p.id)">{{ p.name }} ({{ p.category }})</option>
          </select>
        </div>
        <div style="text-align: right"><button class="btn btnRed" @click="addSongAndClose">+ Salvar Música</button></div>
      </div>

      <!-- Criar playlist -->
      <div class="card">
        <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap">
          <div class="fGrp" style="flex: 1; min-width: 160px; margin: 0">
            <label>Nova playlist</label>
            <input v-model="newPlaylistName" type="text" placeholder="Ex: Combate Épico" @keyup.enter="addPlaylistAndClose" />
          </div>
          <div class="fGrp" style="max-width: 170px; margin: 0">
            <label>Categoria</label>
            <select v-model="newPlaylistCat"><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select>
          </div>
          <button class="btn btnRed" @click="addPlaylistAndClose">+ Criar Playlist</button>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 0.75rem">
          <button class="btn btnOut" @click="hideAddForm">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="!showForm" style="margin-bottom: 0.8rem">
      <button class="btn btnRed" @click="showAddForm">+ Adicionar Música / Playlist</button>
    </div>

    <!-- Filtro de categoria -->
    <div style="display: flex; gap: 0.5rem; align-items: center; margin: 1rem 0 0.4rem; flex-wrap: wrap">
      <label style="font-family: var(--fN); font-size: 0.78rem; color: var(--muted)">Filtrar categoria:</label>
      <select v-model="catFilter" class="plSelect" style="max-width: 220px">
        <option value="">Todas as categorias</option>
        <option v-for="c in cats" :key="c" :value="c">{{ catIcon(c) }} {{ c }}</option>
      </select>
    </div>

    <!-- Seções por categoria -->
    <div v-for="cat in visibleCats" :key="cat" class="catSection">
      <h3 class="catHeading">{{ catIcon(cat) }} {{ cat }}</h3>

      <template v-if="songsInCat(cat).length || playlistsInCat(cat).length">
        <!-- Músicas do acervo nesta categoria -->
        <div v-if="songsInCat(cat).length" class="catBlock">
          <div class="catBlockLabel">Músicas</div>
          <div v-for="s in songsInCat(cat)" :key="s.id" class="card musicRow" :class="{ playing: player.isPlayingSong(s) }">
            <img v-if="youtubeThumb(s.url)" :src="youtubeThumb(s.url)!" :alt="s.name" class="musicThumb" loading="lazy" @click="player.playSong(s)" />
            <div class="musicMeta">
              <div class="musicName">{{ s.name }}</div>
              <div v-if="s.desc" class="musicDesc">{{ s.desc }}</div>
            </div>
            <div class="musicActions">
              <button class="btn btnRed sm" @click="player.playSong(s)">▶ Tocar</button>
              <button class="btn btnOut sm" @click="openYoutube(s)">↗ YouTube</button>
              <button class="btn btnOut sm" @click="openEdit(s)">✏</button>
              <button class="btn btnDng sm" @click="removeSong(s.id)">✕</button>
            </div>
          </div>
        </div>

        <!-- Playlists nesta categoria -->
        <div v-if="playlistsInCat(cat).length" class="catBlock">
          <div class="catBlockLabel">Playlists</div>
          <template v-for="(pl, plIndex) in playlistsInCat(cat)" :key="pl.id">
          <!-- Playlist minimizada: linha compacta com a capa da 1ª música (como as músicas) -->
          <div v-if="collapsedPlaylists.has(pl.id)" class="card musicRow">
            <img v-if="firstThumb(pl)" :src="firstThumb(pl)!" :alt="pl.name" class="musicThumb" loading="lazy" @click="player.playPlaylist(pl)" />
            <div v-else class="musicThumb plThumbEmpty" @click="player.playPlaylist(pl)">⬡</div>
            <div class="musicMeta">
              <div class="musicName">💿 {{ pl.name }} <span class="refCount">{{ pl.songs.length }}</span></div>
            </div>
            <div class="musicActions">
              <button class="btn btnOut sm" :disabled="plIndex === 0" title="Subir playlist" @click="movePlaylist(pl, -1)">▲</button>
              <button class="btn btnOut sm" :disabled="plIndex === playlistsInCat(cat).length - 1" title="Descer playlist" @click="movePlaylist(pl, 1)">▼</button>
              <button class="btn btnRed sm" :disabled="!pl.songs.length" @click="player.playPlaylist(pl)">▶ Tocar</button>
              <button class="btn btnOut sm" title="Expandir" @click="togglePlaylist(pl.id)">▸</button>
              <button class="btn btnDng sm" @click="removePlaylist(pl.id)">✕</button>
            </div>
          </div>

          <!-- Playlist expandida: card completo -->
          <div v-else class="card">
            <div class="plHead">
              <span class="plName">💿 {{ pl.name }}</span>
              <span class="refCount">{{ pl.songs.length }}</span>
              <span style="margin-left: auto; display: flex; gap: 0.4rem">
                <button class="btn btnOut sm" :disabled="plIndex === 0" title="Subir playlist" @click="movePlaylist(pl, -1)">▲</button>
                <button class="btn btnOut sm" :disabled="plIndex === playlistsInCat(cat).length - 1" title="Descer playlist" @click="movePlaylist(pl, 1)">▼</button>
                <button class="btn btnRed sm" :disabled="!pl.songs.length" @click="player.playPlaylist(pl)">▶ Tocar</button>
                <button class="btn btnOut sm" title="Minimizar" @click="togglePlaylist(pl.id)">▾</button>
                <button class="btn btnOut sm" title="Renomear" @click="renamePlaylist(pl)">✏</button>
                <button class="btn btnDng sm" @click="removePlaylist(pl.id)">✕</button>
              </span>
            </div>

            <div v-if="!pl.songs.length" class="empty" style="margin: 0.4rem 0">Playlist vazia. Adicione músicas abaixo.</div>
            <ol v-else class="plList">
              <li v-for="(s, i) in pl.songs" :key="s.id + '-' + i" class="plItem" :class="{ playing: player.isPlaylist && player.playingContext?.id === pl.id && player.isPlayingSong(s) }">
                <button class="plPlay" title="Tocar a partir daqui" @click="player.playPlaylist(pl, i)">▶</button>
                <span class="plItemName">{{ s.name }}</span>
                <span class="plItemBtns">
                  <button class="btn btnOut sm" :disabled="i === 0" title="Subir" @click="moveInPlaylist(pl, i, -1)">▲</button>
                  <button class="btn btnOut sm" :disabled="i === pl.songs.length - 1" title="Descer" @click="moveInPlaylist(pl, i, 1)">▼</button>
                  <button class="btn btnOut sm" title="Editar" @click="openEdit(s)">✏</button>
                  <button class="btn btnDng sm" title="Devolver ao acervo" @click="removeFromPlaylist(pl, i)">✕</button>
                </span>
              </li>
            </ol>

            <div v-if="songs.length" style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.6rem; flex-wrap: wrap">
              <select v-model="addSel[pl.id]" class="plSelect">
                <option value="">+ Mover música do acervo...</option>
                <option v-for="s in songs" :key="s.id" :value="String(s.id)">{{ s.name }}</option>
              </select>
              <button class="btn btnOut sm" :disabled="!addSel[pl.id]" @click="addFreeSongToPlaylist(pl)">Adicionar</button>
            </div>
          </div>
          </template>
        </div>
      </template>
      <div v-else class="empty">Nenhuma música ou playlist em {{ cat }}.</div>
    </div>
  </div>

  <!-- Modal de edição de música -->
  <BaseModal :open="edit.open" @close="edit.open = false">
    <div class="modal" style="max-width: 480px; width: 92vw">
      <button class="mClose" @click="edit.open = false">✕</button>
      <h3>Editar Música</h3>
      <div class="fRow">
        <div class="fGrp"><label>Nome</label><input v-model="edit.name" type="text" /></div>
        <div class="fGrp" style="max-width: 150px">
          <label>Categoria</label>
          <select v-model="edit.category"><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select>
        </div>
      </div>
      <div class="fGrp" style="margin: 0.6rem 0"><label>Link do YouTube</label><input v-model="edit.url" type="text" /></div>
      <div class="fGrp" style="margin-bottom: 0.8rem"><label>Descrição (opcional)</label><textarea v-model="edit.desc" style="min-height: 70px"></textarea></div>
      <div style="text-align: right"><button class="btn btnRed" @click="saveEdit">Salvar</button></div>
    </div>
  </BaseModal>
</template>

<!-- Estilo global (sem scope) para a iframe criada dinamicamente pela API do YouTube,
     que não recebe o atributo data-v do escopo. -->
<style>
#musicYtHost {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>

<style scoped>
.musicPlayerCard {
  margin-bottom: 1rem;
}
.ytWrap {
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 0 auto 0.7rem;
  padding-bottom: 56.25%;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
}
.playerBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.npInfo {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
}
.npLabel {
  font-family: var(--fN);
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.npName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  font-size: 1.05rem;
}
.npPos {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
}
.playerControls {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.catSection {
  margin-top: 1.2rem;
}
.catHeading {
  font-family: var(--fH);
  color: var(--red);
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0.3rem;
}
.catBlock {
  margin-bottom: 0.8rem;
}
.catBlockLabel {
  font-family: var(--fN);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0.4rem 0 0.4rem 0.1rem;
}
.musicRow {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.6rem;
}
.musicRow.playing {
  border-color: var(--red);
  box-shadow: 0 0 0 1px var(--red) inset;
}
.musicThumb {
  width: 96px;
  height: 54px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
}
.plThumbEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg2);
  font-size: 2rem;
  color: var(--red);
  opacity: 0.7;
  cursor: pointer;
}
.musicMeta {
  flex: 1;
  min-width: 0;
}
.musicName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--ink);
  font-size: 1rem;
}
.musicDesc {
  font-family: var(--fB);
  font-size: 0.82rem;
  color: var(--muted);
  white-space: pre-wrap;
  margin-top: 0.15rem;
}
.musicActions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.plHead {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}
.plName {
  font-family: var(--fH);
  font-weight: 700;
  color: var(--red);
  font-size: 1.05rem;
}
.plList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.plItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem;
  border-radius: 4px;
  border: 1px solid transparent;
}
.plItem:nth-child(odd) {
  background: var(--bg3);
}
.plItem.playing {
  border-color: var(--red);
  background: var(--light);
}
.plPlay {
  background: none;
  border: none;
  color: var(--red);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
}
.plItemName {
  flex: 1;
  min-width: 0;
  font-family: var(--fB);
  font-size: 0.9rem;
  color: var(--ink);
}
.plItemBtns {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.plSelect {
  font-family: var(--fH);
  font-size: 0.85rem;
  background: var(--light);
  border: 1px solid var(--border);
  color: var(--ink);
  padding: 0.35rem 0.6rem;
  border-radius: 3px;
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}
</style>
