import { ref, onMounted, onBeforeUnmount } from 'vue'
import { appVersionLabel } from '../utils/appVersion'
import { UPDATE_CHECK_MS, applyAppUpdate, checkForcedUpdate } from '../utils/appUpdate'

function shouldSimulate(): boolean {
  return import.meta.env.DEV && new URLSearchParams(location.search).has('simularAtualizacao')
}

export function useForcedUpdate() {
  const outdated = ref(false)
  const runningLabel = ref(appVersionLabel())
  const publishedLabel = ref('')

  async function check() {
    if (shouldSimulate()) {
      outdated.value = true
      publishedLabel.value = 'v9.9.9'
      return
    }
    if (import.meta.env.DEV) return
    try {
      const hit = await checkForcedUpdate()
      if (!hit) return
      outdated.value = true
      runningLabel.value = hit.running.startsWith('v') ? hit.running : `v${hit.running}`
      publishedLabel.value = hit.published.startsWith('v') ? hit.published : `v${hit.published}`
    } catch {
      /* sem rede: não trava quem está jogando offline */
    }
  }

  onMounted(() => {
    void check()
    const id = window.setInterval(() => void check(), UPDATE_CHECK_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVis)
    onBeforeUnmount(() => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    })
  })

  return { outdated, runningLabel, publishedLabel, apply: applyAppUpdate }
}
