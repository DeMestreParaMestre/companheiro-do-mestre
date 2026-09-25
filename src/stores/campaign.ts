import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Campaign, PersistedData } from '../types'
import { idbGet, idbSet } from '../composables/useIdbStorage'
import { migratePartyLinks } from '../utils/partyLink'
import { compressDataUrl } from '../utils/image'
import { imageHolders } from '../utils/imageStore'

const KEY = 'nc_data'

function newCampaign(name: string): Campaign {
  return {
    id: 'c' + Date.now(),
    name,
    diary: [],
    fichas: [],
    party: [],
    creatures: [],
    personagens: [],
    itens: [],
    currentTurn: -1,
    round: 0,
    combatLog: [],
    references: [],
    songs: [],
    playlists: [],
    encounters: []
  }
}

export const useCampaignStore = defineStore('campaign', () => {
  const campaigns = ref<Campaign[]>([])
  const activeId = ref<string | null>(null)
  const storageStatus = ref('')
  // Campanhas apagadas pelo mestre neste navegador: só elas são apagadas na nuvem.
  // Em memória de propósito: se a página recarregar antes de sincronizar, a
  // campanha volta da nuvem (o lado seguro).
  const tombstones = new Set<string>()

  // Equivalente à função AC() do app original.
  const activeCampaign = computed<Campaign>(() => {
    const c = campaigns.value.find((x) => x.id === activeId.value)
    if (!c && campaigns.value.length) {
      activeId.value = campaigns.value[0].id
      return campaigns.value[0]
    }
    return c as Campaign
  })

  let persistTimer: ReturnType<typeof setTimeout> | undefined

  // Grava imediatamente. IndexedDB é o principal; localStorage só como fallback
  // (limite ~5 MB estoura fácil com imagens em base64).
  function persist() {
    clearTimeout(persistTimer)
    persistTimer = undefined
    const data = serialize()
    idbSet(KEY, data)
      .then(() => localStorage.removeItem(KEY))
      .catch(() => {
        try {
          localStorage.setItem(KEY, data)
        } catch {
          /* ignore */
        }
      })
  }

  // Imagens salvas antes da compressão no upload: reduz uma vez, em segundo plano.
  async function shrinkStoredImages() {
    for (const h of campaigns.value.flatMap(imageHolders)) {
      if (h.img && h.img.length > 400_000) h.img = await compressDataUrl(h.img)
    }
  }

  function schedulePersist() {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(persist, 400)
  }

  function flushPending() {
    if (persistTimer !== undefined) persist()
  }

  async function loadStorage() {
    try {
      const raw = await idbGet<string>(KEY)
      if (raw) {
        const d = JSON.parse(raw) as PersistedData
        if (d.campaigns && d.campaigns.length) {
          campaigns.value = d.campaigns
          activeId.value = d.activeId
          return
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const d = JSON.parse(raw) as PersistedData
        if (d.campaigns && d.campaigns.length) {
          campaigns.value = d.campaigns
          activeId.value = d.activeId
        }
      }
    } catch {
      /* ignore */
    }
  }

  function ensureDefaults() {
    if (!campaigns.value.length) {
      const c = newCampaign('Campanha Principal')
      campaigns.value = [c]
      activeId.value = c.id
    }
    if (!activeId.value || !campaigns.value.find((c) => c.id === activeId.value)) {
      activeId.value = campaigns.value[0].id
    }
    campaigns.value.forEach((c) => {
      if (!c.diary) c.diary = []
      if (!c.fichas) c.fichas = []
      if (!c.party) c.party = []
      if (!c.creatures) c.creatures = []
      if (!c.personagens) c.personagens = []
      if (!c.itens) c.itens = []
      if (c.currentTurn === undefined) c.currentTurn = -1
      if (c.round === undefined) c.round = 0
      if (!c.combatLog) c.combatLog = []
      if (!c.references) c.references = []
      if (!c.songs) c.songs = []
      if (!c.playlists) c.playlists = []
      if (!c.encounters) c.encounters = []
      const campSongs = c.songs
      // Categoria padrão para músicas antigas do acervo.
      campSongs.forEach((s) => {
        if (!s.category) s.category = 'Outros'
      })
      // Migração do modelo antigo de playlist (songIds por referência) para o
      // novo modelo de músicas embutidas (as músicas saem do acervo).
      const embeddedIds = new Set<number>()
      c.playlists.forEach((pl) => {
        if (!pl.category) pl.category = 'Outros'
        if (!Array.isArray(pl.songs)) {
          pl.songs = []
          const legacy = pl.songIds
          if (Array.isArray(legacy)) {
            legacy.forEach((id) => {
              const found = campSongs.find((s) => s.id === id)
              if (found) {
                pl.songs.push({ ...found })
                embeddedIds.add(id)
              }
            })
          }
        }
        delete pl.songIds
        pl.songs.forEach((s) => {
          if (!s.category) s.category = 'Outros'
        })
      })
      if (embeddedIds.size) c.songs = campSongs.filter((s) => !embeddedIds.has(s.id))
      migratePartyLinks(c)
    })
  }

  /** Em dev: garante campanha demo com dados de teste. */
  async function ensureDevSeed(hadPersistedData: boolean) {
    if (!import.meta.env.DEV) return

    const { createDevSeedCampaign, DEV_CAMPAIGN_ID, ensureDevLegendaryBoss } = await import('../dev/seedCampaign')
    const reset = import.meta.env.VITE_DEV_SEED_RESET === 'true'
    let sandbox = campaigns.value.find((c) => c.id === DEV_CAMPAIGN_ID)

    if (reset && sandbox) {
      campaigns.value = campaigns.value.filter((c) => c.id !== DEV_CAMPAIGN_ID)
      sandbox = undefined
    }

    if (!sandbox) {
      sandbox = createDevSeedCampaign()
      if (!hadPersistedData) {
        campaigns.value = [sandbox]
      } else {
        campaigns.value.push(sandbox)
      }
    }
    ensureDevLegendaryBoss(sandbox)

    // Sem dados salvos: abre direto na sandbox. Com dados: só cria se faltar.
    if (!hadPersistedData || import.meta.env.VITE_DEV_SEED_ACTIVE === 'true') {
      activeId.value = DEV_CAMPAIGN_ID
    }
  }

  async function init() {
    await loadStorage()
    const hadPersistedData = campaigns.value.length > 0
    ensureDefaults()
    await ensureDevSeed(hadPersistedData)
    try {
      await idbSet('_test', 'ok')
      // Armazenamento persistente funcionando normalmente: não exibe mensagem ao usuário.
      storageStatus.value = ''
    } catch {
      try {
        localStorage.setItem('_test', '1')
        localStorage.removeItem('_test')
        storageStatus.value = '💾 Salvando em localStorage'
      } catch {
        storageStatus.value = '⚠ Sem armazenamento disponível'
      }
    }
    // Persistência automática: substitui as chamadas manuais de persist() do app original.
    watch([campaigns, activeId], schedulePersist, { deep: true })
    window.addEventListener('pagehide', flushPending)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPending()
    })
    // Pede ao navegador para não apagar o IndexedDB sob pressão de espaço / inatividade.
    navigator.storage?.persist?.().catch(() => {})
    setTimeout(() => void shrinkStoredImages(), 3000)
  }

  function switchCamp(id: string) {
    activeId.value = id
  }

  function createCamp(name: string) {
    const n = name.trim()
    if (!n) return false
    const c = newCampaign(n)
    campaigns.value.push(c)
    activeId.value = c.id
    return true
  }

  function renameCamp(name: string) {
    const n = name.trim()
    if (!n) return
    activeCampaign.value.name = n
  }

  function deleteCamp() {
    if (campaigns.value.length <= 1) return false
    tombstones.add(activeId.value!)
    campaigns.value = campaigns.value.filter((c) => c.id !== activeId.value)
    activeId.value = campaigns.value[0].id
    return true
  }

  function serialize() {
    return JSON.stringify({ campaigns: campaigns.value, activeId: activeId.value })
  }

  function exportData() {
    const url = URL.createObjectURL(new Blob([serialize()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'companheiro_backup.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /** Lança erro se o backup não tiver campanhas válidas (evita apagar os dados atuais). */
  function importData(d: PersistedData) {
    const list = d?.campaigns
    if (!Array.isArray(list) || !list.length || !list.every((c) => c && typeof c.id === 'string')) {
      throw new Error('Backup inválido: nenhuma campanha encontrada.')
    }
    campaigns.value = list
    activeId.value = list.some((c) => c.id === d.activeId) ? d.activeId : list[0].id
    ensureDefaults()
    persist()
  }

  return {
    campaigns,
    activeId,
    storageStatus,
    activeCampaign,
    tombstones,
    ensureDefaults,
    persist,
    init,
    switchCamp,
    createCamp,
    renameCamp,
    deleteCamp,
    exportData,
    importData
  }
})
