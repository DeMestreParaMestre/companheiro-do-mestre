<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Turnstile {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoad: Promise<void> | null = null
function loadScript(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptLoad = null
      reject(new Error('Não foi possível carregar a verificação anti-robô. Verifique sua internet.'))
    }
    document.head.appendChild(s)
  })
  return scriptLoad
}

const el = ref<HTMLElement | null>(null)
const failed = ref('')
let widgetId: string | null = null
let current: string | null = null
let waiters: ((t: string) => void)[] = []

function onToken(t: string) {
  current = t
  failed.value = ''
  waiters.forEach((w) => w(t))
  waiters = []
}

onMounted(async () => {
  if (!SITE_KEY) return
  try {
    await loadScript()
    if (!el.value || !window.turnstile) return
    widgetId = window.turnstile.render(el.value, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      language: 'pt-br',
      theme: 'auto',
      callback: onToken,
      'expired-callback': () => (current = null),
      'error-callback': () => {
        failed.value = 'A verificação anti-robô falhou. Recarregue a página e tente de novo.'
      }
    })
  } catch (e) {
    failed.value = (e as Error).message
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

/**
 * Token para enviar ao Supabase (undefined se o captcha não está configurado).
 * Cada token vale uma vez: depois de usar, o widget gera outro sozinho.
 */
async function token(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  if (failed.value) throw new Error(failed.value)
  const t =
    current ??
    (await new Promise<string>((resolve, reject) => {
      waiters.push(resolve)
      setTimeout(() => reject(new Error('A verificação anti-robô está demorando. Tente de novo em instantes.')), 15000)
    }))
  current = null
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  return t
}

defineExpose({ token })
</script>

<template>
  <div v-if="SITE_KEY" class="turnstile">
    <div ref="el" />
    <small v-if="failed" class="turnstileErr" role="alert">{{ failed }}</small>
  </div>
</template>

<style scoped>
.turnstile {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.turnstileErr {
  font-family: var(--fN);
  font-size: 0.75rem;
  color: var(--danger);
}
</style>
