<script setup lang="ts">
import { useMusicPlayerStore } from '../../stores/musicPlayer'

defineProps<{ onPick: () => void }>()

const player = useMusicPlayerStore()
</script>

<template>
  <div class="musicMini" :class="{ active: player.isActive }" title="Escolher música ou playlist" @click="onPick">
    <button class="btn btnOut sm musicPickBtn" title="Escolher música ou playlist" @click.stop="onPick">🎵</button>
    <button
      v-if="player.isActive"
      class="btn btnOut sm"
      :title="player.isPaused ? 'Retomar' : 'Pausar'"
      @click.stop="player.togglePlay()"
    >
      {{ player.isPaused ? '▶' : '⏸' }}
    </button>
    <div v-if="player.isActive" class="musicMiniBody">
      <div class="musicMiniInfo">
        <span class="musicMiniLabel">{{ player.isPlaylist ? 'Playlist: ' + player.playingContext?.name : 'Tocando' }}</span>
        <span class="musicMiniName">{{ player.nowPlaying?.name }}</span>
        <span v-if="player.isPlaylist" class="musicMiniPos">{{ player.qIndex + 1 }}/{{ player.queue.length }}</span>
      </div>
      <div class="musicMiniControls">
        <button class="btn btnOut sm" :disabled="!player.isPlaylist || player.qIndex === 0" title="Anterior" @click.stop="player.prev()">⏮</button>
        <button
          class="btn btnOut sm"
          :disabled="!player.isPlaylist || player.qIndex >= player.queue.length - 1"
          title="Próxima"
          @click.stop="player.next()"
        >
          ⏭
        </button>
        <button class="btn sm" :class="player.repeat ? 'btnRed' : 'btnOut'" title="Repetir" @click.stop="player.toggleRepeat()">🔁</button>
        <button class="btn btnOut sm" title="Trocar música" @click.stop="onPick">Trocar</button>
        <button class="btn btnDng sm" title="Parar" @click.stop="player.stop()">✕</button>
      </div>
    </div>
    <span v-else class="musicMiniIdle">Trilha sonora</span>
  </div>
</template>

<style scoped>
.musicMini {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1;
  min-width: 180px;
  max-width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg2);
  cursor: pointer;
}
.musicMini:hover {
  border-color: var(--red);
}
.musicMini.active {
  border-color: var(--red);
  background: var(--light);
}
.musicPickBtn {
  flex-shrink: 0;
}
.musicMiniBody {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.musicMiniInfo {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex: 1;
  min-width: 120px;
  flex-wrap: wrap;
}
.musicMiniLabel {
  font-family: var(--fN);
  font-size: 0.65rem;
  color: var(--muted);
  text-transform: uppercase;
}
.musicMiniName {
  font-family: var(--fH);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--red);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.musicMiniPos {
  font-family: var(--fN);
  font-size: 0.68rem;
  color: var(--muted);
}
.musicMiniControls {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.musicMiniIdle {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--muted);
  font-style: italic;
}
</style>
