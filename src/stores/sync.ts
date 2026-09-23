import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Campaign } from '../types'
import { useCampaignStore } from './campaign'
import { useAuthStore, getSupabase, authErrorMessage } from './auth'
import { idbGet, idbSet } from '../composables/useIdbStorage'
import { appConfirm } from '../composables/useAppDialog'
import { useToast } from '../composables/useToast'
import { decide, hashString, canonicalJson, isEmptyCampaign, type SyncedMeta } from '../utils/syncPlan'
import { toRemote, uploadMissing, fromRemote } from '../utils/imageStore'

const META_KEY = 'nc_sync'
// Campanha de testes do modo dev (src/dev/seedCampaign.ts): nunca vai para a nuvem.
export const DEV_CAMPAIGN_ID = 'dev-sandbox'
const PUSH_DELAY = 3000

/** owner = conta dona das campanhas deste navegador; meta = o que foi sincronizado por campanha. */
interface SyncFile {
  owner: string | null
  meta: Record<string, SyncedMeta>
  /** Hashes das imagens já enviadas ao Storage. */
  blobs?: string[]
  /** 1 = campanhas já reenviadas com as imagens fora do JSON. */
  imgRefs?: 1
}
interface RemoteRow {
  id: string
  name: string
  version: number
  updated_at: string
  deleted_at: string | null
  data?: Campaign
}
interface SaveResult {
  saved: boolean
  new_version: number | null
}

export type SyncStatus = 'off' | 'syncing' | 'saved' | 'pending' | 'offline' | 'conflict' | 'error'
export type ConflictChoice = 'local' | 'remote' | 'both'

export const useSyncStore = defineStore('sync', () => {
  const store = useCampaignStore()
  const auth = useAuthStore()
  const toast = useToast()

  const status = ref<SyncStatus>('off')
  const pending = ref(0)
  const lastError = ref('')
  const conflict = reactive({
    open: false,
    name: '',
    remoteAt: '',
    remoteDeleted: false,
    resolve: null as ((c: ConflictChoice) => void) | null
  })

  let file: SyncFile = { owner: null, meta: {} }
  let uploaded = new Set<string>()
  // Só sincroniza depois do start() (dono do navegador conferido); antes disso poderia subir campanhas de outra conta.
  let started = false
  let running = false
  let rerun = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const syncable = (c: Campaign) => c.id !== DEV_CAMPAIGN_ID
  const hashOf = (c: Campaign) => hashString(JSON.stringify(c))

  async function saveFile() {
    file.blobs = [...uploaded]
    await idbSet(META_KEY, JSON.parse(JSON.stringify(file)))
  }

  function countPending() {
    let n = store.tombstones.size
    for (const c of store.campaigns) {
      if (syncable(c) && file.meta[c.id]?.hash !== hashOf(c)) n++
    }
    return n
  }

  function askConflict(name: string, row: RemoteRow): Promise<ConflictChoice> {
    return new Promise((resolve) => {
      Object.assign(conflict, {
        open: true,
        name,
        remoteAt: new Date(row.updated_at).toLocaleString('pt-BR'),
        remoteDeleted: !!row.deleted_at,
        resolve: (c: ConflictChoice) => {
          conflict.open = false
          resolve(c)
        }
      })
    })
  }

  async function upload(sb: SupabaseClient, c: Campaign, expected: number): Promise<boolean> {
    const json = JSON.stringify(c)
    const remote = await toRemote(c)
    await uploadMissing(sb, auth.user!.id, remote.blobs, uploaded)
    const { data, error } = await sb.rpc('save_campaign', {
      p_id: c.id,
      p_name: c.name,
      p_data: remote.data,
      p_expected_version: expected
    })
    if (error) throw error
    const r = (data as SaveResult[])[0]
    if (!r?.saved || r.new_version == null) return false
    file.meta[c.id] = { version: r.new_version, hash: hashString(json) }
    store.tombstones.delete(c.id)
    return true
  }

  function applyRemote(row: RemoteRow) {
    store.tombstones.delete(row.id)
    if (row.deleted_at || !row.data) {
      if (store.campaigns.length > 1) store.campaigns = store.campaigns.filter((c) => c.id !== row.id)
      delete file.meta[row.id]
      return
    }
    const data = { ...row.data, id: row.id }
    const i = store.campaigns.findIndex((c) => c.id === row.id)
    if (i >= 0) store.campaigns[i] = data
    else store.campaigns.push(data)
    store.ensureDefaults()
    // Hash do objeto já normalizado, para não parecer "alterado aqui" na próxima rodada.
    const stored = store.campaigns.find((c) => c.id === row.id)!
    file.meta[row.id] = { version: row.version, hash: hashOf(stored) }
  }

  async function resolveConflict(sb: SupabaseClient, row: RemoteRow) {
    const local = store.campaigns.find((c) => c.id === row.id)
    if (!local) return applyRemote(row)
    // Mesmo conteúdo (ex.: mesmo backup importado em dois computadores): só anota a versão.
    if (!row.deleted_at && row.data && canonicalJson(row.data) === canonicalJson({ ...local })) {
      file.meta[row.id] = { version: row.version, hash: hashOf(local) }
      return
    }
    status.value = 'conflict'
    const choice = await askConflict(local.name, row)
    if (choice === 'local') {
      if (!(await upload(sb, local, row.version))) rerun = true
    } else if (choice === 'remote') {
      applyRemote(row)
    } else {
      const copy: Campaign = { ...JSON.parse(JSON.stringify(local)), id: 'c' + Date.now(), name: local.name + ' (cópia deste computador)' }
      store.campaigns.push(copy)
      applyRemote(row)
      rerun = true
    }
  }

  async function syncNow(initial = false): Promise<void> {
    clearTimeout(timer)
    timer = undefined
    if (!auth.user || !started) return
    if (running) {
      rerun = true
      return
    }
    running = true
    status.value = 'syncing'
    try {
      const sb = await getSupabase()
      const { data, error } = await sb.from('campaigns').select('id,name,version,updated_at,deleted_at')
      if (error) throw error
      const rows = new Map((data as RemoteRow[]).map((r) => [r.id, r]))

      // Navegador novo: a "Campanha Principal" vazia criada automaticamente não sobe.
      const dropIds =
        initial && [...rows.values()].some((r) => !r.deleted_at)
          ? store.campaigns.filter((c) => syncable(c) && !file.meta[c.id] && !rows.has(c.id) && isEmptyCampaign(c)).map((c) => c.id)
          : []

      const ids = new Set<string>([
        ...store.campaigns.filter(syncable).map((c) => c.id),
        ...rows.keys(),
        ...Object.keys(file.meta),
        ...store.tombstones
      ])
      ids.delete(DEV_CAMPAIGN_ID)
      dropIds.forEach((id) => ids.delete(id))

      const fetchIds: string[] = []
      const conflictIds = new Set<string>()
      for (const id of ids) {
        const local = store.campaigns.find((c) => c.id === id)
        const r = rows.get(id)
        const action = decide(
          local ? hashOf(local) : null,
          file.meta[id],
          r && { version: r.version, deleted: !!r.deleted_at },
          store.tombstones.has(id)
        )
        if (action === 'upload') {
          if (!(await upload(sb, local!, r ? r.version : 0))) conflictIds.add(id)
        } else if (action === 'download') {
          fetchIds.push(id)
        } else if (action === 'conflict') {
          conflictIds.add(id)
        } else if (action === 'deleteLocal') {
          if (store.campaigns.length > 1) store.campaigns = store.campaigns.filter((c) => c.id !== id)
          delete file.meta[id]
        } else if (action === 'deleteRemote') {
          const res = await sb.rpc('delete_campaign', { p_id: id, p_expected_version: r!.version })
          if (res.error) throw res.error
          if ((res.data as SaveResult[])[0]?.saved) {
            delete file.meta[id]
            store.tombstones.delete(id)
          } else fetchIds.push(id)
        } else if (action === 'forget') {
          delete file.meta[id]
          store.tombstones.delete(id)
        }
      }

      if (fetchIds.length || conflictIds.size) {
        const all = [...fetchIds, ...conflictIds]
        const full = await sb.from('campaigns').select('id,name,version,updated_at,deleted_at,data').in('id', all)
        if (full.error) throw full.error
        const byId = new Map((full.data as RemoteRow[]).map((r) => [r.id, r]))
        // Antes de aplicar ou comparar: com as imagens de volta, conteúdo igual compara igual.
        for (const row of byId.values()) {
          if (row.data) await fromRemote(sb, auth.user.id, row.data, store.campaigns)
        }
        for (const id of fetchIds) {
          const row = byId.get(id)
          if (row) applyRemote(row)
        }
        for (const id of conflictIds) {
          const row = byId.get(id)
          if (row) await resolveConflict(sb, row)
        }
      }

      if (dropIds.length) {
        const kept = store.campaigns.filter((c) => !dropIds.includes(c.id))
        if (kept.length) store.campaigns = kept
      }
      store.ensureDefaults()

      file.owner = auth.user.id
      await saveFile()
      lastError.value = ''
    } catch (e) {
      // Conta excluída (em outra aba/dispositivo) com o token ainda válido: a campanha não tem mais dono.
      if ((e as { code?: string })?.code === '23503') {
        toast.show('Esta conta foi excluída. Você foi desconectado.', 'info', 7000)
        void auth.signOut()
        return
      }
      lastError.value = authErrorMessage(e)
      status.value = !navigator.onLine || /fetch|network/i.test(lastError.value + String(e)) ? 'offline' : 'error'
    } finally {
      running = false
      pending.value = countPending()
      const s = status.value as SyncStatus
      if (s === 'syncing' || s === 'conflict') status.value = pending.value ? 'pending' : 'saved'
      if (rerun) {
        rerun = false
        void syncNow()
      }
    }
  }

  /** Chamado ao abrir o app já logado e a cada novo login. */
  async function start() {
    if (!auth.user) return
    started = false
    file = (await idbGet<SyncFile>(META_KEY)) || { owner: null, meta: {} }
    const uid = auth.user.id
    const hasContent = store.campaigns.some((c) => syncable(c) && !isEmptyCampaign(c))

    if (file.owner && file.owner !== uid) {
      if (hasContent) {
        const ok = await appConfirm(
          `Este navegador tem campanhas de outra conta (do último login aqui).\n\nSubstituí-las pelas campanhas de ${auth.user.email}? Um backup das atuais será baixado antes.`,
          { title: 'Campanhas de outra conta', confirmLabel: 'Substituir', cancelLabel: 'Sair desta conta', danger: true }
        )
        if (!ok) return auth.signOut()
        store.exportData()
      }
      store.campaigns = store.campaigns.filter((c) => !syncable(c))
      store.ensureDefaults()
      file = { owner: null, meta: {} }
    } else if (!file.owner && hasContent) {
      store.exportData()
      toast.show('Backup das suas campanhas baixado por segurança antes do primeiro envio à nuvem.', 'info', 7000)
    }
    uploaded = new Set(file.blobs || [])
    // Campanhas enviadas antes das imagens irem para o Storage: força um reenvio de cada uma.
    if (!file.imgRefs) {
      Object.values(file.meta).forEach((m) => (m.hash = ''))
      file.imgRefs = 1
    }
    started = true
    await syncNow(true)
  }

  /** Ao sair: opcionalmente apaga as campanhas deste navegador (computador compartilhado). */
  async function clearLocal() {
    store.campaigns = store.campaigns.filter((c) => !syncable(c))
    store.ensureDefaults()
    await detach()
  }

  /** Esquece o vínculo com a conta: as campanhas daqui passam a ser só locais (ex.: após excluir a conta). */
  async function detach() {
    store.tombstones.clear()
    file = { owner: null, meta: {} }
    uploaded = new Set()
    await saveFile()
  }

  function schedule() {
    if (!auth.user) return
    // Mudança durante uma sincronização (inclusive as feitas por ela mesma): roda de novo no fim.
    if (running) {
      rerun = true
      return
    }
    status.value = 'pending'
    clearTimeout(timer)
    timer = setTimeout(() => void syncNow(), PUSH_DELAY)
  }

  watch(() => store.campaigns, schedule, { deep: true })
  watch(
    () => auth.user?.id,
    (id, old) => {
      if (id && old && id !== old) void start()
      else if (id && !old && auth.ready && status.value === 'off') void start()
      else if (!id) {
        started = false
        clearTimeout(timer)
        status.value = 'off'
      }
    }
  )

  let lastPull = 0
  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (timer !== undefined) void syncNow()
    } else if (auth.user && Date.now() - lastPull > 30_000) {
      lastPull = Date.now()
      void syncNow()
    }
  })
  window.addEventListener('beforeunload', (e) => {
    if (status.value === 'pending' || status.value === 'syncing') {
      void syncNow()
      e.preventDefault()
    }
  })

  return { status, pending, lastError, conflict, start, syncNow, clearLocal, detach, countPending }
})
