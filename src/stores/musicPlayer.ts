import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song, Playlist } from '../types'
import { youtubeId } from '../utils/youtube'
import { loadYouTubeApi } from '../utils/ytPlayer'
import { appAlert } from '../composables/useAppDialog'

const HOST_ID = 'musicYtHost'
const YT_PLAYING = 1
const YT_PAUSED = 2

export const useMusicPlayerStore = defineStore('musicPlayer', () => {
  let player: any = null
  const playerReady = ref(false)
  const isPaused = ref(false)
  const queue = ref<Song[]>([])
  const qIndex = ref(0)
  const repeat = ref(false)
  const playingContext = ref<{ type: 'song' | 'playlist'; name: string; id: number } | null>(null)

  const nowPlaying = computed(() => queue.value[qIndex.value] || null)
  const isPlaylist = computed(() => playingContext.value?.type === 'playlist')
  const isActive = computed(() => queue.value.length > 0 && !!nowPlaying.value)

  function isPlayingSong(s: Song) {
    return nowPlaying.value?.id === s.id
  }

  async function ensurePlayer(): Promise<any> {
    if (player) return player
    if (!document.getElementById(HOST_ID)) return null
    const YT = await loadYouTubeApi()
    await new Promise<void>((resolve) => {
      player = new YT.Player(HOST_ID, {
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            playerReady.value = true
            resolve()
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === YT_PLAYING) isPaused.value = false
            else if (e.data === YT_PAUSED) isPaused.value = true
            if (e.data === 0) onEnded()
          }
        }
      })
    })
    return player
  }

  async function loadCurrent() {
    const s = nowPlaying.value
    if (!s) return
    const vid = youtubeId(s.url)
    if (!vid) {
      await appAlert('Link do YouTube inválido nesta música.')
      return
    }
    if (player && playerReady.value) {
      player.loadVideoById(vid)
    } else {
      await ensurePlayer()
      player?.loadVideoById(vid)
    }
  }

  function onEnded() {
    if (repeat.value) {
      player?.seekTo(0)
      player?.playVideo()
      return
    }
    if (qIndex.value < queue.value.length - 1) {
      qIndex.value++
      loadCurrent()
    }
  }

  function playSong(s: Song) {
    queue.value = [s]
    qIndex.value = 0
    playingContext.value = { type: 'song', name: s.name, id: s.id }
    loadCurrent()
  }

  function playPlaylist(pl: Playlist, startIndex = 0) {
    if (!pl.songs.length) {
      void appAlert('Esta playlist está vazia.')
      return
    }
    queue.value = pl.songs.slice()
    qIndex.value = Math.min(Math.max(0, startIndex), pl.songs.length - 1)
    playingContext.value = { type: 'playlist', name: pl.name, id: pl.id }
    loadCurrent()
  }

  function next() {
    if (qIndex.value < queue.value.length - 1) {
      qIndex.value++
      loadCurrent()
    }
  }

  function prev() {
    if (qIndex.value > 0) {
      qIndex.value--
      loadCurrent()
    }
  }

  function stop() {
    try {
      player?.stopVideo()
    } catch {
      /* ignore */
    }
    queue.value = []
    qIndex.value = 0
    playingContext.value = null
    isPaused.value = false
  }

  function togglePlay() {
    if (!player || !playerReady.value || !isActive.value) return
    try {
      if (isPaused.value) player.playVideo()
      else player.pauseVideo()
    } catch {
      /* ignore */
    }
  }

  function toggleRepeat() {
    repeat.value = !repeat.value
  }

  async function init() {
    await ensurePlayer().catch(() => {
      /* tenta de novo ao tocar */
    })
  }

  function destroy() {
    try {
      player?.destroy?.()
    } catch {
      /* ignore */
    }
    player = null
    playerReady.value = false
  }

  return {
    playerReady,
    queue,
    qIndex,
    repeat,
    playingContext,
    nowPlaying,
    isPlaylist,
    isActive,
    isPaused,
    isPlayingSong,
    ensurePlayer,
    playSong,
    playPlaylist,
    next,
    prev,
    stop,
    togglePlay,
    toggleRepeat,
    init,
    destroy
  }
})
